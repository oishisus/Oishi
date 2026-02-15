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
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
        return data;
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
        // Obtenemos el turno actual para actualizar su ahorro esperado si es necesario
        // Aunque lo mejor es que el esperado se calcule o se actualice aquí.
        
        const { data, error } = await supabase
            .from('cash_movements')
            .insert(movement)
            .select()
            .single();

        if (error) throw error;

        // Actualizamos el saldo esperado en el turno
        if (movement.payment_method === 'cash') {
            const amountChange = movement.type === 'expense' ? -movement.amount : movement.amount;
            
            // Incrementamos el expected_balance de la caja (solo para efectivo)
            const { error: updateError } = await supabase.rpc('update_shift_balance', {
                p_shift_id: movement.shift_id,
                p_amount: amountChange
            });
            
            // Si el RPC no existe aún (que es probable), lo haremos manual por ahora
            if (updateError) {
                const { data: shift } = await supabase.from('cash_shifts').select('expected_balance').eq('id', movement.shift_id).single();
                await supabase.from('cash_shifts')
                    .update({ expected_balance: (shift.expected_balance || 0) + amountChange })
                    .eq('id', movement.shift_id);
            }
        }

        return data;
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
    }
};
