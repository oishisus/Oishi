import React, { useState, useEffect } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, FileText, CreditCard, DollarSign } from 'lucide-react';

const CashMovementModal = ({ isOpen, onClose, type, onConfirm }) => {
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        paymentMethod: 'cash'
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData({
                amount: '',
                description: '',
                paymentMethod: 'cash'
            });
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const numAmount = parseFloat(formData.amount);
        
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Ingresa un monto válido');
            return;
        }

        if (!formData.description.trim()) {
            setError('La descripción es obligatoria');
            return;
        }

        onConfirm(type, numAmount, formData.description, formData.paymentMethod);
        onClose();
    };

    const isIncome = type === 'income';

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="modal-content" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isIncome ? <ArrowUpCircle className="text-accent" size={24} /> : <ArrowDownCircle className="text-danger" size={24} />}
                        <h3 className="fw-700">{isIncome ? 'Registrar Ingreso' : 'Registrar Egreso'}</h3>
                    </div>
                    <button onClick={onClose} className="btn-close"><X size={24} /></button>
                </header>

                <form onSubmit={handleSubmit} style={{ padding: '20px 0' }}>
                    <div className="modal-form">
                        
                        <div className="form-group">
                            <label>Monto</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontWeight: 700 }}>$</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ paddingLeft: 30 }}
                                    placeholder="0"
                                    autoFocus
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descripción / Motivo</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-secondary)' }}>
                                    <FileText size={16} />
                                </span>
                                <textarea
                                    className="form-input"
                                    style={{ paddingLeft: 35, minHeight: 80, resize: 'none' }}
                                    placeholder={isIncome ? "Ej: Aporte extra, Ajuste..." : "Ej: Compra de cilantro, Pago gas..."}
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Método</label>
                            <div className="payment-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <button 
                                    type="button" 
                                    className={`btn btn-secondary ${formData.paymentMethod === 'cash' ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                                    style={{ borderColor: formData.paymentMethod === 'cash' ? 'var(--accent-primary)' : '' }}
                                >
                                    <DollarSign size={16} style={{ marginRight: 6 }} /> Efectivo
                                </button>
                                <button 
                                    type="button" 
                                    className={`btn btn-secondary ${formData.paymentMethod === 'card' ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'card' }))}
                                    style={{ borderColor: formData.paymentMethod === 'card' ? 'var(--accent-primary)' : '' }}
                                >
                                    <CreditCard size={16} style={{ marginRight: 6 }} /> {isIncome ? 'Tarjeta/Transf' : 'Tarjeta'}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                                * Solo los movimientos en <b>Efectivo</b> afectan el arqueo de caja física. Las Transferencias y Tarjetas se registran como saldo digital.
                            </p>
                        </div>

                        {error && <div className="animate-fade" style={{ color: '#e63946', fontSize: '0.85rem', marginTop: 10, textAlign: 'center' }}>{error}</div>}
                    </div>

                    <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            Guardar Movimiento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CashMovementModal;
