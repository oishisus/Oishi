import React from 'react';
import '../../../styles/AdminClientsTable.css';

const AdminHistoryTable = ({ orders }) => {
    return (
        <div className="history-view glass animate-fade">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(o => (
                        <tr key={o.id}>
                            <td data-label="Fecha">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td data-label="Cliente">{o.client_name}</td>
                            <td data-label="Estado">
                                <span className={`status-pill ${o.status}`}>
                                    {o.status === 'picked_up' ? 'Entregado' : (o.status === 'cancelled' ? 'Cancelado' : 'Cancelado')}
                                </span>
                            </td>
                            <td data-label="Total">${o.total.toLocaleString('es-CL')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminHistoryTable;
