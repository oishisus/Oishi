import React, { useEffect } from 'react';
import { X, Loader2, Image as ImageIcon, Upload, Calendar, DollarSign, Package } from 'lucide-react';
import '../../../styles/AdminClientsTable.css';

const ClientDetailsPanel = ({
    selectedClient,
    setSelectedClient,
    clientHistoryLoading,
    selectedClientOrders,
    setReceiptModalOrder
}) => {
    
    // --- 1. CIERRE CON ESCAPE (UX) ---
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setSelectedClient(null);
        };
        if (selectedClient) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [selectedClient, setSelectedClient]);

    if (!selectedClient) return null;

    // --- 2. HELPERS DE RENDERIZADO (Limpieza) ---
    
    // Renderiza el botón de acción según estado del pago
    const renderPaymentAction = (order) => {
        if (order.payment_ref && order.payment_ref.startsWith('http')) {
            return (
                <div className="payment-actions">
                    <a 
                        href={order.payment_ref} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-link-icon"
                        title="Ver comprobante"
                    >
                        <ImageIcon size={14} /> <span>Ver</span>
                    </a>
                    <button 
                        onClick={() => setReceiptModalOrder(order)} 
                        className="btn-text-sm"
                    >
                        Cambiar
                    </button>
                </div>
            );
        }
        
        // Solo mostrar botón de subir si es pago online/transferencia
        if (order.payment_type === 'online' || order.payment_type === 'transfer') {
            return (
                <button 
                    onClick={() => setReceiptModalOrder(order)} 
                    className="btn-upload-sm"
                >
                    <Upload size={12} /> <span>Subir</span>
                </button>
            );
        }
        
        return null; // Pago efectivo/tarjeta presencial no requiere comprobante
    };

    // Formateo seguro de fecha
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('es-CL', {
                day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Fecha inválida';
        }
    };

    // Badge de estado
    const getStatusBadge = (status) => {
        const statusMap = {
            'picked_up': { label: 'Entregado', class: 'success' },
            'completed': { label: 'Completado', class: 'success' },
            'active': { label: 'En Cocina', class: 'warning' },
            'cancelled': { label: 'Cancelado', class: 'danger' },
            'pending': { label: 'Pendiente', class: 'neutral' }
        };
        const config = statusMap[status] || statusMap['pending'];
        
        return <span className={`status-badge ${config.class}`}>{config.label}</span>;
    };

    return (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
            <div 
                className="admin-side-panel glass animate-slide-in-right" 
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* HEADER */}
                <div className="admin-side-header">
                    <div className="client-profile">
                        <div className="avatar-placeholder">
                            {selectedClient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="client-info">
                            <h3 className="client-name">{selectedClient.name}</h3>
                            <div className="client-meta">
                                <span className="meta-tag">RUT: {selectedClient.rut || 'N/A'}</span>
                                {selectedClient.phone && <span className="meta-tag">{selectedClient.phone}</span>}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedClient(null)} 
                        className="btn-close-sidepanel"
                        aria-label="Cerrar panel"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* BODY */}
                <div className="admin-side-body">
                    
                    {/* KPIs */}
                    <div className="kpi-grid panel-kpi">
                        <div className="kpi-card side-kpi">
                            <div className="kpi-icon-sm"><DollarSign size={16}/></div>
                            <div>
                                <span className="kpi-label">GASTO TOTAL</span>
                                <span className="kpi-value text-accent-success">
                                    ${(selectedClient.total_spent || 0).toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
                        <div className="kpi-card side-kpi">
                            <div className="kpi-icon-sm"><Package size={16}/></div>
                            <div>
                                <span className="kpi-label">PEDIDOS</span>
                                <span className="kpi-value">{selectedClient.total_orders || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="section-divider">
                        <h4 className="section-title">Historial de Compras</h4>
                    </div>

                    {clientHistoryLoading ? (
                        <div className="loading-state">
                            <Loader2 className="animate-spin" size={32} />
                            <span>Cargando historial...</span>
                        </div>
                    ) : (
                        <div className="history-list">
                            {selectedClientOrders.length === 0 ? (
                                <div className="empty-state">
                                    <Package size={40} className="opacity-20" />
                                    <p>No hay compras registradas</p>
                                </div>
                            ) : (
                                selectedClientOrders.map(order => (
                                    <div key={order.id} className="history-card">
                                        
                                        <div className="history-card-header">
                                            <div className="date-badge">
                                                <Calendar size={12} />
                                                {formatDate(order.created_at)}
                                            </div>
                                            <span className="order-total">
                                                ${order.total.toLocaleString('es-CL')}
                                            </span>
                                        </div>

                                        <div className="history-items">
                                            {order.items.map((item, idx) => (
                                                <span key={idx} className="item-pill">
                                                    <b>{item.quantity}x</b> {item.name}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="history-card-footer">
                                            {getStatusBadge(order.status)}
                                            {renderPaymentAction(order)}
                                        </div>
                                        
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientDetailsPanel;