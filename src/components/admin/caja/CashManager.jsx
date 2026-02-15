import React, { useState } from 'react';
import { 
    Unlock, Lock, Plus, Minus, History, 
    TrendingUp, TrendingDown, DollarSign, Clock,
    AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useCashSystem } from '../../../hooks/caja/useCashSystem';
import CashShiftModal from './CashShiftModal';
import CashMovementModal from './CashMovementModal';
import '../../../styles/caja/CashSystem.css';

const CashManager = ({ showNotify }) => {
    const { 
        activeShift, loading, movements, loadingMovements,
        openShift, closeShift, addManualMovement 
    } = useCashSystem(showNotify);

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState('income'); // 'income' or 'expense'

    if (loading) return (
        <div className="flex-center" style={{ height: '50vh' }}>
            <div className="animate-spin" style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
        </div>
    );

    const handleOpenMovement = (type) => {
        setMovementType(type);
        setIsMovementModalOpen(true);
    };

    return (
        <div className="cash-container animate-fade">
            
            {activeShift ? (
                <>
                    {/* ACCIONES Y ESTADO EN VIVO */}
                    <div className="cash-actions-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="status-indicator online"></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Turno en Curso</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Abierto el {new Date(activeShift.opened_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                        
                        <div className="cash-primary-actions">
                            <button className="btn btn-secondary" onClick={() => handleOpenMovement('income')}>
                                <Plus size={18} style={{ marginRight: 6 }} /> Ingreso
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleOpenMovement('expense')}>
                                <Minus size={18} style={{ marginRight: 6 }} /> Egreso
                            </button>
                            <button className="btn btn-danger" onClick={() => setIsShiftModalOpen(true)}>
                                <Lock size={18} style={{ marginRight: 6 }} /> Cerrar Caja
                            </button>
                        </div>
                    </div>

                    {/* KPIs DE DINERO */}
                    <div className="cash-stats-grid">
                        <div className="cash-kpi-card glass">
                            <div className="cash-kpi-icon balance"><DollarSign size={24} /></div>
                            <div className="cash-kpi-info">
                                <h4>Efectivo Esperado</h4>
                                <span className="cash-kpi-value">${activeShift.expected_balance.toLocaleString('es-CL')}</span>
                            </div>
                        </div>

                        <div className="cash-kpi-card glass">
                            <div className="cash-kpi-icon income"><TrendingUp size={24} /></div>
                            <div className="cash-kpi-info">
                                <h4>Total Ingresos</h4>
                                <span className="cash-kpi-value" style={{ color: '#25d366' }}>
                                    ${movements.filter(m => m.type !== 'expense').reduce((acc, m) => acc + m.amount, 0).toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>

                        <div className="cash-kpi-card glass">
                            <div className="cash-kpi-icon expense"><TrendingDown size={24} /></div>
                            <div className="cash-kpi-info">
                                <h4>Total Egresos</h4>
                                <span className="cash-kpi-value" style={{ color: '#e63946' }}>
                                    ${movements.filter(m => m.type === 'expense').reduce((acc, m) => acc + m.amount, 0).toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* TABLA DE MOVIMIENTOS */}
                    <div className="cash-history-section glass" style={{ padding: 20, borderRadius: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                            <History size={20} className="text-secondary" />
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Movimientos del Turno</h3>
                        </div>

                        {loadingMovements ? (
                            <div style={{ padding: 40, textAlign: 'center' }}>Cargando transacciones...</div>
                        ) : movements.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>No hay movimientos registrados hoy.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="cash-movements-table">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Tipo</th>
                                            <th>Descripción</th>
                                            <th>Método</th>
                                            <th style={{ textAlign: 'right' }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map(m => (
                                            <tr key={m.id} className="movement-row">
                                                <td style={{ color: 'var(--text-secondary)', width: 80 }}>
                                                    {new Date(m.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td style={{ width: 120 }}>
                                                    <span className={`movement-type type-${m.type}`}>
                                                        {m.type === 'sale' ? 'Venta' : (m.type === 'income' ? 'Ingreso' : 'Egreso')}
                                                    </span>
                                                </td>
                                                <td>{m.description}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                    {m.payment_method === 'cash' ? 'Efectivo' : (m.payment_method === 'card' ? 'Tarjeta' : 'Online')}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span className={`movement-amount ${m.type === 'expense' ? 'amount-minus' : 'amount-plus'}`}>
                                                        {m.type === 'expense' ? '-' : '+'}${m.amount.toLocaleString('es-CL')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="cash-closed-state glass">
                    <div className="cash-closed-icon">
                        <Lock size={40} />
                    </div>
                    <h2 style={{ marginBottom: 10 }}>Caja Cerrada</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 30 }}>
                        Debes abrir la caja para poder registrar ventas y movimientos de dinero hoy.
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => setIsShiftModalOpen(true)}>
                        <Unlock size={20} style={{ marginRight: 10 }} /> Iniciar Turno
                    </button>
                </div>
            )}

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
        </div>
    );
};

export default CashManager;
