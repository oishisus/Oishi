import React from 'react';
import '../../../styles/AdminClientsTable.css';

const AdminClientsTable = ({ clients, handleSelectClient }) => {
    return (
        <div className="clients-view glass animate-fade">
            <div className="admin-toolbar clients-toolbar-fix">
                {/* Toolbar provided by parent or included here? Parent has search box. 
            Actually, the search box was inside clients-view in Admin.jsx.
            Let's accept searchQuery as prop, but the input needs to be somewhere.
            In Admin.jsx, the input updates `searchQuery` state.
            So we should probably render the input inside Admin.jsx or here.
            Admin.jsx renders the search input. 
            Wait, Admin.jsx rendered:
            <div className="clients-view glass animate-fade">
                <div className="admin-toolbar" ...> <input ... /> </div>
                <table ...>
            </div>
            
            So I should include the toolbar if I want to encapsulate the view.
            But `setSearchQuery` is in Admin.jsx.
            I'll pass `onSearchChange` prop.
        */}
                {/* Wait, I'll just pass the filtered clients or the whole list?
            Admin.jsx passed `clients.filter(...)`.
            It's better to pass `clients` and `searchQuery` and let the component filter?
            Or pass filtered clients.
            Pass filtered clients is simpler for display.
            But the search box is part of the view.
        */}
            </div>
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
                    {clients.map(c => (
                        <tr key={c.id} onClick={() => handleSelectClient(c)} className="clickable-row">
                            <td data-label="Nombre"><b>{c.name}</b></td>
                            <td data-label="RUT">{c.rut || '-'}</td>
                            <td data-label="Teléfono">{c.phone}</td>
                            <td data-label="Último Pedido">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : 'N/A'}</td>
                            <td data-label="Total" className="client-total-amount">${(c.total_spent || 0).toLocaleString('es-CL')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminClientsTable;
