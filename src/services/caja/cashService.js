import { supabase } from '../../lib/supabase';

/**
 * Servicio para la gestión de Caja (Shifts y Movements)
 */

export const cashService = {
    // --- TURNOS ---

    /**
     * Obtiene el turno abierto actualmente si existe
     */
    getActiveShift: async () => {
        const { data, error } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('status', 'open')
            .limit(1);

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
        return data && data.length > 0 ? data[0] : null;
    },

    /**
     * Abre un nuevo turno de caja
     */
    openShift: async (openingBalance, userId) => {
        const { data, error } = await supabase
            .from('cash_shifts')
            .insert({
                opening_balance: openingBalance,
                expected_balance: openingBalance,
                opened_by: userId,
                status: 'open'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Cierra un turno de caja
     */
    closeShift: async (shiftId, actualBalance) => {
        const { data, error } = await supabase
            .from('cash_shifts')
            .update({
                actual_balance: actualBalance,
                closed_at: new Date().toISOString(),
                status: 'closed'
            })
            .eq('id', shiftId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- MOVIMIENTOS ---

    /**
     * Registra un nuevo movimiento de caja
     */
    addMovement: async (movement) => {
        const { data, error } = await supabase
            .from('cash_movements')
            .insert(movement)
            .select();

        if (error) throw error;

        // Actualizamos el saldo esperado en el turno (solo para efectivo)
        if (movement.payment_method === 'cash') {
            const amountChange = movement.type === 'expense' ? -movement.amount : movement.amount;
            
            // Intentar con RPC primero (ignora si no existe = 404)
            const { error: rpcError } = await supabase.rpc('update_shift_balance', {
                p_shift_id: movement.shift_id,
                p_amount: amountChange
            });
            
            // Si falla RPC o código 404, usar fallback manual
            if (rpcError && rpcError.code !== '404') {
                console.warn('RPC error (non-404):', rpcError);
            }
            
            // Siempre hacer fallback manual (RPC probablemente no existe)
            try {
                const { data: shifts } = await supabase
                    .from('cash_shifts')
                    .select('expected_balance')
                    .eq('id', movement.shift_id)
                    .limit(1);
                
                const shift = shifts && shifts.length > 0 ? shifts[0] : null;
                if (shift !== null && shift.expected_balance !== undefined) {
                    await supabase
                        .from('cash_shifts')
                        .update({ expected_balance: (shift.expected_balance || 0) + amountChange })
                        .eq('id', movement.shift_id);
                }
            } catch (fallbackError) {
                console.warn('Fallback update failed:', fallbackError);
                // No bloqueamos si falla el fallback
            }
        }

        return data && data.length > 0 ? data[0] : data;
    },

    /**
     * Obtiene los movimientos de un turno específico
     */
    getShiftMovements: async (shiftId) => {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('shift_id', shiftId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Obtiene el historial de turnos cerrados
     */
    getPastShifts: async (limit = 20) => {
        const { data, error } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('status', 'closed')
            .order('closed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    /**
     * Obtiene un turno específico por ID
     */
    getShiftById: async (shiftId) => {
        const { data, error } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('id', shiftId)
            .single();

        if (error) throw error;
        return data;
    }
};
