import React, { useState, useMemo } from 'react';
import { Search, Plus, Download, Filter, MoreVertical, User, ShoppingBag, FileText } from 'lucide-react';
import ClientFormModal from './ClientFormModal';
import '../styles/AdminClients.css';

const AdminClients = ({ clients, orders, onSelectClient, onClientCreated, showNotify }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, elite, top, frequent
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Calcular métricas derivadas por cliente usando orders
    const enrichedClients = useMemo(() => {
        if (!clients) return [];
        
        return clients.map(client => {
            // Si ya vienen calculados en la DB mejor, si no cruzamos con orders
            // Asumimos que orders viene completo o filtramos
            // Si orders es muy grande, esto podría ser lento.
            // Admin.jsx pasa 'orders' (todos).
            // Optimización: Crear mapa de conteo de ordenes por cliente primero
            // Pero por ahora map directo si no son miles.
            
            const clientOrders = orders ? orders.filter(o => o.client_id === client.id) : [];
            const totalOrders = clientOrders.length; // O usar client.orders_count si existe
            
            // Segmento
            let segment = 'none';
            if (totalOrders > 20) segment = 'elite';
            else if (totalOrders > 10) segment = 'top';
            else if (totalOrders > 5) segment = 'frequent';
            else if (totalOrders > 0) segment = 'buyer';

            // Estado
            let status = 'inactive';
            if (client.last_order_at) {
                const daysDiff = (new Date() - new Date(client.last_order_at)) / (1000 * 60 * 60 * 24);
                if (daysDiff < 30) status = 'active';
                else if (daysDiff < 60) status = 'risk';
                else if (daysDiff < 90) status = 'sleeping';
                else status = 'inactive';
            } else {
                status = 'inactive'; // Sin pedidos
            }

            return {
                ...client,
                totalOrders,
                segment,
                status,
                // Si la DB no trae total_spent actualizado, se podría recalcular aquí
            };
        });
    }, [clients, orders]);

    // Filtrar
    const filteredClients = useMemo(() => {
        return enrichedClients.filter(client => {
            // Texto
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                (client.name || '').toLowerCase().includes(searchLower) ||
                (client.phone || '').includes(searchLower) ||
                (client.email || '').toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;

            // Tabs
            if (activeFilter === 'all') return true;
            if (activeFilter === 'elite') return client.segment === 'elite';
            if (activeFilter === 'top') return client.segment === 'top';
            if (activeFilter === 'frequent') return client.segment === 'frequent' || client.segment === 'buyer'; // Agrupar?
            // La referencia tenía: Elite, Top, Frecuente
            if (activeFilter === 'frequent_only') return client.segment === 'frequent';

            return true;
        });
    }, [enrichedClients, searchTerm, activeFilter]);


    const getSegmentBadge = (segment) => {
        switch(segment) {
            case 'elite': return <span className="segment-badge segment-elite">Comprador Élite</span>;
            case 'top': return <span className="segment-badge segment-top">Comprador Top</span>;
            case 'frequent': return <span className="segment-badge segment-frequent">Comprador Frecuente</span>;
            case 'buyer': return <span className="segment-badge segment-buyer">Comprador</span>;
            default: return <span className="segment-badge segment-none">Sin pedidos</span>;
        }
    };

    const getStatusIndicator = (status) => {
        switch(status) {
            case 'active': return <div className="status-indicator"><div className="dot active"></div> Activo</div>;
            case 'risk': return <div className="status-indicator"><div className="dot risk"></div> En riesgo</div>;
            case 'sleeping': return <div className="status-indicator"><div className="dot sleeping"></div> Durmiendo</div>;
            default: return <div className="status-indicator"><div className="dot inactive"></div> Inactivo</div>;
        }
    };

    return (
        <div className="clients-container animate-fade">
            
            {/* HEADER */}
            <div className="clients-header">
                <div className="clients-title">
                    <h1>Clientes</h1>
                </div>
                
                <div className="clients-actions">
                    <div className="search-box">
                        <Search size={18} color="#9ca3af" />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button className="btn-icon-text btn-white">
                        <Download size={18} /> Importar/ Exportar
                    </button>
                    
                    <button className="btn btn-primary btn-icon-text" onClick={() => setIsFormOpen(true)}>
                        <Plus size={18} /> Nuevo cliente
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="clients-filters">
                <div className="filter-btn-trigger">
                    <Filter size={18} /> Filtro
                </div>
                <button 
                    className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    Todo
                </button>
                <button 
                    className={`filter-chip ${activeFilter === 'elite' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('elite')}
                >
                    Comprador Élite
                </button>
                <button 
                    className={`filter-chip ${activeFilter === 'top' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('top')}
                >
                    Comprador Top
                </button>
                <button 
                    className={`filter-chip ${activeFilter === 'frequent' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('frequent')}
                >
                    Comprador Frecuente
                </button>
                <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#9ca3af' }}>
                    Total de clientes: {filteredClients.length}
                </div>
            </div>

            {/* TABLA */}
            <div className="clients-table-container">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>CLIENTE</th>
                            <th>CANAL DE REGISTRO</th>
                            <th>PUNTOS DE FIDELIDAD</th>
                            <th>TOTAL DE PEDIDOS</th>
                            <th>SEGMENTO DE CLIENTE</th>
                            <th>ESTADO DE CLIENTE</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => (
                            <tr key={client.id} onClick={() => onSelectClient && onSelectClient(client)} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div className="client-info-cell">
                                        <h4>{client.name || 'Sin Nombre'}</h4>
                                        <span>{client.phone}</span>
                                        {client.email && <span style={{ display: 'block', fontSize: '0.75rem' }}>{client.email}</span>}
                                    </div>
                                </td>
                                <td>
                                    {/* Simulado o real si tenemos source */}
                                    {client.source === 'pos' ? 'PDV' : 'Menú digital'}
                                </td>
                                <td>
                                    <span className="points-badge">
                                        0 {/* Placeholder */}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {client.totalOrders}
                                </td>
                                <td>
                                    {getSegmentBadge(client.segment)}
                                </td>
                                <td>
                                    {getStatusIndicator(client.status)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-icon-text" style={{ padding: 5 }}>
                                        <MoreVertical size={18} color="#9ca3af" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ClientFormModal 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onClientCreated={onClientCreated}
                showNotify={showNotify}
            />

        </div>
    );
};

export default AdminClients;
