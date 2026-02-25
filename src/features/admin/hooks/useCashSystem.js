import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import { isValidBranchId } from '../../../shared/utils/safeIds';

export const useCashSystem = (showNotify, branchId) => {
    const [activeShift, setActiveShift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [movements, setMovements] = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    /**
     * Carga los movimientos de un turno específico
     */
    const loadMovements = useCallback(async (shiftId) => {
        setLoadingMovements(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.cash_movements)
                .select(`*, ${TABLES.orders}(*)`)
                .eq('shift_id', shiftId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            setMovements([]);
        } finally {
            setLoadingMovements(false);
        }
    }, []);

    /**
     * Carga el turno activo para la sucursal seleccionada
     */
    const loadActiveShift = useCallback(async () => {
        if (!branchId || branchId === 'all' || !isValidBranchId(branchId)) {
            // [ROBUSTEZ] No llamar API con slug (ej. "san-joaquin") → evita 400 y caja que no carga
            setActiveShift(null);
            setMovements([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data: shift, error } = await supabase
                .from(TABLES.cash_shifts)
                .select(`*, ${TABLES.cash_movements}(count)`)
                .eq('status', 'open')
                .eq('branch_id', branchId) // FILTRO CRÍTICO POR SUCURSAL
                .maybeSingle();

            if (error) throw error;

            // [FIX] Actualizar si cambia el ID o el balance esperado (para reflejar ingresos/egresos)
            setActiveShift(prev => {
                if (!prev || !shift) return shift;
                // Usamos Number() para asegurar comparación por valor numérico y no por referencia o tipo (string vs number)
                if (prev.id === shift.id && Number(prev.expected_balance) === Number(shift.expected_balance)) return prev;
                return shift;
            });
            
            if (shift) {
                loadMovements(shift.id);
            } else {
                setMovements([]);
            }
        } catch (error) {
            if (showNotify) showNotify('Error al cargar datos de caja', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotify, loadMovements, branchId]);

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
                    table: TABLES.cash_movements,
                    filter: `shift_id=eq.${activeShift.id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Re-fetchear para tener el mismo shape (con join orders) que loadMovements
                        loadMovements(activeShift.id);
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
    }, [activeShift?.id, loadMovements]);

    /**
     * Abre un nuevo turno
     */
    const openShift = useCallback(async (amount) => {
        if (!branchId || branchId === 'all' || !isValidBranchId(branchId)) {
            if (showNotify) showNotify('Error: No se ha detectado la sucursal seleccionada.', 'error');
            return false;
        }
        try {
            const { data: newShift, error } = await supabase.rpc('cash_open_shift', {
                p_branch_id: branchId,
                p_opening_balance: Number(amount) || 0
            });

            if (error) throw error;

            setActiveShift(newShift);
            setMovements([]);
            if (showNotify) showNotify('Caja abierta con éxito');
            return true;
        } catch (error) {
            if (showNotify) {
                let msg = 'Error al abrir caja';
                if (error.message?.includes('Ya existe')) {
                    msg = error.message;
                } else if (error.code === '42501') {
                    msg = 'Error de permisos (RLS). Configura las políticas en Supabase.';
                }
                showNotify(msg, 'error');
            }
            return false;
        }
    }, [branchId, showNotify]);

    /**
     * Cierra el turno actual
     */
    const closeShift = useCallback(async (actualBalance) => {
        if (!activeShift) return false;
        try {
            const { error } = await supabase
                .from(TABLES.cash_shifts)
                .update({
                    actual_balance: actualBalance,
                    closed_at: new Date().toISOString(),
                    status: 'closed'
                })
                .eq('id', activeShift.id)
                .eq('status', 'open');

            if (error) throw error;

            setActiveShift(null);
            setMovements([]);
            if (showNotify) showNotify('Caja cerrada correctamente');
            return true;
        } catch (error) {
            if (showNotify) showNotify('Error al cerrar caja', 'error');
            return false;
        }
    }, [activeShift, showNotify]);

    /**
     * Helper interno para actualizar el balance esperado de forma segura
     * Intenta usar RPC (base de datos) y hace fallback manual si falla.
     */
    const updateShiftBalance = useCallback(async (shiftId, amountDelta) => {
        // 1. Intentar vía RPC (Atómico y seguro contra condiciones de carrera)
        const { error: rpcError } = await supabase.rpc('increment_expected_balance', { 
            shift_id: shiftId, 
            amount: amountDelta 
        });

        if (!rpcError) return true;

        // 2. Fallback Manual (Lectura -> Escritura) si no existe la función RPC
        // Si el error es 404 (función no encontrada), usamos el fallback silenciosamente
        if (rpcError.code !== 'PGRST202' && !rpcError.message?.includes('Could not find the function')) {
            // Sin logging: fallback silencioso
        }
        
        const { data: current, error: fetchError } = await supabase
            .from(TABLES.cash_shifts)
            .select('expected_balance')
            .eq('id', shiftId)
            .single();
            
        if (fetchError || !current) return false;

        const newBalance = Math.round(((Number(current.expected_balance) || 0) + amountDelta) * 100) / 100;
        
        const { error: updateError } = await supabase
            .from(TABLES.cash_shifts)
            .update({ expected_balance: newBalance })
            .eq('id', shiftId);

        return !updateError;
    }, []);

    /**
     * [MEJORA MULTI-NEGOCIO]
     * Obtiene el turno objetivo para una transacción.
     * Si estamos en vista "Todas", busca el turno abierto de la sucursal del pedido.
     */
    const getTargetShift = useCallback(async (orderBranchId) => {
        // 1. Escenario ideal: El turno activo en pantalla coincide con la orden
        if (activeShift && activeShift.branch_id === orderBranchId) {
            return activeShift;
        }

        // 2. Escenario Admin Global: Buscar turno abierto específico para esa sucursal
        if (orderBranchId) {
            const { data } = await supabase
                .from(TABLES.cash_shifts)
                .select('id, expected_balance, branch_id')
                .eq('status', 'open')
                .eq('branch_id', orderBranchId)
                .maybeSingle();
            return data;
        }
        return null;
    }, [activeShift]);

    /**
     * Agrega un movimiento manual (Ingreso/Egreso)
     */
    const addManualMovement = useCallback(async (type, amount, description, paymentMethod = 'cash') => {
        if (!activeShift) return false;
        try {
            const numericAmount = Number(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) throw new Error("El monto debe ser un número mayor a 0");

            // Validación estricta para egresos
            if (type === 'expense' && (!description || description.trim().length < 3)) {
                throw new Error("Es obligatorio indicar el motivo del egreso (mínimo 3 letras).");
            }

            const { error } = await supabase.rpc('cash_add_movement', {
                p_shift_id: activeShift.id,
                p_type: type,
                p_amount: numericAmount,
                p_description: description,
                p_payment_method: paymentMethod,
                p_order_id: null
            });
            if (error) throw error;
            
            await loadActiveShift();
            if (showNotify) showNotify(type === 'income' ? 'Ingreso registrado' : 'Egreso registrado');
            return true;
        } catch (error) {
            if (showNotify) {
                if (error.code === '42501') {
                    showNotify('Error de permisos (RLS) al registrar movimiento.', 'error');
                } else {
                    showNotify(error.message || 'Error al registrar movimiento', 'error');
                }
            }
            return false;
        }
    }, [activeShift, showNotify, loadActiveShift, updateShiftBalance]);

    /**
     * Registra una venta automáticamente
     */
    const registerSale = useCallback(async (order) => {
        // [ROBUSTEZ] Usar getTargetShift en lugar de depender solo de activeShift
        const targetShift = await getTargetShift(order.branch_id);
        if (!targetShift) {
            if (showNotify) showNotify('No hay caja abierta para esta sucursal', 'error');
            return false;
        }

        try {
            // [MEJORA ROBUSTEZ] Verificar balance neto de la orden en este turno
            // Esto permite manejar casos de: Venta -> Cancelación -> Venta (Re-ingreso)
            const { data: movements } = await supabase
                .from(TABLES.cash_movements)
                .select('type, amount')
                .eq('shift_id', targetShift.id)
                .eq('order_id', order.id);

            const saleAmount = Math.round(Number(order.total) || 0);
            if (saleAmount <= 0) return false; // No registrar ventas de valor 0 o inválidas

            const currentNet = (movements || []).reduce((acc, m) => acc + (m.type === 'sale' ? m.amount : -m.amount), 0);

            // Si el balance neto ya es igual al total (o muy cercano), ya está registrada.
            if (Math.abs(currentNet - saleAmount) < 5) return true;

            const movement = {
                shift_id: targetShift.id,
                type: 'sale',
                amount: saleAmount,
                description: `Venta #${String(order.id).slice(-4)} - ${order.client_name}`,
                payment_method: order.payment_type === 'online' ? 'online' : (order.payment_type === 'tarjeta' ? 'card' : 'cash'),
                order_id: order.id
            };

            const { error } = await supabase.rpc('cash_add_movement', {
                p_shift_id: movement.shift_id,
                p_type: movement.type,
                p_amount: movement.amount,
                p_description: movement.description,
                p_payment_method: movement.payment_method,
                p_order_id: movement.order_id
            });
            if (error) throw error;

            // Solo recargar si el turno afectado es el que estamos viendo
            if (activeShift && activeShift.id === targetShift.id) {
                await loadActiveShift();
            }
            return true;
        } catch (error) {
            if (showNotify) showNotify('Error registrando venta en caja', 'error');
            return false;
        }
    }, [activeShift, loadActiveShift, updateShiftBalance, getTargetShift]);

    /**
     * Registra una devolución
     */
    const registerRefund = useCallback(async (order) => {
        // [ROBUSTEZ] Usar getTargetShift para devoluciones también
        const targetShift = await getTargetShift(order.branch_id);
        if (!targetShift) {
            if (showNotify) showNotify('No hay caja abierta para esta sucursal', 'error');
            return false;
        }

        try {
            // [MEJORA ROBUSTEZ] Verificar si ya está reembolsada (Neto ~ 0)
            const { data: movements } = await supabase
                .from(TABLES.cash_movements)
                .select('type, amount')
                .eq('shift_id', targetShift.id)
                .eq('order_id', order.id);

            const refundAmount = Math.round(Number(order.total) || 0);
            if (refundAmount <= 0) return false;

            const currentNet = (movements || []).reduce((acc, m) => acc + (m.type === 'sale' ? m.amount : -m.amount), 0);
            
            // Si el balance neto es 0 (o negativo), ya está reembolsada o nunca se cobró.
            if (currentNet <= 5) return true;

            const movement = {
                shift_id: targetShift.id,
                type: 'expense',
                amount: refundAmount,
                description: `Devolución #${String(order.id).slice(-4)} - ${order.client_name}`,
                payment_method: order.payment_type === 'online' ? 'online' : (order.payment_type === 'tarjeta' ? 'card' : 'cash'),
                order_id: order.id
            };

            const { error } = await supabase.rpc('cash_add_movement', {
                p_shift_id: movement.shift_id,
                p_type: movement.type,
                p_amount: movement.amount,
                p_description: movement.description,
                p_payment_method: movement.payment_method,
                p_order_id: movement.order_id
            });
            if (error) throw error;

            if (activeShift && activeShift.id === targetShift.id) {
                await loadActiveShift();
            }
            if (showNotify) showNotify('Devolución registrada en caja', 'success');
            return true;
        } catch (error) {
            if (showNotify) showNotify('Error registrando devolución', 'error');
            return false;
        }
    }, [activeShift, showNotify, loadActiveShift, updateShiftBalance, getTargetShift]);

    const getPastShifts = useCallback(async (limit = 20) => {
        if (!branchId || !isValidBranchId(branchId)) return [];
        const { data, error } = await supabase
            .from(TABLES.cash_shifts)
            .select(`
                *,
                cash_movements (
                    amount,
                    type,
                    payment_method
                )
            `)
            .eq('status', 'closed')
            .eq('branch_id', branchId) // FILTRO POR SUCURSAL
            .order('closed_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        
        // Calcular totales de transferencias para cada turno
        return data.map(shift => {
            const movements = shift.cash_movements || [];
            const totalOnline = movements
                .filter(m => m.payment_method === 'online' && m.type === 'sale')
                .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
            
            return { ...shift, total_online: totalOnline };
        });
    }, [branchId]);

    const getShiftMovements = useCallback(async (shiftId) => {
        const { data, error } = await supabase
            .from(TABLES.cash_movements)
            .select(`*, ${TABLES.orders}(*)`)
            .eq('shift_id', shiftId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }, []);

    const getTotals = useCallback((movementsData = movements) => {
        return movementsData.reduce((acc, m) => {
            const amount = Number(m.amount) || 0;
            if (m.type === 'expense') {
                acc.expenses += amount;
                // [FIX] Restar egresos del balance del método de pago correspondiente
                if (m.payment_method === 'cash') acc.cash -= amount;
                else if (m.payment_method === 'card') acc.card -= amount;
                else if (m.payment_method === 'online') acc.online -= amount;
            } else {
                if (m.payment_method === 'cash') acc.cash += amount;
                else if (m.payment_method === 'card') acc.card += amount;
                else if (m.payment_method === 'online') acc.online += amount;
                acc.income += amount; // Total Ingresos (Bruto)
            }
            return acc;
        }, { cash: 0, card: 0, online: 0, expenses: 0, income: 0 });
    }, [movements]);

    // Memoizar el objeto de retorno para evitar re-renderizados infinitos en consumidores
    return useMemo(() => ({
        activeShift,
        loading,
        movements,
        loadingMovements,
        openShift,
        closeShift,
        addManualMovement,
        registerSale,
        registerRefund,
        refresh: loadActiveShift,
        getPastShifts,
        getShiftMovements,
        getTotals
    }), [
        activeShift, loading, movements, loadingMovements,
        openShift, closeShift, addManualMovement, registerSale, registerRefund,
        loadActiveShift, getPastShifts, getShiftMovements, getTotals
    ]);
};
