import React from 'react';
import { X, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import '../../styles/AdminClientsTable.css';

const ClientDetailsPanel = ({
    selectedClient,
    setSelectedClient,
    clientHistoryLoading,
    selectedClientOrders,
    setReceiptModalOrder
}) => {
    if (!selectedClient) return null;

    return (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
            <div className="admin-side-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>
                <div className="admin-side-header">
                    <div className="flex-column">
                        <h3 className="m-0">{selectedClient.name}</h3>
                        <span className="text-sm text-muted">RUT: {selectedClient.rut}</span>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="btn-close-sidepanel">
                        <X size={24} />
                    </button>
                </div>

                <div className="admin-side-body">
                    <div className="kpi-grid panel-kpi">
                        <div className="kpi-card side-kpi">
                            <span className="kpi-label">GASTO TOTAL</span>
                            <span className="kpi-value text-accent-success">
                                ${(selectedClient.total_spent || 0).toLocaleString('es-CL')}
                            </span>
                        </div>
                        <div className="kpi-card side-kpi">
                            <span className="kpi-label">PEDIDOS</span>
                            <span className="kpi-value">{selectedClient.total_orders || 0}</span>
                        </div>
                    </div>

                    <h4 className="section-title text-accent-secondary">Historial</h4>

                    {clientHistoryLoading ? (
                        <div className="flex-center p-20">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <div className="history-list">
                            {selectedClientOrders.length === 0 ? (
                                <p className="text-center opacity-60">Sin compras registradas con este ID.</p>
                            ) : (
                                selectedClientOrders.map(order => (
                                    <div key={order.id} className="history-card">
                                        <div className="history-card-top">
                                            <span className="text-muted">
                                                {new Date(order.created_at).toLocaleDateString('es-CL')}
                                            </span>
                                            <span className="fw-700">
                                                ${order.total.toLocaleString('es-CL')}
                                            </span>
                                        </div>

                                        <div className="history-items-text">
                                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                        </div>

                                        <div className="history-card-footer">
                                            <span className={`status-badge ${order.status === 'completed' || order.status === 'picked_up' ? 'active' : 'paused'
                                                }`}>
                                                {order.status === 'picked_up'
                                                    ? 'Entregado'
                                                    : order.status === 'completed'
                                                        ? 'Completado'
                                                        : order.status === 'active'
                                                            ? 'En Cocina'
                                                            : order.status === 'canceled'
                                                                ? 'Cancelado'
                                                                : 'Pendiente'}
                                            </span>

                                            <div className="flex-center gap-8">
                                                {order.payment_ref && order.payment_ref.startsWith('http') ? (
                                                    <>
                                                        <a
                                                            href={order.payment_ref}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="receipt-link-sm"
                                                        >
                                                            <ImageIcon size={12} /> Ver Comprobante
                                                        </a>
                                                        <button
                                                            onClick={() => setReceiptModalOrder(order)}
                                                            className="btn-text-sm"
                                                        >
                                                            Cambiar
                                                        </button>
                                                    </>
                                                ) : order.payment_type === 'online' ? (
                                                    <button
                                                        onClick={() => setReceiptModalOrder(order)}
                                                        className="btn-upload-sm"
                                                    >
                                                        <Upload size={10} /> Agregar
                                                    </button>
                                                ) : null}
                                            </div>
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
