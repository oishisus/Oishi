import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, Search, Filter, CheckCircle2, AlertCircle,
  Package, DollarSign, Star, Trophy, PieChart,
  Upload, PlusCircle, X, XCircle, Trash2, FileText, Plus, Edit, RefreshCw, ArrowDownCircle
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
import ClientDetailsPanel from '../components/admin/ClientDetailsPanel';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import CashManager from '../components/admin/caja/CashManager';
import { useCashSystem } from '../hooks/caja/useCashSystem';
import '../styles/AdminLayout.css';
import '../styles/AdminAnalytics.css';
import '../styles/AdminShared.css';
import '../styles/AdminCategories.css';

// --- CONFIGURACIÓN ---
const PAGE_SIZE = 50;
const MAX_FILE_SIZE_MB = 5;

// --- CAPA DE SANEAMIENTO MEJORADA (DEFENSIVE CODING) ---
const sanitizeOrder = (rawOrder) => {
  if (!rawOrder) return null;
  
  let cleanItems = [];
  // Manejo robusto de JSON parse
  if (rawOrder.items) {
    if (Array.isArray(rawOrder.items)) {
      cleanItems = rawOrder.items;
    } else if (typeof rawOrder.items === 'string') {
      try {
        const parsed = JSON.parse(rawOrder.items);
        cleanItems = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn(`Error parseando items orden ${rawOrder.id}`, e);
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
    created_at: rawOrder.created_at || new Date().toISOString(),
    // Asegurar que payment_type exista para evitar undefined en filtros
    payment_type: rawOrder.payment_type || 'unknown'
  };
};

// Validar imagen antes de subir (QA Requirement)
const validateFile = (file) => {
  if (!file) return { valid: false, msg: "No hay archivo" };
  if (!file.type.startsWith('image/')) return { valid: false, msg: "Solo se permiten imágenes" };
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return { valid: false, msg: `Imagen muy pesada (Máx ${MAX_FILE_SIZE_MB}MB)` };
  return { valid: true };
};

// Escapar CSV correctamente (RFC 4180)
const escapeCsvCell = (cell) => {
  if (cell == null) return '';
  const str = String(cell);
  // Si contiene comillas, comas o saltos de línea, envolver en comillas y duplicar comillas internas
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const Admin = () => {
  const navigate = useNavigate();

  // --- ESTADOS DE DATOS ---
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);

  // --- PAGINACIÓN Y CARGA ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [ordersPage, setOrdersPage] = useState(0);

  // --- ESTADOS DE INTERFAZ ---
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [mobileTab, setMobileTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [notification, setNotification] = useState(null);

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

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
  const [isSubmittingDanger, setIsSubmittingDanger] = useState(false);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- SISTEMA DE CAJA (HOOK) ---
  useCashSystem(showNotify);

  // --- 1. CARGA DE DATOS OPTIMIZADA (Adiós select *) ---
  
  // Carga inicial: Categorías, Productos y Órdenes Recientes (Página 0)
  const loadInitialData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Cargar configuración estática (Categorías y Productos)
      const [catsRes, prodsRes] = await Promise.all([
        supabase.from('categories').select('*').order('order'),
        supabase.from('products').select('*').order('name')
      ]);

      if (catsRes.error) throw catsRes.error;
      if (prodsRes.error) throw prodsRes.error;

      setCategories(catsRes.data || []);
      setProducts(prodsRes.data || []);

      // 2. Cargar Órdenes (Solo la primera página para inicio rápido)
      // Range: 0 a 49 (50 items)
      const { data: ordsData, error: ordsError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (ordsError) throw ordsError;

      const cleanOrders = (ordsData || []).map(sanitizeOrder);
      setOrders(cleanOrders);
      setOrdersPage(1); // Lista para cargar la siguiente página
      setHasMoreOrders(cleanOrders.length === PAGE_SIZE);

      // 3. Cargar Clientes (Limitado para no explotar, usar búsqueda para el resto)
      const { data: cltsData, error: cltsError } = await supabase
        .from('clients')
        .select('*')
        .order('last_order_at', { ascending: false })
        .limit(100); // Límite inicial de clientes

      if (cltsError) throw cltsError;
      setClients(cltsData || []);

    } catch (error) {
      console.error("Error cargando datos:", error);
      showNotify("Error de conexión al cargar datos", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showNotify]);

  // Función para cargar más historial (Paginación)
  const loadMoreOrders = async () => {
    if (loadingMoreOrders || !hasMoreOrders) return;
    setLoadingMoreOrders(true);

    try {
      const from = ordersPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data.length > 0) {
        const newOrders = data.map(sanitizeOrder);
        // Evitar duplicados por si acaso
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id));
          const filteredNew = newOrders.filter(o => !existingIds.has(o.id));
          return [...prev, ...filteredNew];
        });
        setOrdersPage(prev => prev + 1);
        if (data.length < PAGE_SIZE) setHasMoreOrders(false);
      } else {
        setHasMoreOrders(false);
      }
    } catch {
      showNotify('Error cargando historial antiguo', 'error');
    } finally {
      setLoadingMoreOrders(false);
    }
  };

  // --- 2. REALTIME OPTIMIZADO (Surgical Updates) ---
  useEffect(() => {
    loadInitialData();
    
    let channel = null;
    let isMounted = true;
    
    const setupRealtime = async () => {
      // Verificar sesión (Seguridad)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // No conectar si no hay sesión
      
      channel = supabase.channel('admin-realtime-v2')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, (payload) => {
          if (!isMounted) return;

          // LOGICA QUIRÚRGICA: No recargar todo con loadInitialData()
          if (payload.eventType === 'INSERT') {
            const newOrder = sanitizeOrder(payload.new);
            setOrders(prev => [newOrder, ...prev]);
            showNotify(`Nuevo pedido de ${newOrder.client_name}`, 'success');
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedOrder = sanitizeOrder(payload.new);
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          } 
          else if (payload.eventType === 'DELETE') {
             setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        })
        .subscribe();
    };
    
    setupRealtime();
    
    return () => { 
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadInitialData, showNotify]);

  // --- 3. GESTIÓN DE PEDIDOS (Optimistic UI) ---
  const moveOrder = async (orderId, nextStatus) => {
    // 1. Guardar estado anterior por si falla
    const previousOrders = [...orders];
    
    // 2. Actualización optimista inmediata
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    try {
      const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
      if (error) throw error;
      showNotify('Pedido actualizado');
    } catch (error) {
      // 3. Rollback si falla
      setOrders(previousOrders);
      showNotify("Error al sincronizar cambio", "error");
      console.error(error);
    }
  };

  // Carga de historial cliente (Bajo demanda)
  const loadClientHistory = async (client) => {
    if (!client) return;
    setClientHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20); // Limitar historial en modal

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

  // --- 4. SUBIDA DE COMPROBANTES ---
  const uploadReceiptToOrder = async (orderId, file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      showNotify(validation.msg, 'error');
      return;
    }

    setUploadingReceipt(true);
    try {
      const receiptUrl = await uploadImage(file, 'receipts');
      
      const { error } = await supabase.from('orders').update({ payment_ref: receiptUrl }).eq('id', orderId);
      if (error) throw error;

      // Actualizar estado local
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_ref: receiptUrl } : o));
      if (selectedClient) {
        setSelectedClientOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_ref: receiptUrl } : o));
      }

      showNotify('Comprobante agregado');
      setReceiptModalOrder(null);
      setReceiptPreview(null);
    } catch (error) {
      showNotify('Error al subir: ' + error.message, 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        setReceiptPreview(URL.createObjectURL(file));
      } else {
        showNotify(validation.msg, 'error');
        e.target.value = ''; // Reset input
      }
    }
  };

  // --- 5. GESTIÓN DE PRODUCTOS & CATEGORÍAS ---
  const handleSaveProduct = async (formData, localFile) => {
    // Validar archivo si existe
    if (localFile) {
      const val = validateFile(localFile);
      if (!val.valid) {
        showNotify(val.msg, 'error');
        return;
      }
    }

    setRefreshing(true); // Loading ligero
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
        // Actualizar estado local sin recargar todo
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...payload, id: p.id } : p));
      } else {
        const { data } = await supabase.from('products').insert(payload).select();
        if (data && data[0]) {
          setProducts(prev => [...prev, data[0]]);
        }
        showNotify("Producto creado");
      }
      setIsModalOpen(false);
    } catch (error) {
      showNotify("Error: " + error.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Producto eliminado");
    } catch {
      showNotify("No se puede eliminar (tiene ventas asociadas)", 'error');
    }
  };

  const toggleProductActive = async (product, e) => {
    e.stopPropagation();
    const newActive = !product.is_active;
    // UI Optimista
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newActive } : p));
    
    try {
      await supabase.from('products').update({ is_active: newActive }).eq('id', product.id);
      showNotify(newActive ? 'Producto activado' : 'Producto pausado');
    } catch {
      // Revertir
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !newActive } : p));
      showNotify('Error al cambiar estado', 'error');
    }
  };

  const handleSaveCategory = async (formData) => {
    try {
      const payload = { name: formData.name, order: parseInt(formData.order), is_active: formData.is_active };
      if (editingCategory) {
        await supabase.from('categories').update(payload).eq('id', editingCategory.id);
        // Actualizar local
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...payload } : c));
      } else {
        const id = formData.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
        const { data } = await supabase.from('categories').insert({ ...payload, id }).select();
        if (data) setCategories(prev => [...prev, data[0]]);
      }
      setIsCategoryModalOpen(false);
      showNotify('Categoría guardada');
    } catch {
      showNotify('Error al guardar', 'error');
    }
  };

  // --- 6. EXPORTACIÓN CSV ROBUSTA ---
  const handleExportMonthlyCsv = async () => {
    const [year, month] = analyticsDate.split('-');
    
    // Fetch específico para el reporte (no usar estado local incompleto)
    showNotify("Generando reporte...", "info");
    
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 0, 23, 59, 59).toISOString();
    
    const { data: reportOrders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at');

    if (error || !reportOrders || reportOrders.length === 0) {
      showNotify("No hay datos o error al descargar", 'error');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Cliente', 'RUT', 'Teléfono', 'Items', 'Total', 'Método Pago', 'Ref. Pago'];
    const lines = [headers.join(',')];

    reportOrders.forEach(raw => {
      const order = sanitizeOrder(raw);
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
      
      // Usar la función de escape robusta
      const escapedRow = row.map(escapeCsvCell);
      lines.push(escapedRow.join(','));
    });

    const csvContent = "\uFEFF" + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cierre_Oishi_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotify('Reporte descargado', 'success');
  };

  // --- 7. ZONA DE PELIGRO ---
  const executeDangerAction = async () => {
    const trimmedEmail = dangerUserName.trim();
    if (!trimmedEmail || !dangerPassword) {
      setDangerError('Ingresa credenciales de administrador');
      return;
    }

    setDangerError(null);
    setIsSubmittingDanger(true);

    try {
      // 1. Re-autenticación (Seguridad Crítica)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: dangerPassword
      });

      if (authError) {
        setDangerError('Credenciales inválidas o sin permisos');
        setIsSubmittingDanger(false);
        return;
      }

      setIsDangerModalOpen(false);

      if (dangerAction === 'monthlyOrders') {
        const [year, month] = analyticsDate.split('-');
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month, 0, 23, 59, 59).toISOString();

        // Borrar movimientos caja primero (FK)
        await supabase.from('cash_movements').delete().gte('created_at', start).lte('created_at', end);
        // Borrar órdenes
        const { error } = await supabase.from('orders').delete().gte('created_at', start).lte('created_at', end);

        if (error) throw error;
        // Limpiar estado local
        setOrders(prev => prev.filter(o => {
          const d = new Date(o.created_at);
          return !(d.getFullYear() === parseInt(year) && d.getMonth() + 1 === parseInt(month));
        }));
        showNotify(`Registros del mes eliminados`, 'success');

      } else if (dangerAction === 'allClients') {
        const { count, error } = await supabase.from('clients').delete().neq('phone', '0000').select('*', { count: 'exact' });
        if (error) throw error;
        setClients([]); // Limpiar local
        showNotify(`Clientes eliminados (${count})`, 'success');
      }

      // Audit Log
      await supabase.from('audit_logs').insert({
        actor_name: trimmedEmail,
        action: dangerAction,
        created_at: new Date().toISOString()
      }).catch(err => console.warn('Audit fail', err));

    } catch (e) {
      showNotify(`Error crítico: ${e.message}`, 'error');
    } finally {
      setIsSubmittingDanger(false);
    }
  };

  const openDangerModal = (action) => {
    setDangerAction(action);
    setDangerUserName('');
    setDangerPassword('');
    setDangerError(null);
    setIsDangerModalOpen(true);
  };

  // --- 8. ESTADÍSTICAS (MEMOIZADAS) ---
  const analyticsData = useMemo(() => {
    // Calculamos solo sobre las órdenes cargadas en memoria. 
    // Nota: Para analíticas perfectas históricas, se debería hacer query al backend, 
    // pero para MVP esto funciona con las órdenes recientes cargadas.
    if (!orders.length) return null;
    
    // Filtramos solo completadas para dinero real
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
      if (o.payment_type === 'online' || o.payment_type === 'transfer') payments.online++;
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


  // --- RENDERIZADO ---
  if (loading && !refreshing && products.length === 0 && orders.length === 0) return (
    <div className="admin-layout flex-center" style={{ height: '100vh', background: '#0a0a0a', flexDirection: 'column', gap: 20 }}>
      <Loader2 className="animate-spin" size={60} color="#e63946" />
      <h3 style={{ color: 'white' }}>Cargando Sistema Oishi...</h3>
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
            <button onClick={() => loadInitialData(true)} className="btn-icon-refresh" disabled={refreshing} title="Recargar datos">
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
            <div className="history-view-container">
              <AdminHistoryTable orders={kanbanColumns.history} />
              {/* BOTÓN CARGAR MÁS (Paginación) */}
              {hasMoreOrders && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <button 
                    onClick={loadMoreOrders} 
                    className="btn btn-secondary glass" 
                    disabled={loadingMoreOrders}
                    style={{ minWidth: 200 }}
                  >
                    {loadingMoreOrders ? <Loader2 className="animate-spin" size={20} /> : <><ArrowDownCircle size={20} style={{marginRight:8}}/> Cargar más antiguos</>}
                  </button>
                </div>
              )}
            </div>
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
                  <h4>Ingresos (Visible)</h4>
                  <span className="kpi-value">${analyticsData.totalIncome.toLocaleString('es-CL')}</span>
                </div>
              </div>
              <div className="kpi-card glass">
                <div className="kpi-icon orders"><Package size={24} /></div>
                <div>
                  <h4>Pedidos (Visible)</h4>
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
                    <span>Online/Transfer</span>
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
          <div className="settings-view animate-fade" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid var(--accent-success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                <FileText size={28} color="#25d366" />
                <h3 style={{ margin: 0 }}>Cierre Mensual</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                Descargar Excel completo del mes seleccionado.
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
                Acciones irreversibles. Requiere re-autenticación.
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

      {/* PANEL CLIENTE LATERAL (MODULARIZADO) */}
      <ClientDetailsPanel
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        clientHistoryLoading={clientHistoryLoading}
        selectedClientOrders={selectedClientOrders}
        setReceiptModalOrder={setReceiptModalOrder}
      />

      {/* MODAL CLAVE (DANGER ZONE) */}
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
                disabled={isSubmittingDanger}
                style={{ background: '#ff4444', color: 'white', border: 'none' }}
              >
                {isSubmittingDanger ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar y Borrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE */}
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
                <label>Subir nuevo comprobante (Máx 5MB)</label>
                <div className="upload-box" onClick={() => document.getElementById('receipt-upload-modal').click()} style={{ borderColor: receiptPreview ? '#25d366' : 'var(--card-border)' }}>
                  <input type="file" id="receipt-upload-modal" accept="image/*" hidden onChange={handleReceiptFileChange} />
                  {receiptPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, justifyContent: 'center', position: 'relative' }}>
                      <img src={receiptPreview} alt="Preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid white' }} />
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Imagen Lista</span>
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
        onOrderSaved={() => loadInitialData(true)}
        isMobile={isMobile}
        showNotify={showNotify}
      />

      <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} product={editingProduct} categories={categories} />
      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={handleSaveCategory} category={editingCategory} />
    </div>
  );
};

export default Admin;