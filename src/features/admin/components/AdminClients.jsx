import React, { useState, useMemo } from 'react';
import { Search, Plus, Download, Filter, MoreVertical, User, ShoppingBag, FileText, ArrowUpDown, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import ClientFormModal from './ClientFormModal';
import '../styles/AdminClients.css';
import { downloadExcel } from '../../../shared/utils/exportUtils';

const AdminClients = ({ clients, orders, onSelectClient, onClientCreated, showNotify }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, elite, top, frequent
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // --- ESTADOS DE TABLA AVANZADA ---
    const [sortConfig, setSortConfig] = useState({ key: 'last_order_at', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Calcular métricas derivadas por cliente usando orders
    const enrichedClients = useMemo(() => {
        if (!Array.isArray(clients)) return [];
        const safeOrders = Array.isArray(orders) ? orders : [];
        
        // [OPTIMIZACIÓN] Crear un mapa indexado por client_id (O(N))
        // Esto evita recorrer todo el array de orders dentro del map de clientes (O(N^2))
        const ordersMap = safeOrders.reduce((acc, o) => {
            if (o.status === 'cancelled') return acc; // Ignorar cancelados globalmente
            if (!acc[o.client_id]) acc[o.client_id] = [];
            acc[o.client_id].push(o);
            return acc;
        }, {});

        return clients.map(client => {
            // Acceso directo O(1) en lugar de filter O(N)
            const clientOrders = ordersMap[client.id] || [];
            
            // [FIX MULTI-SUCURSAL] Usar datos GLOBALES de la DB para segmento y fidelidad
            // Si usamos solo 'clientOrders' (que puede estar filtrado por sucursal), 
            // un cliente VIP parecería nuevo en otra sucursal.
            const globalTotalOrders = client.total_orders || clientOrders.length;
            const globalTotalSpent = client.total_spent || clientOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            
            const fidelityPoints = Math.floor(globalTotalSpent / 1000); // 1 punto por cada $1000
            
            // Segmento
            let segment = 'none';
            if (globalTotalOrders >= 20) segment = 'elite';
            else if (globalTotalOrders >= 10) segment = 'top';
            else if (globalTotalOrders >= 5) segment = 'frequent';
            else if (globalTotalOrders > 0) segment = 'buyer';

            // Estado
            const lastDate = clientOrders.length > 0 
                ? Math.max(...clientOrders.map(o => new Date(o.created_at).getTime()))
                : (client.last_order_at ? new Date(client.last_order_at).getTime() : null);
                
            let status = 'inactive';
            if (lastDate) {
                const daysDiff = (new Date().getTime() - lastDate) / (1000 * 60 * 60 * 24);
                if (daysDiff < 30) status = 'active';
                else if (daysDiff < 60) status = 'risk';
                else if (daysDiff < 90) status = 'sleeping';
                else status = 'inactive';
            }

            return {
                ...client,
                totalOrders: globalTotalOrders, // Mostrar total histórico real
                total_orders: globalTotalOrders,
                total_spent: globalTotalSpent,
                fidelityPoints,
                segment,
                status,
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

    // --- ORDENAMIENTO (SORTING) ---
    const sortedClients = useMemo(() => {
        const sorted = [...filteredClients];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Manejo de nulos
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';

                // Manejo específico de fechas y strings
                if (sortConfig.key === 'last_order_at') {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                } else if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredClients, sortConfig]);

    // --- PAGINACIÓN ---
    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedClients.slice(start, start + itemsPerPage);
    }, [sortedClients, currentPage]);

    const totalPages = Math.ceil(sortedClients.length / itemsPerPage);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

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

    const handleExportCSV = () => {
        if (filteredClients.length === 0) {
            showNotify('No hay clientes para exportar', 'info');
            return;
        }

        const dataToExport = filteredClients.map(c => ({
            Nombre: c.name || 'Sin Nombre',
            Teléfono: c.phone || '',
            Email: c.email || '',
            RUT: c.rut || '',
            'Total Pedidos': c.totalOrders || 0,
            'Total Gastado ($)': c.total_spent || 0,
            'Puntos Fidelity': c.fidelityPoints || 0,
            Segmento: c.segment || 'none',
            Estado: c.status || 'inactive'
        }));

        downloadExcel(dataToExport, `Clientes_CRM_${new Date().toISOString().split('T')[0]}.xls`);
        showNotify('Base de clientes exportada', 'success');
    };

    // Helper para abrir WhatsApp
    const openWhatsApp = (e, phone) => {
        e.stopPropagation();
        if (!phone) return;
        // Limpiar teléfono (dejar solo números)
        const cleanPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;
        window.open(`https://wa.me/${finalPhone}`, '_blank');
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
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    
                    <button className="btn-icon-text btn-white" onClick={handleExportCSV}>
                        <Download size={18} /> Exportar CSV
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
                    onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
                >
                    Todo
                </button>
                <button 
                    className={`filter-chip ${activeFilter === 'elite' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter('elite'); setCurrentPage(1); }}
                >
                    Comprador Élite
                </button>
                <button 
                    className={`filter-chip ${activeFilter === 'top' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter('top'); setCurrentPage(1); }}
                >
                    Comprador Top
                </button>
                <button 
                    className={`filter-chip ${activeFilter === 'frequent' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter('frequent'); setCurrentPage(1); }}
                >
                    Comprador Frecuente
                </button>
                <div className="clients-total-count">
                    Total: {filteredClients.length}
                </div>
            </div>

            {/* TABLA */}
            <div className="clients-table-container">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')} className="sortable-th">
                                CLIENTE {sortConfig.key === 'name' && <ArrowUpDown size={12} />}
                            </th>
                            <th className="hide-mobile">CANAL</th>
                            <th onClick={() => handleSort('fidelityPoints')} className="sortable-th text-center">
                                PUNTOS {sortConfig.key === 'fidelityPoints' && <ArrowUpDown size={12} />}
                            </th>
                            <th onClick={() => handleSort('totalOrders')} className="sortable-th text-center">
                                PEDIDOS {sortConfig.key === 'totalOrders' && <ArrowUpDown size={12} />}
                            </th>
                            <th onClick={() => handleSort('total_spent')} className="sortable-th text-center">
                                GASTO TOTAL {sortConfig.key === 'total_spent' && <ArrowUpDown size={12} />}
                            </th>
                            <th onClick={() => handleSort('last_order_at')} className="sortable-th">
                                ÚLTIMA VEZ {sortConfig.key === 'last_order_at' && <ArrowUpDown size={12} />}
                            </th>
                            <th>SEGMENTO</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedClients.map(client => (
                            <tr key={client.id} onClick={() => onSelectClient && onSelectClient(client)} style={{ cursor: 'pointer' }}>
                                <td data-label="Cliente">
                                    <div className="client-info-cell">
                                        <h4>{client.name || 'Sin Nombre'}</h4>
                                        <div className="client-contact-row">
                                            <span>{client.phone}</span>
                                            {client.phone && (
                                                <button 
                                                    onClick={(e) => openWhatsApp(e, client.phone)}
                                                    className="btn-icon-xs"
                                                    title="Abrir WhatsApp"
                                                >
                                                    <MessageCircle size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {client.email && <span className="client-email">{client.email}</span>}
                                    </div>
                                </td>
                                <td className="hide-mobile" data-label="Canal">
                                    <span style={{ fontWeight: '500' }}>
                                        {client.source === 'pos' ? 'PDV' : 'Menú digital'}
                                    </span>
                                </td>
                                <td className="text-center" data-label="Puntos">
                                    <span className="points-badge">
                                        ⭐ {client.fidelityPoints}
                                    </span>
                                </td>
                                <td className="text-center" data-label="Pedidos">
                                    <span className="text-lg font-bold">{client.totalOrders}</span>
                                </td>
                                <td className="text-center" data-label="Gasto Total">
                                    <span className="text-success font-semibold">
                                        ${client.total_spent.toLocaleString('es-CL')}
                                    </span>
                                </td>
                                <td data-label="Última vez">
                                    <div className="text-sm text-gray-400">
                                        {client.last_order_at ? new Date(client.last_order_at).toLocaleDateString('es-CL') : '-'}
                                    </div>
                                    <div className="text-xs opacity-60">
                                        {getStatusIndicator(client.status)}
                                    </div>
                                </td>
                                <td data-label="Segmento">
                                    {getSegmentBadge(client.segment)}
                                </td>
                                <td className="actions-cell">
                                    <button className="btn-icon-text">
                                        <MoreVertical size={18} color="#9ca3af" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <span className="pagination-info">
                        Página {currentPage} de {totalPages}
                    </span>
                    <div className="pagination-buttons">
                        <button className="btn-icon-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            <ChevronLeft size={18} />
                        </button>
                        <button className="btn-icon-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

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
