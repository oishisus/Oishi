import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Search, Filter, CheckCircle2, AlertCircle,
  Eye, EyeOff, BarChart3, Package, DollarSign,
  Star, Trophy, PieChart,
  Image as ImageIcon, Upload, PlusCircle,
  X, XCircle, Trash2, FileText, Plus, Edit, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminKanban from '../components/admin/AdminKanban';
import ManualOrderModal from '../components/admin/ManualOrderModal';
import InventoryCard from '../components/admin/InventoryCard';
import AdminHistoryTable from '../components/admin/AdminHistoryTable';
import AdminClientsTable from '../components/admin/AdminClientsTable';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

// CLAVE DE SEGURIDAD
const SECURITY_DELETE_KEY = '1234';

// --- CAPA DE SANEAMIENTO (EL PORTERO) ---
const sanitizeOrder = (rawOrder) => {
  let cleanItems = [];
  if (rawOrder.items) {
    if (Array.isArray(rawOrder.items)) {
      cleanItems = rawOrder.items;
    } else if (typeof rawOrder.items === 'string') {
      try {
        const parsed = JSON.parse(rawOrder.items);
        cleanItems = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        cleanItems = [];
      }
    }
  }
  return {
    ...rawOrder,
    items: cleanItems,
    total: Number(rawOrder.total) || 0,
    client_name: rawOrder.client_name || 'Cliente Desconocido',
    client_rut: rawOrder.client_rut || 'Sin RUT',
    client_phone: rawOrder.client_phone || '',
    status: rawOrder.status || 'pending',
    created_at: rawOrder.created_at || new Date().toISOString()
  };
};

