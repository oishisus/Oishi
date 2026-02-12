import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, List, Settings, Plus, Edit, Trash, LogOut, 
  ExternalLink, LayoutDashboard, Loader2, Search, Filter,
  CheckCircle2, AlertCircle, Image as ImageIcon, Upload,
  Eye, EyeOff, BarChart3, TrendingUp, Package, DollarSign,
  ChefHat, Clock, CheckSquare, XCircle, Phone, FileText,
  UserCheck, BellRing // Iconos nuevos para el flujo de retiro
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png'; 

const Admin = () => {
  const navigate = useNavigate();
  
  // --- ESTADOS DE DATOS ---
  const [activeTab, setActiveTab] = useState('orders'); 
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]); 
  
  // Estados de Filtros
  const [orderStatusFilter, setOrderStatusFilter] = useState('pending'); // pending, active, completed, picked_up, canceled
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- CONTROL DE MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- SINCRONIZACIÓN DE DATOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase.from('categories').select('*').order('order');
      const { data: prods } = await supabase.from('products').select('*').order('name');
      const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

      setCategories(cats || []);
      setProducts(prods || []);
      setOrders(ords || []);
    } catch (error) {
      showNotify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- GESTIÓN DE PEDIDOS ---
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
      const labels = { 
        active: 'En Cocina', 
        completed: 'Listo para Retiro', 
        picked_up: 'Entregado al Cliente', // Nuevo Label
        canceled: 'Cancelado' 
      };
      showNotify(`Pedido: ${labels[newStatus] || newStatus}`);
    } catch (error) {
      showNotify("Error al actualizar pedido", "error");
    }
  };

  // --- GESTIÓN DE PRODUCTOS ---
  const toggleProductActive = async (product) => {
    const newActive = !product.is_active;
    try {
      const { data, error } = await supabase
        .from('products').update({ is_active: newActive }).eq('id', product.id).select().single();
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? data : p));
      showNotify(newActive ? 'Producto visible' : 'Producto pausado');
    } catch (error) {
      showNotify('Error al cambiar estado', 'error');
    }
  };

  const handleSaveProduct = async (formData, localFile) => {
    setSaving(true);
    try {
      let finalImageUrl = formData.image_url;
      if (localFile) {
        const fileExt = localFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from('images').upload(`menu/${fileName}`, localFile);
        if (upErr) {
          showNotify(`Error al subir imagen: ${upErr.message}`, 'error');
          setSaving(false);
          return;
        }
        const { data } = supabase.storage.from('images').getPublicUrl(`menu/${fileName}`);
        finalImageUrl = data.publicUrl;
      }
      const payload = { ...formData, image_url: finalImageUrl, price: parseInt(formData.price) };

      if (editingProduct) {
        const { data, error } = await supabase.from('products').update(payload).eq('id', editingProduct.id).select().single();
        if (!error) {
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p));
            showNotify("Producto actualizado");
        }
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (!error) {
            setProducts(prev => [...prev, data]);
            showNotify("Nuevo plato añadido");
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      showNotify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar permanentemente este producto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Producto eliminado");
    } catch (error) {
      showNotify("Error: El producto tiene dependencias", 'error');
    }
  };

  // --- GESTIÓN DE CATEGORÍAS ---
  const handleSaveCategory = async (formData) => {
    setSaving(true);
    try {
      const payload = { name: formData.name, order: parseInt(formData.order), is_active: formData.is_active };
      let data, error;
      
      if (editingCategory) {
        ({ data, error } = await supabase.from('categories').update(payload).eq('id', editingCategory.id).select().single());
        if (!error) {
            setCategories(prev => prev.map(c => c.id === editingCategory.id ? data : c));
            showNotify('Categoría actualizada');
        }
      } else {
        const id = formData.name.toLowerCase().replace(/\s+/g, '-');
        ({ data, error } = await supabase.from('categories').insert({...payload, id}).select().single());
        if (!error) {
            setCategories(prev => [...prev, data]);
            showNotify('Nueva categoría añadida');
        }
      }
      setIsCategoryModalOpen(false);
      loadData(); 
    } catch (error) {
      showNotify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- ANALÍTICA Y FILTROS ---
  const stats = useMemo(() => {
    const totalVal = products.reduce((acc, p) => acc + (p.price || 0), 0);
    
    // Ingresos: Sumamos 'completed' (listos) Y 'picked_up' (retirados)
    const income = orders
      .filter(o => o.status === 'completed' || o.status === 'picked_up')
      .reduce((acc, o) => acc + o.total, 0);
      
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    return {
      total: products.length,
      active: products.filter(p => p.is_active).length,
      avg: products.length ? Math.round(totalVal / products.length) : 0,
      income: income,
      pending: pendingOrders,
      totalOrders: orders.length
    };
  }, [products, orders]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.category_id === filterCategory;
    return matchesSearch && matchesCat;
  });

  const filteredOrders = orders.filter(o => o.status === orderStatusFilter);

  // Hook para responsividad
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 800);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 800);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) return (
    <div className="admin-layout" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--background-dark, #101828)'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:18}}>
        <Loader2 className="animate-spin" size={54} color="#e63946" />
        <span style={{color:'#fff',fontWeight:600,fontSize:'1.2rem',letterSpacing:0.2}}>Cargando panel...</span>
      </div>
    </div>
  );

  return (
    <div className="admin-layout" style={{
      display: isMobile ? 'block' : 'flex',
      minHeight: '100vh',
      background: 'var(--background-dark, #101828)'
    }}>
      {notification && (
        <div className={`admin-notification ${notification.type} animate-slide-up`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="admin-sidebar glass" style={{
        minWidth: isMobile ? '100vw' : 220,
        maxWidth: isMobile ? '100vw' : 260,
        width: isMobile ? '100vw' : undefined,
        flexShrink: 0,
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        alignItems: isMobile ? 'center' : undefined,
        background: 'var(--background-dark, #101828)',
        borderRight: isMobile ? 'none' : '1.5px solid #22304a',
        borderBottom: isMobile ? '1.5px solid #22304a' : 'none',
        color: '#fff',
        padding: isMobile ? '10px 4vw' : undefined,
        height: isMobile ? 'auto' : '100vh',
        position: isMobile ? 'static' : 'sticky',
        top: isMobile ? undefined : 0,
        zIndex: 100
      }}>
        <div style={{display: isMobile ? 'flex' : 'block', alignItems: 'center', width: '100%', justifyContent: isMobile ? 'space-between' : undefined}}>
          <div className="sidebar-brand-pro" style={{marginBottom: isMobile ? 0 : 32, display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', gap: isMobile ? 8 : 0}}>
            <div style={{background: 'var(--background-dark, #101828)', borderRadius: '50%', padding: isMobile ? 6 : 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px #0006'}}>
              <img src={logo} alt="Oishi Logo" className="admin-logo-img" style={{background: 'transparent', borderRadius: '50%', width: isMobile ? 38 : 72, height: isMobile ? 38 : 72, objectFit: 'contain'}} />
            </div>
            {!isMobile && (
              <div className="brand-text" style={{marginTop: 12}}>
                <h3 className="text-gradient">Oishi Admin</h3>
              </div>
            )}
          </div>
          <nav className="sidebar-nav" style={{display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? 4 : 8, marginLeft: isMobile ? 8 : 0}}>
            <button onClick={() => setActiveTab('orders')} className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}>
              <CheckSquare size={isMobile ? 18 : 20} />
              {!isMobile && <span>Pedidos</span>}
              {stats.pending > 0 && (
                <span style={{background: '#e63946', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: isMobile ? 4 : 'auto'}}>
                  {stats.pending}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('products')} className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}>
              <ShoppingBag size={isMobile ? 18 : 20} />{!isMobile && <span>Inventario</span>}
            </button>
            <button onClick={() => setActiveTab('categories')} className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}>
              <List size={isMobile ? 18 : 20} />{!isMobile && <span>Categorías</span>}
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}>
              <BarChart3 size={isMobile ? 18 : 20} />{!isMobile && <span>Reportes</span>}
            </button>
          </nav>
        </div>
        <button onClick={() => navigate('/login')} className="nav-item logout-btn" style={{marginTop: isMobile ? 0 : 32, fontSize: isMobile ? 13 : undefined, padding: isMobile ? '8px 10px' : undefined}}><LogOut size={isMobile ? 18 : 20} />{!isMobile && <span>Desconectar</span>}</button>
      </aside>

      <main className="admin-main" style={{
        flex: 1,
        padding: isMobile ? '8px 2vw 8px 2vw' : '32px 0 32px 0',
        background: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'auto'
      }}>
        <header className="admin-header-pro" style={{
          margin: isMobile ? '0 2vw 14px 2vw' : '0 40px 32px 40px',
          background: 'transparent'
        }}>
          <div className="header-flex-col" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%'}}>
            <h2 className="section-title text-gradient" style={{marginBottom: 0, textAlign: 'center', width: '100%'}}>
              {activeTab === 'orders' ? 'Gestión de Pedidos' : 
               activeTab === 'products' ? 'Inventario' : 
               activeTab === 'categories' ? 'Estructura' : 'Panel de Control'}
            </h2>
            <p className="header-subtitle" style={{textAlign: 'center', width: '100%'}}>
              {activeTab === 'orders' ? 'Administra cocina y entregas' : 'Control de activos en tiempo real'}
            </p>
            <div className="header-actions" style={{display: 'flex', gap: isMobile ? 8 : 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, flexWrap: isMobile ? 'wrap' : undefined}}>
              <button onClick={() => window.open('/', '_blank')} className="btn btn-secondary glass" style={{display: 'flex', alignItems: 'center', gap: 8}}><ExternalLink size={22} style={{marginRight: 4}} /><span>Ver Carta</span></button>
              {activeTab === 'products' && (
                <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="btn btn-primary btn-glow" style={{display: 'flex', alignItems: 'center', gap: 8}}><Plus size={22} style={{marginRight: 4}} /><span>Nuevo Plato</span></button>
              )}
              {activeTab === 'categories' && (
                <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="btn btn-primary btn-glow" style={{display: 'flex', alignItems: 'center', gap: 8}}><Plus size={22} style={{marginRight: 4}} /><span>Nueva Categoría</span></button>
              )}
            </div>
          </div>
        </header>

        {/* --- VISTA DE PEDIDOS --- */}
        {activeTab === 'orders' && (
          <section className="admin-orders-section" style={{margin: isMobile ? '0 1vw' : '0 40px', display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 24}}>
            {/* Tabs de Estado ACTUALIZADOS */}
            <div className="orders-tabs glass" style={{display:'flex', gap:10, padding: isMobile ? 10 : 15, borderRadius:16, flexWrap:'wrap', background: 'rgba(30,41,59,0.85)'}}>
              {[
                { id: 'pending', label: 'Entrantes', icon: <Clock size={18}/>, color: '#f4a261' },
                { id: 'active', label: 'En Cocina', icon: <ChefHat size={18}/>, color: '#e63946' },
                { id: 'completed', label: 'Listos', icon: <BellRing size={18}/>, color: '#25d366' },
                { id: 'picked_up', label: 'Retirados', icon: <UserCheck size={18}/>, color: '#3b82f6' }, // NUEVO ESTADO
                { id: 'canceled', label: 'Cancelados', icon: <XCircle size={18}/>, color: '#ff4444' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setOrderStatusFilter(tab.id)}
                  className="btn"
                  style={{
                    backgroundColor: orderStatusFilter === tab.id ? tab.color : 'transparent',
                    color: orderStatusFilter === tab.id ? (tab.id === 'pending' || tab.id === 'completed' ? '#000' : '#fff') : 'var(--text-secondary)',
                    border: '1px solid var(--card-border)',
                    flex: isMobile ? '1 1 40%' : 1,
                    fontSize: isMobile ? '0.85rem' : '1rem',
                    justifyContent: 'center'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="admin-content-card glass" style={{padding: 0, background: 'rgba(30,41,59,0.92)', color: '#fff', borderRadius: isMobile ? 10 : 18, width: '100%', overflowX: 'auto'}}>
              <div className="table-wrapper" style={{overflowX: 'auto', width: '100%'}}>
                <table className="data-table" style={{minWidth: isMobile ? 600 : 900, background: 'transparent', color: '#fff', fontSize: isMobile ? 12 : undefined, width: '100%'}}>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Detalle del Pedido</th>
                      <th>Pago</th>
                      <th>Total</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign:'center', padding:40, opacity:0.5}}>No hay pedidos en esta sección</td></tr>
                    ) : filteredOrders.map(order => (
                      <tr key={order.id} className="row-hover">
                        <td style={{verticalAlign: 'top'}}>
                          <div style={{fontWeight: 'bold', fontSize: '1rem'}}>{order.client_name}</div>
                          <div style={{fontSize: '0.8rem', display:'flex', alignItems:'center', gap:5, opacity:0.7, marginTop: 4}}>
                            <Phone size={12}/> {order.client_phone}
                          </div>
                        </td>
                        <td style={{maxWidth: '300px'}}>
                          <ul style={{listStyle:'none', padding:0, fontSize:'0.85rem', margin: 0}}>
                            {order.items.map((item, idx) => (
                              <li key={idx} style={{marginBottom: 2}}>• {item.quantity}x {item.name}</li>
                            ))}
                          </ul>
                          {order.note && (
                            <div style={{fontSize:'0.75rem', color:'var(--accent-secondary)', marginTop:6, fontStyle:'italic'}}>
                              📝 Nota: "{order.note}"
                            </div>
                          )}
                        </td>
                        <td style={{verticalAlign: 'top'}}>
                          <span className="status-pill" style={{background: 'rgba(255,255,255,0.1)', fontSize: '0.7rem'}}>
                            {order.payment_type === 'online' ? 'Transferencia' : 'Local'}
                          </span>
                          {order.payment_ref && <div style={{fontSize:'0.7rem', marginTop:6, opacity: 0.8}}>Ref: {order.payment_ref}</div>}
                        </td>
                        <td style={{fontWeight:'800', color:'var(--accent-primary)', fontSize: '1rem'}}>${order.total.toLocaleString('es-CL')}</td>
                        <td>
                          <div className="actions-group" style={{display: 'flex', gap: 8}}>
                            
                            {/* Flujo: Pendiente -> Cocina */}
                            {order.status === 'pending' && (
                              <button onClick={() => updateOrderStatus(order.id, 'active')} className="action-btn" title="Pasar a Cocina" style={{background: '#e63946', color:'white'}}>
                                <ChefHat size={18} />
                              </button>
                            )}

                            {/* Flujo: Cocina -> Listo */}
                            {order.status === 'active' && (
                              <button onClick={() => updateOrderStatus(order.id, 'completed')} className="action-btn" title="Listo para Retiro" style={{background: '#25d366', color:'black'}}>
                                <BellRing size={18} />
                              </button>
                            )}

                            {/* Flujo: Listo -> Retirado (NUEVO) */}
                            {order.status === 'completed' && (
                              <button onClick={() => updateOrderStatus(order.id, 'picked_up')} className="action-btn" title="Entregado al Cliente" style={{background: '#3b82f6', color:'white'}}>
                                <UserCheck size={18} />
                              </button>
                            )}

                            {/* Cancelar (Disponible hasta que se retira) */}
                            {(order.status !== 'canceled' && order.status !== 'picked_up') && (
                              <button onClick={() => updateOrderStatus(order.id, 'canceled')} className="action-btn" title="Cancelar" style={{background: 'transparent', border: '1px solid #ff4444', color:'#ff4444'}}>
                                <XCircle size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* VISTA DE PRODUCTOS */}
        {activeTab === 'products' && (
          <section className="admin-products-section" style={{margin: isMobile ? '0 1vw' : '0 40px', display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 24}}>
            <div className="admin-toolbar glass" style={{display: 'flex', gap: isMobile ? 8 : 24, alignItems: 'center', marginBottom: isMobile ? 8 : 16, padding: isMobile ? 8 : 16, background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: isMobile ? 10 : 16, flexDirection: isMobile ? 'column' : 'row'}}>
              <div className="search-box" style={{flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)'}}>
                <Search size={18} />
                <input type="text" placeholder="Buscar plato..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: '#fff'}} />
              </div>
              <div className="filter-box" style={{display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)'}}>
                <Filter size={18} />
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-select" style={{background: 'var(--bg-secondary)', color: '#fff', border: 'none', appearance: 'none'}}>
                  <option value="all">Todo el Menú</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-content-card glass" style={{padding: 0, background: 'rgba(30,41,59,0.92)', color: '#fff', borderRadius: isMobile ? 10 : 18, width: '100%', overflowX: 'auto'}}>
              <div className="table-wrapper" style={{overflowX: 'auto', width: '100%'}}>
                <table className="data-table" style={{minWidth: isMobile ? 520 : 900, background: 'transparent', color: '#fff', fontSize: isMobile ? 12 : undefined, width: '100%'}}>
                  <thead>
                    <tr>
                      <th>Visual</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="row-hover">
                        <td>
                          <div className="thumb-frame">
                            {p.image_url && p.image_url !== '' ? (
                              <img src={p.image_url} className="table-thumb" alt="" />
                            ) : (
                              <ImageIcon size={38} color="#334155" />
                            )}
                          </div>
                        </td>
                        <td><span className="p-name">{p.name}</span>{p.is_special && <span className="premium-label">ESPECIAL 🔥</span>}</td>
                        <td className="p-cat">{categories.find(c => c.id === p.category_id)?.name || '---'}</td>
                        <td className="p-price">${p.price?.toLocaleString('es-CL')}</td>
                        <td>
                          <button className={`status-pill ${p.is_active ? 'active' : 'inactive'} status-toggle-btn`} onClick={() => toggleProductActive(p)} style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}>
                            {p.is_active ? (<><Eye size={16} style={{ verticalAlign: 'middle' }} /> Visible</>) : (<><EyeOff size={16} style={{ verticalAlign: 'middle' }} /> Pausado</>)}
                          </button>
                        </td>
                        <td>
                          <div className="actions-group" style={{display: 'flex', gap: 8}}>
                            <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="action-btn edit"><Edit size={16} /></button>
                            <button onClick={() => deleteProduct(p.id)} className="action-btn delete"><Trash size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* VISTA DE REPORTES */}
        {activeTab === 'analytics' && (
          <div className="reports-grid animate-fade" style={{gridTemplateColumns: isMobile ? '1fr' : undefined, gap: isMobile ? 10 : 24, margin: isMobile ? '0 1vw' : '0 40px'}}>
            <div className="stat-card glass" style={{background: 'rgba(30,41,59,0.92)', color: '#fff', borderRadius: 18}}>
              <Package size={32} className="card-icon" />
              <div className="card-data">
                <h4>Total Histórico</h4>
                <p className="card-value">{stats.totalOrders}</p>
              </div>
            </div>
            <div className="stat-card glass">
              <DollarSign size={32} className="card-icon" />
              <div className="card-data">
                <h4>Ingresos Reales</h4>
                <p className="card-value">${stats.income.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <div className="stat-card glass">
              <TrendingUp size={32} className="card-icon" />
              <div className="card-data">
                <h4>Items Activos</h4>
                <p className="card-value">{stats.active}</p>
              </div>
            </div>
          </div>
        )}

        {/* VISTA DE CATEGORÍAS */}
        {activeTab === 'categories' && (
          <div className="admin-content-card glass animate-fade" style={{background: 'rgba(30,41,59,0.92)', color: '#fff', borderRadius: isMobile ? 10 : 18, width: '100%', overflowX: 'auto', margin: isMobile ? '0 1vw' : '0 40px'}}>
            <div className="table-wrapper" style={{overflowX: 'auto', width: '100%'}}>
              <table className="data-table" style={{background: 'transparent', color: '#fff', minWidth: isMobile ? 320 : undefined, fontSize: isMobile ? 12 : undefined, width: '100%'}}>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Categoría</th>
                    <th>Visibilidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td className="cat-order">#{c.order}</td>
                      <td className="cat-name">{c.name}</td>
                      <td>
                        <span className={`status-pill ${c.is_active ? 'active' : 'inactive'}`}>
                          {c.is_active ? 'Visible' : 'Oculta'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true); }} className="action-btn edit">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
        saving={saving}
      />
      <CategoryModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        category={editingCategory}
      />
    </div>
  );
};

export default Admin;