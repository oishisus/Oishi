import { useState, useEffect, useCallback, useMemo } from 'react';
import { cashService } from '../features/admin/services/cashService';
import { supabase } from '../lib/supabase';
import { TABLES } from '../lib/supabaseTables';
import { CashContext } from './CashContextInstance';
const normId = (id) => (id != null ? String(id) : null);


export const CashProvider = ({ children }) => {
    const [activeShift, setActiveShift] = useState(null);
    const [branchesWithOpenCaja, setBranchesWithOpenCaja] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshAll = useCallback(async () => {
        try {
            setLoading(true);
            const [shift, branchIds] = await Promise.all([
                cashService.getActiveShift(),
                cashService.getBranchesWithOpenCaja()
            ]);
            setActiveShift(shift);
            setBranchesWithOpenCaja((branchIds || []).map(normId).filter(Boolean));
        } catch (error) {
            setActiveShift(null);
            setBranchesWithOpenCaja([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshAll();

        const channel = supabase
            .channel('cash_shifts_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: TABLES.cash_shifts },
                (payload) => {
                    // Actualización instantánea desde el payload (0 latencia)
                    const eventType = payload.eventType || payload.event;
                    const newRow = payload.new || payload.newRecord;
                    const oldRow = payload.old || payload.oldRecord;

                    setBranchesWithOpenCaja((prev) => {
                        const add = (id) => {
                            const n = normId(id);
                            if (n && !prev.includes(n)) return [...prev, n];
                            return prev;
                        };
                        const remove = (id) => {
                            const n = normId(id);
                            if (n) return prev.filter((b) => b !== n);
                            return prev;
                        };

                        if (eventType === 'INSERT' && newRow?.status === 'open') return add(newRow.branch_id);
                        if (eventType === 'UPDATE' && newRow) {
                            if (oldRow?.status === 'open' && newRow.status !== 'open') return remove(oldRow.branch_id);
                            if (newRow.status === 'open') return add(newRow.branch_id);
                        }
                        if (eventType === 'DELETE' && oldRow?.status === 'open') return remove(oldRow.branch_id);
                        return prev;
                    });

                    setActiveShift((prev) => {
                        if (eventType === 'INSERT' && newRow?.status === 'open') return newRow;
                        if (eventType === 'UPDATE' && newRow?.status === 'open') return newRow;
                        if (eventType === 'UPDATE' && newRow?.status !== 'open') return null;
                        if (eventType === 'DELETE') return null;
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [refreshAll]);

    const isShiftActiveForBranch = useCallback((branchId) => {
        if (!branchId) return false;
        return branchesWithOpenCaja.includes(normId(branchId));
    }, [branchesWithOpenCaja]);

    const value = useMemo(() => ({
        activeShift,
        branchesWithOpenCaja,
        isShiftLoading: loading,
        isShiftActive: !!activeShift,
        isShiftActiveForBranch,
        refreshShift: refreshAll,
    }), [activeShift, branchesWithOpenCaja, loading, isShiftActiveForBranch, refreshAll]);

    return <CashContext.Provider value={value}>{children}</CashContext.Provider>;
};
