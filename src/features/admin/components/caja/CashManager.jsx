import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Unlock, Lock, Plus, Minus, History, 
    Clock, Calendar, TrendingUp, TrendingDown,
    ArrowUpCircle, ArrowDownCircle, Eye,
    DollarSign, CreditCard, Smartphone, ChevronRight,
    MapPin
} from 'lucide-react';
import { useCashSystem } from '../../hooks/useCashSystem';
import { isValidBranchId } from '../../../../shared/utils/safeIds';
import CashShiftModal from './CashShiftModal';
import CashMovementModal from './CashMovementModal';
import CashShiftDetailModal from './CashShiftDetailModal';
import { formatCurrency } from '../../../../shared/utils/formatters';
import '../../styles/CashSystem.css';
import cashIcon from '../../../../assets/cash.svg';

const fmt = (n) => {
    try { return formatCurrency(n); } catch { return `$${(n || 0).toLocaleString('es-CL')}`; }
};

const ElapsedTime = ({ since }) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = Date.now() - new Date(since).getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
        };
        calc();
        const id = setInterval(calc, 60000);
        return () => clearInterval(id);
    }, [since]);
    return <span>{elapsed}</span>;
};

const CashManager = ({ showNotify, selectedBranchId }) => {
    const { 
        activeShift, loading: loadingSystem, movements,
        openShift, closeShift, addManualMovement, 
        getPastShifts, getTotals
    } = useCashSystem(showNotify, selectedBranchId);

    const [pastShifts, setPastShifts] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingShift, setViewingShift] = useState(null);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState('income');
    const [filterPeriod, setFilterPeriod] = useState('30');

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const data = await getPastShifts();
            setPastShifts(data || []);
        } catch (err) {
            showNotify('Error al cargar historial', 'error');
        } finally {
            setLoadingHistory(false);
        }
    }, [getPastShifts, showNotify]);

    useEffect(() => { loadHistory(); }, [loadHistory, activeShift]);

    const totals = useMemo(() => getTotals(movements), [movements, getTotals]);

    const salesCount = useMemo(() => movements.filter(m => m.type === 'sale').length, [movements]);
    const movementCount = movements.length;

    const filteredShifts = useMemo(() => {
        const days = parseInt(filterPeriod);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return pastShifts.filter(s => new Date(s.closed_at) >= cutoff);
    }, [pastShifts, filterPeriod]);

    const recentMovements = useMemo(() => movements.slice(0, 5), [movements]);

    if (loadingSystem) return (
        <div className="cash-loading">
            <div className="cash-spinner" />
            <span>Cargando caja...</span>
        </div>
    );

    if (!selectedBranchId || selectedBranchId === 'all' || !isValidBranchId(selectedBranchId)) {
        return (
            <div className="cash-empty-state">
                <div className="cash-empty-icon"><MapPin size={48} /></div>
                <h3>Selecciona una sucursal</h3>
                <p>Elige una sucursal en el menú superior para gestionar la caja de ese local.</p>
            </div>
        );
    }

    return (
        <div className="cash-container animate-fade">
            {/* HEADER */}
            <header className="cash-header">
                <div className="cash-header-left">
                    <img src={cashIcon} alt="Cajas" className="cash-header-icon" />
                    <div>
                        <h1>Caja</h1>
                        {activeShift && (
                            <div className="cash-header-status">
                                <span className="cash-pulse" />
                                Turno activo · <ElapsedTime since={activeShift.opened_at} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="cash-header-actions">
                    {activeShift ? (
                        <>
                            <button className="btn btn-income" onClick={() => { setMovementType('income'); setIsMovementModalOpen(true); }}>
                                <ArrowUpCircle size={16} /> Ingreso
                            </button>
                            <button className="btn btn-expense" onClick={() => { setMovementType('expense'); setIsMovementModalOpen(true); }}>
                                <ArrowDownCircle size={16} /> Egreso
                            </button>
                            <button className="btn btn-danger" onClick={() => setIsShiftModalOpen(true)}>
                                <Lock size={16} /> Cerrar caja
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary btn-open-shift" onClick={() => setIsShiftModalOpen(true)}>
                            <Unlock size={18} /> Abrir caja
                        </button>
                    )}
                </div>
            </header>

            {/* TURNO ACTIVO: KPI DASHBOARD */}
            {activeShift ? (
                <section className="cash-section">
                    <div className="cash-kpi-grid">
                        <div className="cash-kpi balance">
                            <div className="cash-kpi-header">
                                <DollarSign size={18} />
                                <span>Balance Esperado</span>
                            </div>
                            <div className="cash-kpi-value">{fmt(activeShift.expected_balance ?? activeShift.opening_balance ?? 0)}</div>
                            <div className="cash-kpi-sub">Base: {fmt(activeShift.opening_balance || 0)}</div>
                        </div>

                        <div className="cash-kpi income">
                            <div className="cash-kpi-header">
                                <TrendingUp size={18} />
                                <span>Ingresos</span>
                            </div>
                            <div className="cash-kpi-value">{fmt(totals.income)}</div>
                            <div className="cash-kpi-sub">{salesCount} ventas · {movementCount - salesCount > 0 ? `${movements.filter(m => m.type === 'income').length} manuales` : 'sin manuales'}</div>
                        </div>

                        <div className="cash-kpi expense">
                            <div className="cash-kpi-header">
                                <TrendingDown size={18} />
                                <span>Egresos</span>
                            </div>
                            <div className="cash-kpi-value">{fmt(totals.expenses)}</div>
                            <div className="cash-kpi-sub">{movements.filter(m => m.type === 'expense').length} movimientos</div>
                        </div>

                        <div className="cash-kpi methods">
                            <div className="cash-kpi-header">
                                <CreditCard size={18} />
                                <span>Por Método</span>
                            </div>
                            <div className="cash-methods-grid">
                                <div className="cash-method-row">
                                    <DollarSign size={14} />
                                    <span>Efectivo</span>
                                    <strong>{fmt(totals.cash)}</strong>
                                </div>
                                <div className="cash-method-row">
                                    <CreditCard size={14} />
                                    <span>Tarjeta</span>
                                    <strong>{fmt(totals.card)}</strong>
                                </div>
                                <div className="cash-method-row">
                                    <Smartphone size={14} />
                                    <span>Transf.</span>
                                    <strong>{fmt(totals.online)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ÚLTIMOS MOVIMIENTOS */}
                    {recentMovements.length > 0 && (
                        <div className="cash-recent">
                            <div className="cash-recent-header">
                                <h4><Clock size={16} /> Últimos movimientos</h4>
                                <button className="btn-text" onClick={() => setViewingShift(activeShift)}>
                                    Ver todos <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="cash-recent-list">
                                {recentMovements.map(m => (
                                    <div key={m.id} className="cash-recent-item">
                                        <div className={`cash-recent-icon ${m.type}`}>
                                            {m.type === 'expense' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                                        </div>
                                        <div className="cash-recent-info">
                                            <span className="cash-recent-desc">{m.description || (m.type === 'sale' ? 'Venta' : m.type === 'income' ? 'Ingreso' : 'Egreso')}</span>
                                            <span className="cash-recent-time">
                                                {new Date(m.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                {' · '}
                                                {m.payment_method === 'cash' ? 'Efectivo' : m.payment_method === 'card' ? 'Tarjeta' : 'Transf.'}
                                            </span>
                                        </div>
                                        <span className={`cash-recent-amount ${m.type === 'expense' ? 'negative' : 'positive'}`}>
                                            {m.type === 'expense' ? '-' : '+'}{fmt(m.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            ) : (
                <section className="cash-empty-state">
                    <div className="cash-empty-icon">
                        <Lock size={48} />
                    </div>
                    <h3>Caja cerrada</h3>
                    <p>Abre un turno para comenzar a registrar ventas e ingresos.</p>
                    <button className="btn btn-primary" onClick={() => setIsShiftModalOpen(true)}>
                        <Unlock size={18} /> Abrir caja
                    </button>
                </section>
            )}

            {/* HISTORIAL DE TURNOS */}
            <section className="cash-section">
                <div className="cash-section-header">
                    <h3 className="cash-section-title"><History size={18} /> Historial de turnos</h3>
                    <div className="cash-filters-inline">
                        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                            <option value="7">7 días</option>
                            <option value="30">30 días</option>
                            <option value="90">3 meses</option>
                            <option value="365">1 año</option>
                        </select>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="cash-history-loading">Cargando historial...</div>
                ) : filteredShifts.length === 0 ? (
                    <div className="cash-history-empty">
                        <Calendar size={32} />
                        <span>No hay turnos cerrados en este período.</span>
                    </div>
                ) : (
                    <div className="cash-history-list">
                        {filteredShifts.map(shift => {
                            const diff = shift.difference ?? ((shift.actual_balance || 0) - (shift.expected_balance || 0));
                            const duration = shift.closed_at && shift.opened_at
                                ? Math.round((new Date(shift.closed_at) - new Date(shift.opened_at)) / 60000)
                                : 0;
                            const durationStr = duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`;

                            return (
                                <div key={shift.id} className="cash-history-card" onClick={() => setViewingShift(shift)}>
                                    <div className="cash-history-date">
                                        <span className="cash-history-day">
                                            {new Date(shift.opened_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className="cash-history-hours">
                                            {new Date(shift.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                            {' → '}
                                            {new Date(shift.closed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="cash-history-duration">
                                            <Clock size={12} /> {durationStr}
                                        </span>
                                    </div>

                                    <div className="cash-history-amounts">
                                        <div className="cash-history-col">
                                            <label>Sistema</label>
                                            <span>{fmt(shift.expected_balance)}</span>
                                        </div>
                                        <div className="cash-history-col">
                                            <label>Conteo</label>
                                            <span>{fmt(shift.actual_balance)}</span>
                                        </div>
                                        <div className="cash-history-col">
                                            <label>Diferencia</label>
                                            <span className={diff >= 0 ? 'diff-positive' : 'diff-negative'}>
                                                {diff >= 0 ? '+' : ''}{fmt(Math.abs(diff))}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="cash-history-arrow">
                                        <Eye size={16} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* MODALES */}
            <CashShiftModal 
                isOpen={isShiftModalOpen} 
                onClose={() => setIsShiftModalOpen(false)}
                type={activeShift ? 'close' : 'open'}
                activeShift={activeShift}
                onConfirm={activeShift ? closeShift : openShift}
            />

            <CashMovementModal 
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                type={movementType}
                onConfirm={addManualMovement}
            />

            <CashShiftDetailModal 
                isOpen={!!viewingShift}
                onClose={() => setViewingShift(null)}
                shift={viewingShift}
                getTotals={getTotals}
            />
        </div>
    );
};

export default CashManager;
