import React from 'react';
import { Clock, XCircle, Upload, ImageIcon, Printer, Crown, MessageCircle } from 'lucide-react';
import { formatTimeElapsed } from '../../../shared/utils/formatters';
import { printOrderTicket } from '../utils/receiptPrinting';
import logo from '../../../assets/logo.png';
import '../../../styles/OrderCard.css';

const OrderCard = ({ order, moveOrder, setReceiptModalOrder, branch, clients }) => {
    
    const handleMoveToKitchen = (e) => {
        e.stopPropagation();
        // 1. Imprimir Comanda
        printOrderTicket(order, branch?.name, logo);
        // 2. Mover a estado "active" (Cocinando)
        moveOrder(order.id, 'active');
    };

    const handleReprint = (e) => {
        e.stopPropagation();
        printOrderTicket(order, branch?.name, logo);
    };

    // Lógica VIP: Buscar cliente y verificar si tiene más de 5 pedidos
    const clientData = clients?.find(c => c.id === order.client_id);
    const isVip = clientData?.total_orders >= 5;

    return (
        <div className={`kanban-card glass animate-slide-up ${order.status === 'pending' ? 'urgent-pulse' : ''}`}>
            {/* ENCABEZADO */}
            <div className="card-header-row">
                <span className="order-time" title={new Date(order.created_at).toLocaleString()}>
                    <Clock size={14} /> 
                    {formatTimeElapsed(order.created_at)}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleReprint} className="btn-icon-xs" title="Imprimir Comanda" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ccc', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                        <Printer size={14} />
                    </button>
                <span className={`payment-badge ${order.payment_type === 'online' ? 'online' : ''}`}>
                    {order.payment_type === 'online' ? 'Transf.' : (order.payment_type === 'tarjeta' ? 'Tarjeta' : 'Efectivo')}
                </span>
                </div>
            </div>

            {/* CLIENTE */}
            <div className="card-client">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h4>{order.client_name}</h4>
                    {isVip && (
                        <span title={`Cliente VIP (${clientData.total_orders} pedidos)`} style={{ background: '#ffd700', color: '#000', borderRadius: '4px', padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                            <Crown size={12} fill="black" />
                        </span>
                    )}
                </div>
                {(order.client_phone || order.client_rut) && (
                    <div className="client-phone">
                        {order.client_phone && (
                            <a 
                                href={`https://wa.me/${order.client_phone.replace(/\D/g,'')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                                title="Abrir WhatsApp"
                            >
                                <MessageCircle size={12} /> {order.client_phone}
                            </a>
                        )}
                        {order.client_phone && order.client_rut && <span style={{opacity: 0.3}}>|</span>}
                        {order.client_rut && <span>{order.client_rut}</span>}
                    </div>
                )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />

            {/* PRODUCTOS (Ticket list) */}
            <div className="card-items">
        {order.items.map((item, idx) => (
            <div key={idx} className="order-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="qty-circle">{item.quantity}</span>
                    <span className="item-name">{item.name}</span>
                </div>
                {item.description && (
                    <span style={{ fontSize: '0.8rem', color: '#60a5fa', marginLeft: '32px', fontStyle: 'italic', marginBottom: '4px' }}>
                        Detalle: {item.description}
                    </span>
                )}
            </div>
        ))}
            </div>

            {/* NOTAS */}
            {order.note && (
                <div className="card-note">
                    <span style={{ fontWeight: 800, marginRight: '4px' }}>NOTA:</span>
                    {order.note}
                </div>
            )}

            {/* COMPROBANTE DE TRANSFERENCIA */}
            {order.payment_type === 'online' && (
                <div className="receipt-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {order.payment_ref && order.payment_ref.startsWith('http') ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <a href={order.payment_ref} target="_blank" rel="noreferrer" className="receipt-link" style={{ flex: 1, textDecoration: 'none' }}>
                                <ImageIcon size={14} /> Ver Comprobante
                            </a>
                            <button onClick={() => setReceiptModalOrder(order)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '8px', padding: '0 12px' }}>
                                Cambiar
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setReceiptModalOrder(order)} className="receipt-link" style={{ background: 'rgba(230, 57, 70, 0.1)', color: '#e63946', border: '1px solid rgba(230, 57, 70, 0.2)', width: '100%', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                            <Upload size={14} /> Adjuntar Comprobante
                        </button>
                    )}
                </div>
            )}

            {/* TOTAL */}
            <div className="card-total">
                <span className="total-label" style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '2px', fontWeight: 700 }}>TOTAL</span>
                <span className="total-amount" style={{ fontSize: '1.4rem' }}>${order.total.toLocaleString('es-CL')}</span>
            </div>

            {/* ACCIONES KANBAN */}
            <div className="card-actions" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {order.status === 'pending' && (
                    <>
                        <button onClick={() => moveOrder(order.id, 'cancelled')} className="btn-icon-action cancel" style={{ flex: '0 0 50px' }} title="Cancelar Pedido">
                            <XCircle size={22} />
                        </button>
                        <button onClick={handleMoveToKitchen} className="btn-action primary" style={{ flex: 1 }}>
                            A Cocina
                        </button>
                    </>
                )}
                {order.status === 'active' && <button onClick={() => moveOrder(order.id, 'completed')} className="btn-action success" style={{ width: '100%', margin: 0 }}>Pedido Listo</button>}
                {order.status === 'completed' && <button onClick={() => moveOrder(order.id, 'picked_up')} className="btn-action" style={{ background: '#38bdf8', color: '#fff', width: '100%', margin: 0 }}>Entregado al Cliente</button>}
            </div>
        </div>
    );
};

export default OrderCard;
