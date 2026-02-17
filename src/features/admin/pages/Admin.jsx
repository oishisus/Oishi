import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, Search, Filter, CheckCircle2, AlertCircle,
  Package, DollarSign, Star, Trophy, PieChart,
  Upload, PlusCircle, X, XCircle, Trash2, FileText, Plus, Edit, RefreshCw, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../../products/components/ProductModal';
import CategoryModal from '../../products/components/CategoryModal';
import AdminSidebar from '../components/AdminSidebar';
import AdminKanban from '../components/AdminKanban';
import ManualOrderModal from '../components/ManualOrderModal';
import InventoryCard from '../components/InventoryCard';
import AdminHistoryTable from '../components/AdminHistoryTable';
import AdminClients from '../components/AdminClients';
import AdminInventory from '../components/AdminInventory';
import AdminSettings from '../components/AdminSettings';
import AdminAnalytics from '../components/AdminAnalytics';
import ClientDetailsPanel from '../components/ClientDetailsPanel';
import { supabase } from '../../../lib/supabase';
import { uploadImage } from '../../../shared/utils/cloudinary';
import CashManager from '../components/caja/CashManager';
import { useCashSystem } from '../hooks/useCashSystem';
import '../../../styles/AdminLayout.css';
import '../../../styles/AdminAnalytics.css';
import '../../../styles/AdminShared.css';
import '../../../styles/AdminCategories.css';


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
      } catch {
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
  const [analyticsDate, setAnalyticsDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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

  const showNotify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- SISTEMA DE CAJA ---
  useCashSystem(showNotify);

  // --- 1. CARGA DE DATOS ---
  const loadData = useCallback(async (isRefresh = false) => {
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
  }, [showNotify]);

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

    } catch {
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
    
    let channel = null;
    let isMounted = true;
    
    const setupRealtime = async () => {
      try {
        // Verificar sesión antes de suscribirse
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('No hay sesión activa, Realtime no se conectará');
          return;
        }
        
        channel = supabase.channel('admin-realtime', {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders' 
          }, (payload) => {
            if (isMounted) {
              console.log('Cambio detectado en orders:', payload.eventType);
              loadData(true);
            }
          })
          .subscribe((status, err) => {
            if (!isMounted) return;
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime conectado exitosamente');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Error en canal Realtime:', err);
            } else if (status === 'TIMED_OUT') {
              console.warn('⏱️ Realtime timeout');
            } else if (status === 'CLOSED') {
              console.warn('🔌 Realtime cerrado');
            }
          });
      } catch (error) {
        console.error('Error configurando Realtime:', error);
      }
    };
    
    // Pequeño delay para asegurar que la sesión esté lista
    const timeoutId = setTimeout(() => {
      setupRealtime();
    }, 500);
    
    return () => { 
      clearTimeout(timeoutId);
      isMounted = false;
      if (channel) {
        channel.unsubscribe().catch(() => {});
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [loadData]);

  // --- 2. GESTIÓN DE PEDIDOS ---
  const moveOrder = async (orderId, nextStatus) => {
    const previousOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    try {
      const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
      if (error) throw error;
      
      // Nota: No registramos venta aquí porque ya se registró en CartModal al crear la orden
      // Admin solo cambia estado/kanban, la caja se actualiza desde CartModal

      showNotify('Pedido actualizado');
    } catch {
      setOrders(previousOrders);
      showNotify("Error al actualizar", "error");
    }
  };

  const uploadReceiptToOrder = async (orderId, file) => {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const receiptUrl = await uploadImage(file, 'receipts');

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
        finalImageUrl = await uploadImage(localFile, 'menu');
      }

      const payload = { 
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        image_url: finalImageUrl,
        price: parseInt(formData.price) || 0,
        is_special: formData.is_special || false,
        has_discount: formData.has_discount || false,
        discount_price: formData.has_discount ? (parseInt(formData.discount_price) || 0) : null
      };

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
    } catch {
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
    } catch {
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
    } catch {
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

  const executeDangerAction = async () => {
    const trimmedEmail = dangerUserName.trim();
    if (!trimmedEmail || !dangerPassword) {
      setDangerError('Ingresa credenciales de administrador');
      return;
    }

    setDangerError(null);
    setLoading(true);

    try {
      // Validar con Supabase Auth (re-autenticación)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: dangerPassword
      });

      if (authError) {
        setDangerError('Credenciales de administrador inválidas');
        setLoading(false);
        return;
      }

      setIsDangerModalOpen(false);

      if (dangerAction === 'monthlyOrders') {
        const [year, month] = analyticsDate.split('-');
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month, 0, 23, 59, 59).toISOString();

        // 1. Borrar movimientos de caja del mes para evitar error de FK
        await supabase.from('cash_movements').delete()
          .gte('created_at', start).lte('created_at', end);

        // 2. Borrar las órdenes
        const { error } = await supabase.from('orders').delete()
          .gte('created_at', start).lte('created_at', end).select();

        if (error) throw error;
        showNotify(`Registros del mes eliminados con éxito`, 'success');

      } else if (dangerAction === 'allClients') {
        const { count, error } = await supabase.from('clients').delete().neq('phone', '0000').select('*', { count: 'exact' });
        if (error) throw error;
        showNotify(`Base de clientes purgada (${count} registros)`, 'success');
      }

      // Registro de auditoría (opcional, no bloquea)
      try {
        await supabase.from('audit_logs').insert({
          actor_name: trimmedEmail,
          action: dangerAction,
          created_at: new Date().toISOString()
        });
      } catch {
        console.warn('No se pudo guardar el log de auditoría');
      }

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


  const kanbanColumns = useMemo(() => ({
    pending: orders.filter(o => o.status === 'pending'),
    active: orders.filter(o => o.status === 'active'),
    completed: orders.filter(o => o.status === 'completed'),
    history: orders.filter(o => o.status === 'picked_up' || o.status === 'cancelled')
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
        onLogout={async () => {
          await supabase.auth.signOut();
          navigate('/login');
        }}
      />

      <main className="admin-content">
        <header className="content-header">
          <h1>
            {activeTab === 'orders' ? (isHistoryView ? 'Historial' : 'Cocina en Vivo') :
              activeTab === 'products' ? 'Inventario' :
                activeTab === 'analytics' ? 'Rendimiento' :
                  activeTab === 'clients' ? 'Clientes' :
                    activeTab === 'caja' ? 'Caja y Turnos' :
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

        {/* 2.5 NUEVO INVENTARIO (INSUMOS) */}
        {activeTab === 'inventory' && (
            <AdminInventory showNotify={showNotify} />
        )}

        {/* 3. REPORTES */}
        {activeTab === 'analytics' && (
          <AdminAnalytics 
            orders={orders} 
            products={products} 
            clients={clients} 
          />
        )}

        {/* 4. CLIENTES */}
        {activeTab === 'clients' && (
          <AdminClients 
            clients={clients}
            orders={orders}
            onSelectClient={handleSelectClient}
            onClientCreated={() => loadData(true)}
            showNotify={showNotify}
          />
        )}

        {/* 4.5 CAJA */}
        {activeTab === 'caja' && (
          <CashManager showNotify={showNotify} />
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
          <div className="settings-view animate-fade">
             <AdminSettings showNotify={showNotify} />

             {/* ZONA DE PELIGRO (FUNCIONES AVANZADAS) */}
             <div style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
                <h3 style={{ color: '#ef4444', marginBottom: 20, borderBottom: '1px solid #ef4444', paddingBottom: 10 }}>Zona de Peligro Administrativa</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
                    
                    {/* Cierre Mensual */}
                    <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid var(--accent-success)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                        <FileText size={28} color="#25d366" />
                        <h3 style={{ margin: 0 }}>Reporte Cierre Mensual</h3>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                        Genera y descarga un Excel con todas las ventas del mes seleccionado.
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                        <input 
                            type="month" 
                            className="form-input" 
                            style={{ width: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} 
                            value={analyticsDate} 
                            onChange={e => setAnalyticsDate(e.target.value)} 
                        />
                      </div>
                      <button onClick={handleExportMonthlyCsv} className="btn-table-action" style={{ width: '100%', padding: 12, background: 'rgba(37, 211, 102, 0.2)', color: '#25d366', border: '1px solid #25d366' }}>
                        Descargar Reporte Mes
                      </button>
                    </div>

                    {/* Eliminar Mes */}
                    <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid #ef4444' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                        <Trash2 size={28} color="#ef4444" />
                        <h3 style={{ margin: 0 }}>Eliminar Ventas Mes</h3>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                        Borra todas las órdenes y movimientos de caja del mes seleccionado ({analyticsDate}). 
                        <br/><b style={{color: '#ef4444'}}>Acción irreversible.</b>
                      </p>
                      <button onClick={() => openDangerModal('monthlyOrders')} className="btn-table-action" style={{ width: '100%', padding: 12, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>
                        Eliminar Datos Mes
                      </button>
                    </div>

                     {/* Eliminar Clientes */}
                     <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid #ef4444' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                        <Users size={28} color="#ef4444" />
                        <h3 style={{ margin: 0 }}>Purgar Clientes</h3>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                        Elimina todos los clientes de la base de datos excepto el genérico.
                        <br/><b style={{color: '#ef4444'}}>Solo usar en desarrollo.</b>
                      </p>
                      <button onClick={() => openDangerModal('allClients')} className="btn-table-action" style={{ width: '100%', padding: 12, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>
                        Borrar Todos los Clientes
                      </button>
                    </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* PANEL CLIENTE LATERAL (MODULARIZADO) */}
      <ClientDetailsPanel
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        clientHistoryLoading={clientHistoryLoading}
        selectedClientOrders={selectedClientOrders}
        setReceiptModalOrder={setReceiptModalOrder}
      />

      {/* MODAL CLAVE */}
      {isDangerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDangerModalOpen(false)}>
          <div className="admin-side-panel glass animate-slide-in" style={{ maxWidth: 350, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <div className="flex-center"><AlertCircle size={22} className="text-accent" /><h3>Confirmar</h3></div>
              <button onClick={() => setIsDangerModalOpen(false)} className="btn-close-sidepanel"><XCircle size={24} /></button>
            </div>
            <div className="admin-side-body" style={{ overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '0.9rem', marginBottom: 20 }}>Acción irreversible. Ingresa credenciales.</p>
              <div className="form-group">
                <label>Email Admin</label>
                <input 
                  className="form-input" 
                  placeholder="admin@ejemplo.com" 
                  value={dangerUserName} 
                  onChange={e => setDangerUserName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeDangerAction()}
                />
              </div>
              <div className="form-group">
                <label>Clave</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={dangerPassword} 
                  onChange={e => setDangerPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeDangerAction()}
                />
              </div>
              {dangerError && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: 10 }}>{dangerError}</div>}
            </div>
            <div className="admin-side-footer" style={{ marginTop: 'auto' }}>
              <button 
                className="btn btn-primary btn-block" 
                onClick={executeDangerAction}
                disabled={loading}
                style={{ background: '#ff4444', color: 'white', border: 'none' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar y Borrar'}
              </button>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, justifyContent: 'center', position: 'relative' }}>
                      <img src={receiptPreview} alt="Preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid white' }} />
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Imagen Seleccionada</span>
                        <span style={{ fontSize: '0.75rem', color: '#25d366' }}>Click para cambiar</span>
                        <button 
                          type="button" 
                          className="btn-text" 
                          style={{ color: '#ff4444', fontSize: '0.75rem', padding: 0, marginTop: 4 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptPreview(null);
                            document.getElementById('receipt-upload-modal').value = '';
                          }}
                        >
                          Quitar
                        </button>
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
