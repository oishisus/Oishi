import React from 'react';
import '../../styles/AdminClientsTable.css';

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
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>{o.client_name}</td>
                            <td>
                                <span className={`status-pill ${o.status}`}>
                                    {o.status === 'picked_up' ? 'Entregado' : 'Cancelado'}
                                </span>
                            </td>
                            <td>${o.total.toLocaleString('es-CL')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminHistoryTable;
