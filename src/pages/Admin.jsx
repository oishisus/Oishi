import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, List, Settings, Plus, Edit, Trash, LogOut, 
  ExternalLink, LayoutDashboard, Loader2, Search, Filter,
  CheckCircle2, AlertCircle, Image as ImageIcon, Upload,
  Eye, EyeOff, BarChart3, TrendingUp, Package, DollarSign
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png'; // Integración de tu logo real

const Admin = () => {
  const navigate = useNavigate();
  
  // --- ESTADOS DE DATOS ---
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // --- FILTROS Y BÚSQUEDA ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // --- CONTROL DE MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // --- SISTEMA DE NOTIFICACIONES ---
  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- SINCRONIZACIÓN DE DATOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cats, error: errCats } = await supabase.from('categories').select('*').order('order');
      const { data: prods, error: errProds } = await supabase.from('products').select('*').order('name');
      
      if (errCats || errProds) throw new Error("Fallo en la sincronización con la base de datos");

      setCategories(cats || []);
      setProducts(prods || []);
    } catch (error) {
      showNotify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- GESTIÓN DE PRODUCTOS (CRUD ROBUSTO) ---
  // Cambiar estado de visibilidad del producto
  const toggleProductActive = async (product) => {
    const newActive = !product.is_active;
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ is_active: newActive })
        .eq('id', product.id)
        .select()
        .single();
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? data : p));
      showNotify(newActive ? 'Producto visible' : 'Producto pausado');
    } catch (error) {
      showNotify('Error al cambiar estado', 'error');
    }
  };

  // --- GESTIÓN DE CATEGORÍAS (CRUD) ---
  const handleSaveCategory = async (formData) => {
    setSaving(true);
    try {
      let payload = {
        name: formData.name,
        order: parseInt(formData.order),
        is_active: formData.is_active
      };
      let data, error;
      if (editingCategory) {
        ({ data, error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id)
          .select()
          .single());
        if (error) throw error;
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? data : c));
        showNotify('Categoría actualizada');
      } else {
        ({ data, error } = await supabase
          .from('categories')
          .insert(payload)
          .select()
          .single());
        if (error) throw error;
        setCategories(prev => [...prev, data]);
        showNotify('Nueva categoría añadida');
      }
      setIsCategoryModalOpen(false);
    } catch (error) {
      showNotify(error.message, 'error');
    } finally {
      setSaving(false);
      loadData(); // Para refrescar el orden y la lista
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
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('images').getPublicUrl(`menu/${fileName}`);
        finalImageUrl = data.publicUrl;
      }

      const payload = { ...formData, image_url: finalImageUrl, price: parseInt(formData.price) };

      if (editingProduct) {
        const { data, error } = await supabase.from('products').update(payload).eq('id', editingProduct.id).select().single();
        if (error) throw error;
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? data : p));
        showNotify("Producto actualizado");
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        setProducts(prev => [...prev, data]);
        showNotify("Nuevo plato añadido");
      }
      setIsModalOpen(false);
    } catch (error) {
      showNotify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  // --- ACTIVIDAD RECIENTE ---
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Simulación de actividad reciente (puedes reemplazar por fetch real)
    setRecentActivity(
      products.slice(-5).map(p => ({
        type: 'Producto',
        name: p.name,
        date: new Date().toLocaleString(),
        action: 'Actualizado'
      }))
    );
  }, [products]);

  const deleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar permanentemente este producto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Producto eliminado");
    } catch (error) {
      showNotify("Error: El producto tiene dependencias activas", 'error');
    }
  };

  // --- ANALÍTICA FUNCIONAL ---
  const stats = useMemo(() => {
    const totalVal = products.reduce((acc, p) => acc + (p.price || 0), 0);
    return {
      total: products.length,
      active: products.filter(p => p.is_active).length,
      premium: products.filter(p => p.is_special).length,
      avg: products.length ? Math.round(totalVal / products.length) : 0
    };
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.category_id === filterCategory;
    return matchesSearch && matchesCat;
  });


  // Hook para responsividad en tiempo real (debe ir antes de cualquier return)
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

      {/* SIDEBAR CON IDENTIDAD DE MARCA */}
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
            <button onClick={() => setActiveTab('products')} className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}><ShoppingBag size={isMobile ? 18 : 20} />{!isMobile && <span>Inventario</span>}</button>
            <button onClick={() => setActiveTab('categories')} className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}><List size={isMobile ? 18 : 20} />{!isMobile && <span>Categorías</span>}</button>
            <button onClick={() => setActiveTab('analytics')} className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} style={{padding: isMobile ? '8px 10px' : undefined, fontSize: isMobile ? 13 : undefined}}><BarChart3 size={isMobile ? 18 : 20} />{!isMobile && <span>Reportes</span>}</button>
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
              {activeTab === 'products' ? 'Gestión de Inventario' : 
               activeTab === 'categories' ? 'Estructura de Carta' : 'Métricas de Negocio'}
            </h2>
            <p className="header-subtitle" style={{textAlign: 'center', width: '100%'}}>Control de activos en tiempo real</p>
            <div className="header-actions" style={{display: 'flex', gap: isMobile ? 8 : 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, flexWrap: isMobile ? 'wrap' : undefined}}>
              <button onClick={() => window.open('/', '_blank')} className="btn btn-secondary glass" style={{display: 'flex', alignItems: 'center', gap: 8}}><ExternalLink size={22} style={{marginRight: 4}} /><span>Previsualizar</span></button>
              {activeTab === 'products' && (
                <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="btn btn-primary btn-glow" style={{display: 'flex', alignItems: 'center', gap: 8}}><Plus size={22} style={{marginRight: 4}} /><span>Nuevo Plato</span></button>
              )}
              {activeTab === 'categories' && (
                <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="btn btn-primary btn-glow" style={{display: 'flex', alignItems: 'center', gap: 8}}><Plus size={22} style={{marginRight: 4}} /><span>Nueva Categoría</span></button>
              )}
            </div>
          </div>
        </header>

        {/* VISTA DE PRODUCTOS */}
        {activeTab === 'products' && (
          <section className="admin-products-section" style={{margin: isMobile ? '0 1vw' : '0 40px', display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 24}}>
            <div className="admin-toolbar glass" style={{display: 'flex', gap: isMobile ? 8 : 24, alignItems: 'center', marginBottom: isMobile ? 8 : 16, padding: isMobile ? 8 : 16, background: 'rgba(30,41,59,0.85)', color: '#fff', borderRadius: isMobile ? 10 : 16, flexDirection: isMobile ? 'column' : 'row'}}>
              {/* Buscador oculto temporalmente */}
              <div className="search-box" style={{display: 'none'}}></div>
              <div className="search-box" style={{flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)'}}>
                <Search size={18} />
                <input type="text" placeholder="Buscar plato por nombre..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: '#fff'}} />
              </div>
              <div className="filter-box" style={{display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)'}}>
                <Filter size={18} />
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-select" style={{background: 'var(--bg-secondary)', color: '#fff', border: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none'}}>
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
                            <img src={p.image_url || 'https://via.placeholder.com/50'} className="table-thumb" alt="" />
                          </div>
                        </td>
                        <td>
                          <span className="p-name">{p.name}</span>
                          {p.is_special && <span className="premium-label">ESPECIAL 🔥</span>}
                        </td>
                        <td className="p-cat">{categories.find(c => c.id === p.category_id)?.name || '---'}</td>
                        <td className="p-price">${p.price?.toLocaleString('es-CL')}</td>
                        <td>
                          <button className={`status-pill ${p.is_active ? 'active' : 'inactive'} status-toggle-btn`} title={p.is_active ? 'Pausar producto' : 'Hacer visible'} style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }} onClick={() => toggleProductActive(p)}>
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

        {/* VISTA DE REPORTES FUNCIONAL */}
        {activeTab === 'analytics' && (
          <div className="reports-grid animate-fade" style={{gridTemplateColumns: isMobile ? '1fr' : undefined, gap: isMobile ? 10 : 24}}>
            <div className="stat-card glass" style={{background: 'rgba(30,41,59,0.92)', color: '#fff', borderRadius: 18}}>
              <Package size={32} className="card-icon" />
              <div className="card-data">
                <h4>Total Items</h4>
                <p className="card-value">{stats.total}</p>
              </div>
            </div>
            <div className="stat-card glass">
              <TrendingUp size={32} className="card-icon" />
              <div className="card-data">
                <h4>Items Visibles</h4>
                <p className="card-value">{stats.active}</p>
              </div>
            </div>
            <div className="stat-card glass">
              <DollarSign size={32} className="card-icon" />
              <div className="card-data">
                <h4>Ticket Promedio</h4>
                <p className="card-value">${stats.avg.toLocaleString('es-CL')}</p>
              </div>
            </div>
          </div>
        )}

        {/* VISTA DE CATEGORÍAS FUNCIONAL */}
        {activeTab === 'categories' && (
          <div className="admin-content-card glass animate-fade" style={{background: 'rgba(30,41,59,0.92)', color: '#fff', borderRadius: isMobile ? 10 : 18, width: '100%', overflowX: 'auto'}}>
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