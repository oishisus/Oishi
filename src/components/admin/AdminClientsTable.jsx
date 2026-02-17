import React, { useState } from 'react';
import { Search } from 'lucide-react';
import '../../styles/AdminClientsTable.css';

const AdminClientsTable = ({ clients, handleSelectClient }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredClients = clients.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (c.rut && c.rut.includes(searchQuery)) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    return (
        <div className="clients-view glass animate-fade">
            <div className="admin-toolbar" style={{ marginBottom: 20 }}>
                <div className="search-box" style={{ maxWidth: 300 }}>
                    <Search size={18} />
                    <input 
                        placeholder="Buscar cliente (Nombre, RUT, Tel)..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="form-input"
                    />
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>RUT</th>
                            <th>Teléfono</th>
                            <th>Último Pedido</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(c => (
                            <tr key={c.id} onClick={() => handleSelectClient(c)} className="clickable-row">
                                <td data-label="Nombre"><b>{c.name}</b></td>
                                <td data-label="RUT">{c.rut || '-'}</td>
                                <td data-label="Teléfono">{c.phone}</td>
                                <td data-label="Último Pedido">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : 'N/A'}</td>
                                <td data-label="Total" className="client-total-amount">${(c.total_spent || 0).toLocaleString('es-CL')}</td>
                            </tr>
                        ))}
                        {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
                                    No se encontraron clientes
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminClientsTable;
