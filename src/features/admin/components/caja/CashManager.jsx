import React, { useState, useEffect, useCallback } from 'react';
import { 
    Unlock, Lock, Plus, Minus, History, 
    Settings, Calendar, Info, Search,
    AlertCircle, CheckCircle2, ChevronRight, DollarSign
} from 'lucide-react';
import { useCashSystem } from '../../hooks/useCashSystem';
import CashShiftModal from './CashShiftModal';
import CashMovementModal from './CashMovementModal';
import CashShiftDetailModal from './CashShiftDetailModal';
import '../../styles/CashSystem.css';
import cashIcon from '../../../../assets/cash.svg';

const CashManager = ({ showNotify }) => {
    const { 
        activeShift, loading: loadingSystem, 
        openShift, closeShift, addManualMovement, 
        getPastShifts, getTotals
    } = useCashSystem(showNotify);

    const [pastShifts, setPastShifts] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingShift, setViewingShift] = useState(null);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementType, setMovementType] = useState('income');
    
    // Filtros (simulados por ahora)
    const [filterPeriod, setFilterPeriod] = useState('30'); 

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const data = await getPastShifts();
            setPastShifts(data || []);
        } catch {
            showNotify('Error al cargar historial', 'error');
        } finally {
            setLoadingHistory(false);
        }
    }, [getPastShifts, showNotify]);

    // Cargar historial al montar
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    if (loadingSystem) return (
        <div className="flex-center" style={{ height: '50vh' }}>
            <div className="animate-spin" style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
        </div>
    );

    return (
        <div className="cash-container animate-fade">
            
            {/* HEADER PRINCIPAL */}
            <header className="cash-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img 
                        src={cashIcon} 
                        alt="Cajas" 
                        style={{ 
                            width: 32, 
                            height: 32, 
                            filter: 'brightness(0) invert(1)' 
                        }} 
                    />
                    <h1 style={{ lineHeight: 1 }}>Cajas</h1>
                </div>
                <div className="cash-header-actions">
                    {/* Botón Nuevo Gasto/Ingreso solo si hay caja abierta */}
                    {activeShift && (
                        <button 
                            className="btn btn-secondary" 
                            style={{ background: 'white', color: '#3b82f6', border: '1px solid #3b82f6' }}
                            onClick={() => { setMovementType('income'); setIsMovementModalOpen(true); }}
                        >
                            + Nuevo ingreso/gasto
                        </button>
                    )}
                    
                    {/* Botón Abrir Caja Destacado si cerrada */}
                    {!activeShift && (
                        <button className="btn btn-primary" onClick={() => setIsShiftModalOpen(true)}>
                            + Abrir caja
                        </button>
                    )}


                </div>
            </header>

            {/* SECCIÓN ABIERTAS */}
            <section className="cash-section">
                <h3 className="cash-section-title">Abiertas</h3>
                <div className="cash-table-container">
                    <table className="cash-table">
                        <thead>
                            <tr>
                                <th>FECHA DE APERTURA <Info size={14} className="info-icon" /></th>
                                <th>CAJA <Info size={14} className="info-icon" /></th>
                                <th>INFORMACIÓN DEL SISTEMA <Info size={14} className="info-icon" /></th>
                                <th>CONTEO MANUAL <Info size={14} className="info-icon" /></th>
                                <th>DIFERENCIA <Info size={14} className="info-icon" /></th>
                                <th>ESTADO <Info size={14} className="info-icon" /></th>
                                <th>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeShift ? (
                                <tr>
                                    <td>
                                        {new Date(activeShift.opened_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        <br/>
                                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                            {new Date(activeShift.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td>Caja Principal</td>
                                    <td>
                                        {/* El sistema asume que el expected es calculado en vivo */}
                                        ${activeShift.expected_balance ? activeShift.expected_balance.toLocaleString('es-CL') : getTotals().expected.toLocaleString('es-CL')}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>-</td>
                                    <td style={{ textAlign: 'center' }}>-</td>
                                    <td>
                                        <span className="status-badge open">Abierta</span>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-table-action"
                                            onClick={() => setIsShiftModalOpen(true)}
                                            style={{ background: '#3b82f6' }}
                                        >
                                            Cerrar caja
                                        </button>
                                        <button 
                                            className="btn-text" 
                                            style={{ marginLeft: 10, fontSize: '0.85rem' }}
                                            onClick={() => { setViewingShift(activeShift); }}
                                        >
                                            Ver detalles
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan="7">
                                        <div className="table-empty-state">
                                            <span>No hay cajas abiertas actualmente.</span>
                                            <button className="btn btn-primary" onClick={() => setIsShiftModalOpen(true)}>
                                                + Abrir caja
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* SECCIÓN CERRADAS */}
            <section className="cash-section">
                <h3 className="cash-section-title">Cerradas</h3>
                
                {/* Filtros */}
                <div className="cash-filters-bar">
                    <div className="filter-input-group">
                        <Calendar size={16} style={{ marginRight: 8, color: '#6b7280' }} />
                        <select 
                            style={{ border: 'none', outline: 'none', background: 'transparent', color: '#333' }}
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value)}
                        >
                            <option value="7">Últimos 7 días</option>
                            <option value="30">Últimos 30 días</option>
                            <option value="90">Últimos 3 meses</option>
                        </select>
                    </div>
                    
                    <div className="filter-input-group">
                        <select style={{ border: 'none', outline: 'none', background: 'transparent', color: '#333' }}>
                            <option value="all">Todas las cajas</option>
                            <option value="main">Caja Principal</option>
                        </select>
                    </div>
                </div>

                <div className="cash-table-container">
                    <table className="cash-table">
                        <thead>
                            <tr>
                                <th>FECHA DE APERTURA <Info size={14} className="info-icon" /></th>
                                <th>FECHA DE CIERRE <Info size={14} className="info-icon" /></th>
                                <th>CAJA <Info size={14} className="info-icon" /></th>
                                <th>INFORMACIÓN DEL SISTEMA <Info size={14} className="info-icon" /></th>
                                <th>CONTEO MANUAL <Info size={14} className="info-icon" /></th>
                                <th>DIFERENCIA <Info size={14} className="info-icon" /></th>
                                <th>ESTADO <Info size={14} className="info-icon" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingHistory ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30 }}>Cargando historial...</td></tr>
                            ) : pastShifts.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30 }}>No hay historial disponible.</td></tr>
                            ) : (
                                pastShifts.map(shift => {
                                    const diff = shift.difference || (shift.actual_balance - shift.expected_balance);
                                    return (
                                        <tr key={shift.id} onClick={() => setViewingShift(shift)} style={{ cursor: 'pointer' }} className="hover:bg-gray-50">
                                            <td>
                                                {new Date(shift.opened_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} {' '}
                                                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                                    {new Date(shift.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td>
                                                {new Date(shift.closed_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} {' '}
                                                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                                    {new Date(shift.closed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td>Caja Principal</td>
                                            <td>${shift.expected_balance?.toLocaleString('es-CL')}</td>
                                            <td>${shift.actual_balance?.toLocaleString('es-CL')}</td>
                                            <td>
                                                <span className={diff >= 0 ? 'diff-positive' : 'diff-negative'}>
                                                    {diff >= 0 ? '+' : ''}${diff?.toLocaleString('es-CL')}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="status-badge closed">Cerrada</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
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
                getTotals={getTotals} // Pasamos getTotals por si se necesita recalcular
            />
        </div>
    );
};

export default CashManager;
