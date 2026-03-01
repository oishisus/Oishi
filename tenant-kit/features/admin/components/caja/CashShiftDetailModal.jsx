import React, { useState, useEffect, useCallback } from 'react';
import { X, History, TrendingUp, TrendingDown, DollarSign, Clock, User } from 'lucide-react';
import { cashService } from '../../services/cashService';

const CashShiftDetailModal = ({ isOpen, onClose, shift, getTotals }) => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadMovements = useCallback(async () => {
        if (!shift?.id) return;
        setLoading(true);
        try {
            const data = await cashService.getShiftMovements(shift.id);
            setMovements(data || []);
        } catch (error) {
            setMovements([]);
        } finally {
            setLoading(false);
        }
    }, [shift?.id]);

    useEffect(() => {
        if (isOpen && shift) {
            loadMovements();
        }
    }, [isOpen, shift, loadMovements]);

    if (!isOpen || !shift) return null;

    const totals = getTotals ? getTotals(movements) : { income: 0, expense: 0, cash: 0, card: 0, online: 0 };

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="modal-content glass" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <History className="text-accent" size={24} />
                        <div>
                            <h3 className="fw-700" style={{ margin: 0 }}>Viendo Turno Pasado</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {new Date(shift.closed_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-close"><X size={24} /></button>
                </header>

                <div className="modal-body" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* INFO HEADER */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
                        <div className="glass" style={{ padding: 18, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-center" style={{ gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 10 }}>
                                <Clock size={14} /> Horarios del Turno
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Apertura:</span> 
                                    <span>{new Date(shift.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Cierre:</span> 
                                    <span>{new Date(shift.closed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="glass" style={{ padding: 18, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-center" style={{ gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 10 }}>
                                <User size={14} /> Responsable de Apertura
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', padding: '5px 0' }}>
                                Administrador
                            </div>
                        </div>
                    </div>

                    {/* KPIs PRINCIPALES */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                        <div className="mini-kpi glass" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 15 }}>
                            <label style={{ marginBottom: 5 }}>Base Caja</label>
                            <span style={{ fontSize: '1.1rem' }}>${(shift.opening_balance || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="mini-kpi glass" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 15 }}>
                            <label style={{ marginBottom: 5 }}>Efectivo Final</label>
                            <span style={{ color: '#25d366', fontSize: '1.1rem' }}>${(shift.actual_balance || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="mini-kpi glass" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 15 }}>
                            <label style={{ marginBottom: 5 }}>Ingresos Totales</label>
                            <span style={{ color: '#38bdf8', fontSize: '1.1rem' }}>+${(totals.income || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="mini-kpi glass" style={{ 
                            flexDirection: 'column', 
                            alignItems: 'flex-start', 
                            padding: 15,
                            border: shift.actual_balance < shift.expected_balance ? '1px solid rgba(230, 57, 70, 0.3)' : '1px solid rgba(37, 211, 102, 0.3)',
                            background: shift.actual_balance < shift.expected_balance ? 'rgba(230, 57, 70, 0.05)' : 'rgba(37, 211, 102, 0.05)'
                        }}>
                            <label style={{ marginBottom: 5 }}>{(shift.actual_balance || 0) >= (shift.expected_balance || 0) ? 'Sobrante' : 'Faltante'}</label>
                            <span className={(shift.actual_balance || 0) >= (shift.expected_balance || 0) ? 'profit-plus' : 'profit-minus'} style={{ fontSize: '1.1rem' }}>
                                ${Math.abs((shift.actual_balance || 0) - (shift.expected_balance || 0)).toLocaleString('es-CL')}
                            </span>
                        </div>
                    </div>

                    {/* DESGLOSE POR METODO */}
                    <h4 style={{ fontSize: '0.9rem', marginBottom: 15, color: 'var(--text-secondary)' }}>Desglose por Métodos de Pago</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 30 }}>
                        <div className="glass" style={{ padding: 12, textAlign: 'center', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>💵 Efectivo</div>
                            <div style={{ fontWeight: 700 }}>${(totals.cash || 0).toLocaleString('es-CL')}</div>
                        </div>
                        <div className="glass" style={{ padding: 12, textAlign: 'center', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>💳 Tarjeta</div>
                            <div style={{ fontWeight: 700 }}>${(totals.card || 0).toLocaleString('es-CL')}</div>
                        </div>
                        <div className="glass" style={{ padding: 12, textAlign: 'center', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>📲 Transf.</div>
                            <div style={{ fontWeight: 700 }}>${(totals.online || 0).toLocaleString('es-CL')}</div>
                        </div>
                    </div>

                    {/* TABLA DE MOVIMIENTOS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                        <Clock size={16} className="text-secondary" />
                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Movimientos de este Turno</h4>
                    </div>

                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center' }}>Cargando transacciones...</div>
                    ) : (
                        <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: 12 }}>
                            <table className="cash-movements-table" style={{ borderSpacing: 0 }}>
                                <tbody>
                                    {movements.map(m => (
                                        <tr key={m.id} className="movement-row">
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: 80, padding: '12px 15px' }}>
                                                {new Date(m.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ width: 110, padding: '12px 0' }}>
                                                <span className={`movement-type type-${m.type}`} style={{ fontSize: '0.65rem' }}>
                                                    {m.type === 'sale' ? 'Venta' : (m.type === 'income' ? 'Ingreso' : 'Egreso')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', padding: '12px 10px' }}>
                                                <div style={{ fontWeight: 500 }}>{m.description}</div>
                                                {m.orders && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: 2, marginBottom: 2 }}>
                                                        <div style={{ fontWeight: 600 }}>{m.orders.client_name || 'Cliente Casual'}</div>
                                                        {m.orders.items && (
                                                            <div style={{ opacity: 0.85, fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                                                {Array.isArray(m.orders.items)
                                                                    ? m.orders.items.map(i => `${i.quantity}x ${(i.name ?? '').split(' (')[0]}`).join(', ')
                                                                    : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {m.payment_method === 'cash' ? '💵 Efectivo' : (m.payment_method === 'card' ? '💳 Tarjeta' : '📲 Transf.')}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '12px 15px' }}>
                                                <span className={`movement-amount ${m.type === 'expense' ? 'amount-minus' : 'amount-plus'}`} style={{ fontSize: '0.9rem' }}>
                                                    {m.type === 'expense' ? '-' : '+'}${Number(m.amount).toLocaleString('es-CL')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ borderTop: 'none', marginTop: 10 }}>
                    <button className="btn btn-secondary btn-block" onClick={onClose}>Cerrar Detalle</button>
                </div>
            </div>
        </div>
    );
};

export default CashShiftDetailModal;
