import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, Calculator, AlertTriangle } from 'lucide-react';

const CashShiftModal = ({ isOpen, onClose, type, onConfirm, activeShift }) => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAmount('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount) || numAmount < 0) {
            setError('Ingresa un monto válido');
            return;
        }

        onConfirm(numAmount);
        onClose();
    };

    const isOpening = type === 'open';

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isOpening ? <Unlock className="text-accent" size={24} /> : <Lock className="text-danger" size={24} />}
                        <h3 className="fw-700">{isOpening ? 'Apertura de Caja' : 'Cierre de Caja'}</h3>
                    </div>
                    <button onClick={onClose} className="btn-close"><X size={24} /></button>
                </header>

                <form onSubmit={handleSubmit} style={{ padding: '20px 0' }}>
                    <div className="modal-form">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                            {isOpening 
                                ? 'Ingresa el monto inicial con el que empiezas el turno (Base de caja).'
                                : 'Ingresa el monto total de efectivo físico que hay en la caja al finalizar el turno.'}
                        </p>

                        {!isOpening && activeShift && (
                            <div className="glass" style={{ padding: 15, borderRadius: 12, marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Efectivo Esperado:</span>
                                    <span className="fw-700">${activeShift.expected_balance.toLocaleString('es-CL')}</span>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    (Base + Ingresos en efectivo - Egresos en efectivo)
                                </p>
                            </div>
                        )}

                        <div className="form-group">
                            <label>{isOpening ? 'Monto Inicial' : 'Total Efectivo Físico'}</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontWeight: 700 }}>$</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ paddingLeft: 30 }}
                                    placeholder="0"
                                    autoFocus
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <span style={{ color: '#e63946', fontSize: '0.8rem', marginTop: 5, display: 'block' }}>{error}</span>}
                        </div>

                        {!isOpening && amount && (
                            <div className="animate-fade" style={{ marginTop: 15, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {parseFloat(amount) === activeShift?.expected_balance ? (
                                    <div style={{ color: '#25d366', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Calculator size={16} /> <span>Caja cuadrada perfectamente</span>
                                    </div>
                                ) : (
                                    <div style={{ 
                                        color: parseFloat(amount) > activeShift?.expected_balance ? '#25d366' : '#f4a261', 
                                        fontSize: '0.85rem', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 8 
                                    }}>
                                        <AlertTriangle size={16} /> 
                                        <span>
                                            {parseFloat(amount) > activeShift?.expected_balance ? 'Sobrante: ' : 'Faltante: '}
                                            ${ Math.abs(parseFloat(amount) - activeShift?.expected_balance).toLocaleString('es-CL') }
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button type="submit" className={`btn ${isOpening ? 'btn-primary' : 'btn-danger'}`} style={{ flex: 1 }}>
                            {isOpening ? 'Abrir Caja' : 'Cerrar Turno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CashShiftModal;
