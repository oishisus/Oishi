import { useState, useEffect, useCallback } from 'react';
import { cashService } from '../services/cashService';
import { supabase } from '../../../lib/supabase';

export const useCashSystem = (showNotify) => {
    const [activeShift, setActiveShift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [movements, setMovements] = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    /**
     * Carga los movimientos de un turno
     */
    const loadMovements = useCallback(async (shiftId) => {
        setLoadingMovements(true);
        try {
            const data = await cashService.getShiftMovements(shiftId);
            console.log('Movimientos cargados:', data);
            setMovements(data || []);
        } catch (error) {
            console.error('Error loading movements:', error);
            setMovements([]);
        } finally {
            setLoadingMovements(false);
        }
    }, []);

    /**
     * Carga el turno activo inicial
     */
    const loadActiveShift = useCallback(async () => {
        setLoading(true);
        try {
            const shift = await cashService.getActiveShift();
            setActiveShift(shift);
            if (shift) {
                loadMovements(shift.id);
            }
        } catch (error) {
            console.error('Error loading active shift:', error);
            if (showNotify) showNotify('Error al cargar datos de caja', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotify, loadMovements]);

    useEffect(() => {
        loadActiveShift();
    }, [loadActiveShift]);

    /**
     * Listener Realtime para actualizar movimientos cuando se agreguen nuevos
     */
    useEffect(() => {
        if (!activeShift) return;

        // Subscribe a cambios en cash_movements para este shift
        const channel = supabase
            .channel(`cash_movements:shift_id=eq.${activeShift.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuchar INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'cash_movements',
                    filter: `shift_id=eq.${activeShift.id}`
                },
                (payload) => {
                    console.log('Cambio en cash_movements:', payload);
                    if (payload.eventType === 'INSERT') {
                        // Agregar el movimiento nuevo al inicio
                        setMovements(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'DELETE') {
                        // Remover si se borra
                        setMovements(prev => prev.filter(m => m.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        // Actualizar si cambia
                        setMovements(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [activeShift]);

    /**
     * Abre un nuevo turno
     */
    const openShift = async (amount) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const newShift = await cashService.openShift(amount, user?.id);
            setActiveShift(newShift);
            setMovements([]);
            if (showNotify) showNotify('Caja abierta con éxito');
            return true;
        } catch (error) {
            console.error('Error opening shift:', error);
            if (showNotify) showNotify('Error al abrir caja', 'error');
            return false;
        }
    };

    /**
     * Cierra el turno actual
     */
    const closeShift = async (actualBalance) => {
        if (!activeShift) return false;
        try {
            await cashService.closeShift(activeShift.id, actualBalance);
            setActiveShift(null);
            setMovements([]);
            if (showNotify) showNotify('Caja cerrada correctamente');
            return true;
        } catch (error) {
            console.error('Error closing shift:', error);
            if (showNotify) showNotify('Error al cerrar caja', 'error');
            return false;
        }
    };

    /**
     * Agrega un movimiento manual (Ingreso/Egreso)
     */
    const addManualMovement = async (type, amount, description, paymentMethod = 'cash') => {
        if (!activeShift) return false;
        try {
            const movement = {
                shift_id: activeShift.id,
                type,
                amount,
                description,
                payment_method: paymentMethod
            };
            await cashService.addMovement(movement);
            
            // Recargamos el turno para actualizar el balance esperado
            await loadActiveShift();
            if (showNotify) showNotify(type === 'income' ? 'Ingreso registrado' : 'Egreso registrado');
            return true;
        } catch (error) {
            console.error('Error adding movement:', error);
            if (showNotify) showNotify('Error al registrar movimiento', 'error');
            return false;
        }
    };

    /**
     * Registra una venta automáticamente
     */
    const registerSale = async (order) => {
        if (!activeShift) return;
        try {
            const movement = {
                shift_id: activeShift.id,
                type: 'sale',
                amount: order.total,
                description: `Venta #${String(order.id).slice(-4)} - ${order.client_name}`,
                payment_method: order.payment_type === 'online' ? 'online' : (order.payment_type === 'tarjeta' ? 'card' : 'cash'),
                order_id: order.id
            };
            await cashService.addMovement(movement);
            await loadActiveShift();
        } catch (error) {
            console.error('Error registering sale in cash system:', error);
        }
    };

    return {
        activeShift,
        loading,
        movements,
        loadingMovements,
        openShift,
        closeShift,
        addManualMovement,
        registerSale,
        refresh: loadActiveShift,
        // Nuevas funciones para historia
        getPastShifts: cashService.getPastShifts,
        getShiftMovements: cashService.getShiftMovements,
        // Cálculos rápidos para KPIs detallados (ahora acepta movimientos por parámetro)
        getTotals: (movementsData = movements) => {
            return movementsData.reduce((acc, m) => {
                const amount = m.amount || 0;
                if (m.type === 'expense') {
                    acc.expenses += amount;
                } else {
                    if (m.payment_method === 'cash') acc.cash += amount;
                    else if (m.payment_method === 'card') acc.card += amount;
                    else if (m.payment_method === 'online') acc.online += amount;
                    acc.income += amount;
                }
                return acc;
            }, { cash: 0, card: 0, online: 0, expenses: 0, income: 0 });
        }
    };
};
