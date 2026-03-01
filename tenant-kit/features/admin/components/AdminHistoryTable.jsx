import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, DollarSign, Package, ChevronDown, ChevronUp, Clock, CreditCard, Receipt, Upload, Eye } from 'lucide-react';
import '../../../styles/AdminClientsTable.css';

const AdminHistoryTable = ({ orders, setReceiptModalOrder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (id) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = 
                String(o.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                String(o.client_phone || '').includes(searchTerm);
            
            const matchesStatus = filterStatus === 'all' || o.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, filterStatus]);

    const getStatusConfig = (status) => {
        const statusMap = {
            'picked_up': { label: 'Entregado', className: 'success' },
            'completed': { label: 'Completado', className: 'success' },
            'active': { label: 'En Cocina', className: 'warning' },
            'cancelled': { label: 'Cancelado', className: 'danger' },
            'pending': { label: 'Pendiente', className: 'neutral' }
        };
        return statusMap[status] || { label: status, className: 'neutral' };
    };

    return (
        <div className="history-view glass animate-fade">
            
            {/* HERRAMIENTAS DE HISTORIAL */}
            <div className="clients-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div className="clients-title">
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Historial Completo</h2>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{filteredOrders.length} pedidos encontrados</p>
                </div>
                
                <div className="clients-actions">
                    <div className="search-box">
                        <Search size={18} color="#9ca3af" />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente o teléfono..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="select-wrapper">
                        <Filter size={16} />
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="all" style={{color: 'black'}}>Todos los estados</option>
                            <option value="completed" style={{color: 'black'}}>Completados</option>
                            <option value="picked_up" style={{color: 'black'}}>Entregados</option>
                            <option value="cancelled" style={{color: 'black'}}>Cancelados</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* TABLA DE HISTORIAL */}
            <div className="history-table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>CLIENTE</th>
                            <th>ID.</th>
                            <th>FECHA Y HORA</th>
                            <th>TIPO PAGO</th>
                            <th>TOTAL</th>
                            <th>ESTADO</th>
                            <th style={{ textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                    No hay pedidos que coincidan con los filtros.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map(o => {
                                const st = getStatusConfig(o.status);
                                const isExpanded = expandedRows.has(o.id);
                                return (
                                    <React.Fragment key={o.id}>
                                        <tr className="clickable-row" onClick={() => toggleRow(o.id)} style={{ backgroundColor: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                            <td data-label="Cliente">
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: 'white', fontSize: '1rem' }}>{o.client_name}</span>
                                                    {o.client_phone && <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 'normal' }}>{o.client_phone}</span>}
                                                </div>
                                            </td>
                                            <td data-label="Identificador" style={{ color: '#9ca3af', fontSize: '0.85rem' }}>#{String(o.id).substring(0,6)}</td>
                                            <td data-label="Fecha y Hora">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Calendar size={14} color="#9ca3af" />
                                                    <span style={{ fontWeight: 500 }}>{new Date(o.created_at).toLocaleDateString()}</span>
                                                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </td>
                                            <td data-label="Tipo Pago">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {o.payment_type === 'online' ? <Receipt size={14} className="text-primary"/> : (o.payment_type==='tarjeta' ? <CreditCard size={14} /> : <DollarSign size={14} />)}
                                                    <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{o.payment_type === 'online' ? 'Transf.' : o.payment_type}</span>
                                                </div>
                                            </td>
                                            <td data-label="Total" style={{ fontWeight: 700, color: '#25d366' }}>
                                                ${o.total.toLocaleString('es-CL')}
                                            </td>
                                            <td data-label="Estado">
                                                <span className={`status-badge ${st.className}`} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px' }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td data-label="Acciones" style={{ textAlign: 'right' }}>
                                                <button className="btn-icon-text btn-white" style={{ padding: '6px 10px', fontSize: '0.8rem', marginLeft: 'auto' }}>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    {isExpanded ? 'Cerrar' : 'Detalles'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW FOR DETAILS */}
                                        {isExpanded && (
                                            <tr className="history-expanded-row">
                                                <td colSpan="7" style={{ padding: 0 }}>
                                                    <div className="history-expanded-content">
                                                        
                                                        <div style={{ flex: 1 }}>
                                                            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>
                                                                <Package size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                                                Artículos del Pedido
                                                            </h4>
                                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {o.items?.map((item, idx) => (
                                                                    <li key={idx} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span><b>{item.quantity}x</b> {item.name}</span>
                                                                            <span style={{ color: '#9ca3af' }}>${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                                                                        </div>
                                                                        {item.description && (
                                                                            <span style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '4px', fontStyle: 'italic' }}>
                                                                                Detalle: {item.description}
                                                                            </span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            {o.note && (
                                                                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', borderLeft: '3px solid #eab308' }}>
                                                                    <span style={{ fontSize: '0.75rem', color: '#eab308', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>NOTA DEL CLIENTE:</span>
                                                                    <span style={{ fontSize: '0.85rem' }}>{o.note}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="w-250" style={{ width: '250px' }}>
                                                            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>
                                                                <Receipt size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                                                Comprobante
                                                            </h4>
                                                            {o.payment_type === 'online' ? (
                                                                <div>
                                                                    {o.payment_ref && typeof o.payment_ref === 'string' && o.payment_ref.startsWith('http') ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                             <a href={o.payment_ref} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', justifyContent: 'center' }}>
                                                                                <Eye size={16} /> Ver Recibo Guardado
                                                                             </a>
                                                                             {setReceiptModalOrder && (
                                                                                <button onClick={(e) => { e.stopPropagation(); setReceiptModalOrder(o); }} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px' }}>
                                                                                    Cambiar Recibo
                                                                                </button>
                                                                             )}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                                                                            <span style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '10px' }}>No hay comprobante subido</span>
                                                                            {setReceiptModalOrder && (
                                                                                 <button onClick={(e) => { e.stopPropagation(); setReceiptModalOrder(o); }} className="btn-white" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                                                     <Upload size={14} /> Subir Comprobante
                                                                                 </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: '#9ca3af', fontSize: '0.85rem' }}>
                                                                    Pago registrado como {o.payment_type === 'tarjeta' ? 'Tarjeta (Presencial)' : 'Efectivo'}. No requiere comprobante.
                                                                </div>
                                                            )}
                                                        </div>

                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminHistoryTable;
