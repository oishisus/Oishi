import React from 'react';
import { Clock, XCircle, Upload, ImageIcon } from 'lucide-react';
import { formatTimeElapsed } from '../../../shared/utils/formatters';
import '../../../styles/OrderCard.css';

const OrderCard = ({ order, moveOrder, setReceiptModalOrder }) => {
    return (
        <div className={`kanban-card glass animate-slide-up ${order.status === 'pending' ? 'urgent-pulse' : ''}`}>
            <div className="card-header-row">
                <span className="order-time"><Clock size={12} /> {formatTimeElapsed(order.created_at)}</span>
                <span className="payment-badge">{order.payment_type === 'online' ? 'Transf.' : 'Efectivo'}</span>
            </div>
            <div className="card-client">
                <h4>{order.client_name}</h4>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{order.client_rut}</div>
            </div>
            <div className="card-items">
                {order.items.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                        <span className="qty-circle">{item.quantity}</span>
                        <span className="item-name">{item.name}</span>
                    </div>
                ))}
            </div>
            {order.note && <div className="card-note">📝 {order.note}</div>}

            {/* COMPROBANTE */}
            {order.payment_type === 'online' && (
                <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    {order.payment_ref && order.payment_ref.startsWith('http') ? (
                        <>
                            <a href={order.payment_ref} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', fontSize: '0.8rem', textDecoration: 'none' }}>
                                <ImageIcon size={14} /> Ver Comprobante
                            </a>
                            <button onClick={() => setReceiptModalOrder(order)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                Cambiar
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setReceiptModalOrder(order)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                            <Upload size={12} /> Agregar Comprobante
                        </button>
                    )}
                </div>
            )}

            <div className="card-total">Total: ${order.total.toLocaleString('es-CL')}</div>
            <div className="card-actions">
                {order.status === 'pending' && (
                    <>
                        <button onClick={() => moveOrder(order.id, 'cancelled')} className="btn-icon-action cancel"><XCircle size={20} /></button>
                        <button onClick={() => moveOrder(order.id, 'active')} className="btn-action primary">A Cocina</button>
                    </>
                )}
                {order.status === 'active' && <button onClick={() => moveOrder(order.id, 'completed')} className="btn-action success">Listo</button>}
                {order.status === 'completed' && <button onClick={() => moveOrder(order.id, 'picked_up')} className="btn-action info">Entregado</button>}
            </div>
        </div>
    );
};

export default OrderCard;