const Admin = () => {
  const navigate = useNavigate();

  // --- ESTADOS DE DATOS ---
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);

  // --- ESTADOS DE INTERFAZ ---
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [mobileTab, setMobileTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [notification, setNotification] = useState(null);

  // --- MODALES COMPROBANTE Y PEDIDO MANUAL ---
  const [receiptModalOrder, setReceiptModalOrder] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // --- CRM & REPORTES ---
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientOrders, setSelectedClientOrders] = useState([]);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [analyticsDate, setAnalyticsDate] = useState(new Date().toISOString().split('T')[0]);

  // --- ZONA DE PELIGRO ---
  const [isDangerModalOpen, setIsDangerModalOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState(null);
  const [dangerUserName, setDangerUserName] = useState('');
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerError, setDangerError] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- 1. CARGA DE DATOS ---
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [catsRes, prodsRes, ordsRes, cltsRes] = await Promise.all([
        supabase.from('categories').select('*').order('order'),
        supabase.from('products').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('last_order_at', { ascending: false })
      ]);

      if (catsRes.error) throw catsRes.error;
      if (prodsRes.error) throw prodsRes.error;
      if (ordsRes.error) throw ordsRes.error;
      if (cltsRes.error) throw cltsRes.error;

      const cleanOrders = (ordsRes.data || []).map(sanitizeOrder);

      setCategories(catsRes.data || []);
      setProducts(prodsRes.data || []);
      setOrders(cleanOrders);
      setClients(cltsRes.data || []);

    } catch (error) {
      console.error("Error cargando datos:", error);
      showNotify("Error de conexión", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClientHistory = async (client) => {
    if (!client) return;
    setClientHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const cleanHistory = (data || []).map(sanitizeOrder);
      setSelectedClientOrders(cleanHistory);

    } catch (error) {
      showNotify('Error al cargar historial', 'error');
    } finally {
      setClientHistoryLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    loadClientHistory(client);
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- 2. GESTIÓN DE PEDIDOS ---
  const moveOrder = async (orderId, nextStatus) => {
    const previousOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    try {
      const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
      if (error) throw error;
      showNotify('Pedido actualizado');
    } catch (error) {
      setOrders(previousOrders);
      showNotify("Error al actualizar", "error");
    }
  };

  const uploadReceiptToOrder = async (orderId, file) => {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipts/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from('images').upload(fileName, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      const receiptUrl = data.publicUrl;

      const { error } = await supabase.from('orders').update({ payment_ref: receiptUrl }).eq('id', orderId);
      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_ref: receiptUrl } : o));
      if (selectedClient) {
        setSelectedClientOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_ref: receiptUrl } : o));
      }

      showNotify('Comprobante agregado');
      setReceiptModalOrder(null);
      setReceiptPreview(null);
    } catch (error) {
      showNotify('Error al subir comprobante: ' + error.message, 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  // --- 3. GESTIÓN DE PRODUCTOS ---
  const handleSaveProduct = async (formData, localFile) => {
    setRefreshing(true);
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
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
        showNotify("Producto actualizado");
      } else {
        await supabase.from('products').insert(payload);
        showNotify("Producto creado");
      }
      setIsModalOpen(false);
      loadData(true);
    } catch (error) {
      showNotify("Error: " + error.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      showNotify("Producto eliminado");
      loadData(true);
    } catch (error) {
      showNotify("No se puede eliminar (tiene ventas asociadas)", 'error');
    }
  };

  const toggleProductActive = async (product, e) => {
    e.stopPropagation();
    const newActive = !product.is_active;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newActive } : p));
    try {
      await supabase.from('products').update({ is_active: newActive }).eq('id', product.id);
      showNotify(newActive ? 'Producto activado' : 'Producto pausado');
    } catch (error) {
      loadData(true);
      showNotify('Error al cambiar estado', 'error');
    }
  };

  const handleSaveCategory = async (formData) => {
    try {
      const payload = { name: formData.name, order: parseInt(formData.order), is_active: formData.is_active };
      if (editingCategory) {
        await supabase.from('categories').update(payload).eq('id', editingCategory.id);
      } else {
        const id = formData.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
        await supabase.from('categories').insert({ ...payload, id });
      }
      setIsCategoryModalOpen(false);
      loadData(true);
      showNotify('Categoría guardada');
    } catch (error) {
      showNotify('Error al guardar', 'error');
    }
  };

  // --- 4. EXPORTACIÓN CSV ---
  const handleExportMonthlyCsv = async () => {
    const [year, month] = analyticsDate.split('-');
    const filteredOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d.getFullYear() === parseInt(year) && d.getMonth() + 1 === parseInt(month);
    });

    if (filteredOrders.length === 0) {
      showNotify("No hay datos para exportar", 'info');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Cliente', 'RUT', 'Teléfono', 'Items', 'Total', 'Método Pago', 'Ref. Pago'];
    const lines = [headers.join(',')];

    filteredOrders.forEach(order => {
      const d = new Date(order.created_at);
      const itemsText = order.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
      const row = [
        d.toLocaleDateString('es-CL'),
        d.toLocaleTimeString('es-CL'),
        order.client_name,
        order.client_rut,
        order.client_phone,
        itemsText,
        order.total,
        order.payment_type || '',
        order.payment_ref || ''
      ];
      const escaped = row.map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(escaped.join(','));
    });

    const csvContent = "\uFEFF" + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cierre_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotify('Reporte Excel generado', 'success');
  };

  // --- 5. ZONA DE PELIGRO ---
  const executeDangerAction = async () => {
    const trimmedName = dangerUserName.trim();
    if (!trimmedName || dangerPassword !== SECURITY_DELETE_KEY) {
      setDangerError('Credenciales incorrectas');
      return;
    }

    setIsDangerModalOpen(false);
    setLoading(true);

    try {
      if (dangerAction === 'monthlyOrders') {
        const [year, month] = analyticsDate.split('-');
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month, 0, 23, 59, 59).toISOString();

        const { data, error } = await supabase.from('orders').delete()
          .gte('created_at', start).lte('created_at', end).select();

        if (error) throw error;
        showNotify(`Eliminados ${data.length} pedidos`, 'success');

      } else if (dangerAction === 'allClients') {
        const { count, error } = await supabase.from('clients').delete().neq('phone', '0000').select('*', { count: 'exact' });
        if (error) throw error;
        showNotify(`Base de clientes purgada (${count} registros)`, 'success');
      }

      await supabase.from('audit_logs').insert({
        actor_name: trimmedName,
        action: dangerAction,
        created_at: new Date().toISOString()
      }).catch(() => { });

      loadData(true);
    } catch (e) {
      showNotify(`Error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openDangerModal = (action) => {
    setDangerAction(action);
    setDangerUserName('');
    setDangerPassword('');
    setDangerError(null);
    setIsDangerModalOpen(true);
  };

  // --- 6. ESTADÍSTICAS AVANZADAS ---
  const analyticsData = useMemo(() => {
    if (!orders.length) return null;
    const validOrders = orders.filter(o => o.status === 'completed' || o.status === 'picked_up');
    const totalIncome = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const productCounts = {};
    validOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!productCounts[item.name]) productCounts[item.name] = 0;
          productCounts[item.name] += (item.quantity || 0);
        });
      }
    });

    const sortedProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const payments = { online: 0, tienda: 0 };
    validOrders.forEach(o => {
      if (o.payment_type === 'online') payments.online++;
      else payments.tienda++;
    });

    return { totalIncome, sortedProducts, payments, totalOrders: validOrders.length };
  }, [orders]);

  const kanbanColumns = useMemo(() => ({
    pending: orders.filter(o => o.status === 'pending'),
    active: orders.filter(o => o.status === 'active'),
    completed: orders.filter(o => o.status === 'completed'),
    history: orders.filter(o => o.status === 'picked_up' || o.status === 'canceled')
  }), [orders]);

  if (loading && !refreshing && products.length === 0 && orders.length === 0) return (
    <div className="admin-layout flex-center" style={{ height: '100vh', background: '#0a0a0a', flexDirection: 'column', gap: 20 }}>
      <Loader2 className="animate-spin" size={60} color="#e63946" />
      <h3 style={{ color: 'white' }}>Cargando Sistema...</h3>
    </div>
  );

  return (
    <div className="admin-layout">
      {notification && (
        <div className={`admin-notification ${notification.type} animate-slide-up`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        kanbanColumns={kanbanColumns}
        onLogout={() => navigate('/')}
      />

      <main className="admin-content">
        <header className="content-header">
          <h1>
            {activeTab === 'orders' ? (isHistoryView ? 'Historial' : 'Cocina en Vivo') :
              activeTab === 'products' ? 'Inventario' :
                activeTab === 'analytics' ? 'Rendimiento' :
                  activeTab === 'clients' ? 'Clientes' :
                    activeTab === 'settings' ? 'Herramientas' : 'Categorías'}
          </h1>

          <div className="header-actions">
            <button onClick={() => loadData(true)} className="btn-icon-refresh" disabled={refreshing}>
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {activeTab === 'orders' && (
              <>
                <button className={`btn ${isHistoryView ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsHistoryView(!isHistoryView)}>
                  {isHistoryView ? 'Ver Tablero' : 'Ver Historial'}
                </button>
                <button onClick={() => setIsManualOrderModalOpen(true)} className="btn btn-primary">
                  <PlusCircle size={18} /> Pedido Manual
                </button>
              </>
            )}
            {activeTab === 'products' && (
              <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="btn btn-primary"><Plus size={18} /> Nuevo Plato</button>
            )}
            {activeTab === 'categories' && (
              <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="btn btn-primary"><Plus size={18} /> Nueva Categ.</button>
            )}
          </div>
        </header>

        {/* 1. PEDIDOS */}
        {activeTab === 'orders' && (
          !isHistoryView ? (
            <AdminKanban
              columns={kanbanColumns}
              isMobile={isMobile}
              mobileTab={mobileTab}
              setMobileTab={setMobileTab}
              moveOrder={moveOrder}
              setReceiptModalOrder={setReceiptModalOrder}
            />
          ) : (
            <AdminHistoryTable orders={kanbanColumns.history} />
          )
        )}

        {/* 2. INVENTARIO */}
        {activeTab === 'products' && (
          <div className="products-view animate-fade">
            <div className="admin-toolbar glass">
              <div className="search-box">
                <Search size={18} />
                <input placeholder="Buscar plato..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="filter-box">
                <Filter size={18} />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="all">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="inventory-grid">
              {products
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(p => filterCategory === 'all' || p.category_id === filterCategory)
                .map(p => (
                  <InventoryCard
                    key={p.id}
                    product={p}
                    toggleProductActive={toggleProductActive}
                    setEditingProduct={setEditingProduct}
                    setIsModalOpen={setIsModalOpen}
                    deleteProduct={deleteProduct}
                  />
                ))
              }
            </div>
          </div>
        )}

        {/* 3. REPORTES */}
        {activeTab === 'analytics' && analyticsData && (
          <div className="analytics-view animate-fade">
            <div className="kpi-grid">
              <div className="kpi-card glass">
                <div className="kpi-icon money"><DollarSign size={24} /></div>
                <div>
                  <h4>Ingresos Totales</h4>
                  <span className="kpi-value">${analyticsData.totalIncome.toLocaleString('es-CL')}</span>
                </div>
              </div>
              <div className="kpi-card glass">
                <div className="kpi-icon orders"><Package size={24} /></div>
                <div>
                  <h4>Pedidos Completados</h4>
                  <span className="kpi-value">{analyticsData.totalOrders}</span>
                </div>
              </div>
              <div className="kpi-card glass">
                <div className="kpi-icon star"><Star size={24} /></div>
                <div>
                  <h4>Ticket Promedio</h4>
                  <span className="kpi-value">
                    ${analyticsData.totalOrders ? Math.round(analyticsData.totalIncome / analyticsData.totalOrders).toLocaleString('es-CL') : 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card glass">
                <div className="chart-header">
                  <Trophy size={20} color="#f4a261" />
                  <h3>Platos Más Vendidos</h3>
                </div>
                <div className="top-products-list">
                  {analyticsData.sortedProducts.map((p, idx) => (
                    <div key={idx} className="top-product-item">
                      <div className="rank-num">#{idx + 1}</div>
                      <div className="rank-info">
                        <div className="rank-name">{p.name}</div>
                        <div className="rank-bar-bg">
                          <div className="rank-bar-fill" style={{ width: `${analyticsData.sortedProducts[0]?.count ? (p.count / analyticsData.sortedProducts[0].count) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div className="rank-count">{p.count}</div>
                    </div>
                  ))}
                  {analyticsData.sortedProducts.length === 0 && <div className="empty-chart">Aún no hay ventas suficientes</div>}
                </div>
              </div>

              <div className="chart-card glass">
                <div className="chart-header">
                  <PieChart size={20} color="#38bdf8" />
                  <h3>Métodos de Pago</h3>
                </div>
                <div className="payment-stats">
                  <div className="pay-stat-row">
                    <span>Transferencia</span>
                    <div className="pay-bar">
                      <div className="pay-fill online" style={{ width: `${(analyticsData.payments.online / (analyticsData.totalOrders || 1)) * 100}%` }}></div>
                    </div>
                    <span>{analyticsData.payments.online}</span>
                  </div>
                  <div className="pay-stat-row">
                    <span>Local (Efec/Tarj)</span>
                    <div className="pay-bar">
                      <div className="pay-fill store" style={{ width: `${(analyticsData.payments.tienda / (analyticsData.totalOrders || 1)) * 100}%` }}></div>
                    </div>
                    <span>{analyticsData.payments.tienda}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. CLIENTES */}
        {activeTab === 'clients' && (
          <AdminClientsTable
            clients={clients.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.rut?.includes(searchQuery))}
            searchQuery={searchQuery}
            handleSelectClient={handleSelectClient}
          />
        )}

        {/* 5. CATEGORÍAS */}
        {activeTab === 'categories' && (
          <div className="categories-list glass animate-fade">
            {categories.map(c => (
              <div key={c.id} className="cat-row-item">
                <div className="cat-name-lg">{c.name}</div>
                <button onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true) }} className="btn-icon-action"><Edit size={18} /></button>
              </div>
            ))}
          </div>
        )}

        {/* 6. HERRAMIENTAS */}
        {activeTab === 'settings' && (
          <div className="settings-view animate-fade" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid var(--accent-success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                <FileText size={28} color="#25d366" />
                <h3 style={{ margin: 0 }}>Cierre Mensual</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                Exporta tus ventas a Excel.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input type="month" className="form-input" style={{ width: 'auto' }} value={analyticsDate} onChange={e => setAnalyticsDate(e.target.value)} />
                <button onClick={handleExportMonthlyCsv} className="btn btn-primary" style={{ background: '#25d366', color: 'black', flex: 1 }}>
                  Descargar
                </button>
              </div>
            </div>

            <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid #ff4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                <Trash2 size={28} color="#ff4444" />
                <h3 style={{ margin: 0 }}>Zona de Peligro</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                Acciones irreversibles. Requiere clave.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => openDangerModal('monthlyOrders')} className="btn btn-secondary" style={{ borderColor: '#ff4444', color: '#ff4444', justifyContent: 'flex-start' }}>
                  Borrar Ventas del Mes
                </button>
                <button onClick={() => openDangerModal('allClients')} className="btn btn-secondary" style={{ borderColor: '#ff4444', color: '#ff4444', justifyContent: 'flex-start' }}>
                  Borrar Clientes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PANEL CLIENTE LATERAL */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="admin-side-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0 }}>{selectedClient.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>RUT: {selectedClient.rut}</span>
              </div>
              <button onClick={() => setSelectedClient(null)} className="btn-close-sidepanel"><X size={24} /></button>
            </div>

            <div className="admin-side-body">
              <div className="kpi-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
                <div className="kpi-card" style={{ padding: 15, flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>GASTO TOTAL</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#25d366' }}>${(selectedClient.total_spent || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="kpi-card" style={{ padding: 15, flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>PEDIDOS</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{selectedClient.total_orders || 0}</span>
                </div>
              </div>

              <h4 style={{ marginBottom: 10, color: 'var(--accent-secondary)' }}>Historial</h4>
              {clientHistoryLoading ? <div style={{ textAlign: 'center', padding: 20 }}><Loader2 className="animate-spin" /></div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedClientOrders.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.6 }}>Sin compras registradas con este ID.</p> :
                    selectedClientOrders.map(order => (
                      <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{new Date(order.created_at).toLocaleDateString('es-CL')}</span>
                          <span style={{ fontWeight: '700' }}>${order.total.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 8 }}>
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <span className={`status-badge ${order.status === 'completed' || order.status === 'picked_up' ? 'active' : 'paused'}`} style={{ fontSize: '0.7rem' }}>
                            {order.status === 'picked_up' ? 'Entregado' : order.status === 'completed' ? 'Completado' : order.status === 'active' ? 'En Cocina' : order.status === 'canceled' ? 'Cancelado' : 'Pendiente'}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {order.payment_ref && order.payment_ref.startsWith('http') ? (
                              <>
                                <a href={order.payment_ref} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: '0.75rem', textDecoration: 'underline' }}>
                                  <ImageIcon size={12} /> Ver Comprobante
                                </a>
                                <button onClick={() => setReceiptModalOrder(order)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                  Cambiar
                                </button>
                              </>
                            ) : order.payment_type === 'online' ? (
                              <button onClick={() => setReceiptModalOrder(order)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer' }}>
                                <Upload size={10} /> Agregar
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLAVE */}
      {isDangerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDangerModalOpen(false)}>
          <div className="admin-side-panel glass animate-slide-in" style={{ maxWidth: 350 }} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <div className="flex-center"><AlertCircle size={22} className="text-accent" /><h3>Confirmar</h3></div>
              <button onClick={() => setIsDangerModalOpen(false)} className="btn-close-sidepanel"><XCircle size={24} /></button>
            </div>
            <div className="admin-side-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 20 }}>Acción irreversible. Ingresa credenciales.</p>
              <div className="form-group">
                <label>Usuario</label>
                <input className="form-input" value={dangerUserName} onChange={e => setDangerUserName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Clave</label>
                <input type="password" className="form-input" value={dangerPassword} onChange={e => setDangerPassword(e.target.value)} />
              </div>
              {dangerError && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: 10 }}>{dangerError}</div>}
            </div>
            <div className="admin-side-footer">
              <button className="btn btn-primary btn-block" onClick={executeDangerAction}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE (EXISTENTE) */}
      {receiptModalOrder && (
        <div className="modal-overlay" onClick={() => { setReceiptModalOrder(null); setReceiptPreview(null); }}>
          <div className="admin-side-panel glass animate-slide-in" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <h3>Comprobante de Pago</h3>
              <button onClick={() => { setReceiptModalOrder(null); setReceiptPreview(null); }} className="btn-close-sidepanel"><X size={24} /></button>
            </div>
            <div className="admin-side-body">
              {receiptModalOrder.payment_ref && receiptModalOrder.payment_ref.startsWith('http') && !receiptPreview && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Comprobante actual:</p>
                  <a href={receiptModalOrder.payment_ref} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 15 }}>
                    <img src={receiptModalOrder.payment_ref} alt="Comprobante" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--card-border)' }} />
                  </a>
                </div>
              )}

              <div className="form-group">
                <label>Subir nuevo comprobante</label>
                <div className="upload-box" onClick={() => document.getElementById('receipt-upload-modal').click()} style={{ borderColor: receiptPreview ? '#25d366' : 'var(--card-border)' }}>
                  <input type="file" id="receipt-upload-modal" accept="image/*" hidden onChange={handleReceiptFileChange} />
                  {receiptPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, justifyContent: 'center' }}>
                      <img src={receiptPreview} alt="Preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid white' }} />
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Imagen Seleccionada</span>
                        <span style={{ fontSize: '0.75rem', color: '#25d366' }}>Click para cambiar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <Upload size={24} />
                      <span>Subir imagen</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-side-footer">
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  const fileInput = document.getElementById('receipt-upload-modal');
                  if (fileInput?.files[0]) {
                    uploadReceiptToOrder(receiptModalOrder.id, fileInput.files[0]);
                  } else {
                    showNotify('Selecciona una imagen', 'error');
                  }
                }}
                disabled={uploadingReceipt || !receiptPreview}
              >
                {uploadingReceipt ? 'Subiendo...' : 'Guardar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ManualOrderModal
        isOpen={isManualOrderModalOpen}
        onClose={() => setIsManualOrderModalOpen(false)}
        products={products}
        onOrderSaved={() => loadData(true)}
        isMobile={isMobile}
        showNotify={showNotify}
      />

      <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} product={editingProduct} categories={categories} />
      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={handleSaveCategory} category={editingCategory} />
    </div>
  );
};

export default Admin;
