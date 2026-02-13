import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, List, Settings, Plus, Edit, Trash, LogOut, 
  Loader2, Search, Filter, CheckCircle2, AlertCircle, 
  Eye, EyeOff, BarChart3, Package, DollarSign,
  ChefHat, Clock, XCircle, RefreshCw, 
  Phone, Users, Trash2, FileText, X, Star, Trophy, PieChart,
  Image as ImageIcon, Upload, PlusCircle, Store
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png'; 

// CLAVE DE SEGURIDAD
const SECURITY_DELETE_KEY = '1234';

// --- CAPA DE SANEAMIENTO (EL PORTERO) ---
// Esta función limpia los datos ANTES de que entren a la app.
// Evita pantallas negras y errores por datos corruptos.
const sanitizeOrder = (rawOrder) => {
  let cleanItems = [];
  
  // 1. Intentar arreglar el campo 'items' si viene roto o como texto
  if (rawOrder.items) {
    if (Array.isArray(rawOrder.items)) {
      cleanItems = rawOrder.items;
    } else if (typeof rawOrder.items === 'string') {
      try {
        const parsed = JSON.parse(rawOrder.items);
        cleanItems = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        cleanItems = []; // Si está corrupto, devolver vacío para no romper la app
      }
    }
  }

  // 2. Devolver objeto seguro
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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

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
      // Carga paralela para mayor velocidad
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

      // SANEAMIENTO: Limpiamos los pedidos al llegar
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

  // Cargar historial de un cliente específico
  const loadClientHistory = async (client) => {
    if (!client) return;
    setClientHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', client.id) // Aquí usamos el vínculo que crea tu CartModal
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Saneamos también el historial
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
    // Suscripción Realtime
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData(true))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { /* Conectado */ }
      });
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

  // Subir comprobante a un pedido
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
      
      // Actualizar estado local
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

  // Crear pedido manual
  const [manualOrder, setManualOrder] = useState({
    client_name: '',
    client_rut: '',
    client_phone: '',
    items: [],
    total: 0,
    payment_type: 'efectivo',
    note: ''
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [manualOrderReceiptFile, setManualOrderReceiptFile] = useState(null);
  const [manualOrderReceiptPreview, setManualOrderReceiptPreview] = useState(null);

  const addItemToManualOrder = () => {
    if (!selectedProduct || itemQuantity < 1) return;
    const newItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      quantity: itemQuantity,
      price: selectedProduct.price
    };
    setManualOrder(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      total: prev.total + (selectedProduct.price * itemQuantity)
    }));
    setSelectedProduct(null);
    setItemQuantity(1);
  };

  const removeItemFromManualOrder = (index) => {
    const item = manualOrder.items[index];
    setManualOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      total: prev.total - (item.price * item.quantity)
    }));
  };

  const saveManualOrder = async () => {
    if (!manualOrder.client_name || !manualOrder.client_phone || manualOrder.items.length === 0) {
      showNotify('Completa todos los campos requeridos', 'error');
      return;
    }

    // Validar comprobante si es transferencia
    if (manualOrder.payment_type === 'online' && !manualOrderReceiptFile) {
      showNotify('Debes subir un comprobante para pedidos por transferencia', 'error');
      return;
    }

    setLoading(true);
    try {
      // Subir comprobante si existe
      let receiptUrl = '';
      if (manualOrder.payment_type === 'efectivo') {
        receiptUrl = 'Pago en Efectivo';
      } else if (manualOrder.payment_type === 'tarjeta') {
        receiptUrl = 'Pago con Tarjeta';
      } else if (manualOrderReceiptFile) {
        const fileExt = manualOrderReceiptFile.name.split('.').pop();
        const fileName = `receipts/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        
        const { error: upErr } = await supabase.storage.from('images').upload(fileName, manualOrderReceiptFile);
        if (upErr) throw upErr;
        
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        receiptUrl = data.publicUrl;
      }

      // Buscar o crear cliente
      let clientId = null;
      if (manualOrder.client_rut) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, total_spent, total_orders')
          .eq('rut', manualOrder.client_rut)
          .single();

        if (existingClient) {
          clientId = existingClient.id;
          await supabase.from('clients').update({
            name: manualOrder.client_name,
            phone: manualOrder.client_phone,
            total_spent: (existingClient.total_spent || 0) + manualOrder.total,
            total_orders: (existingClient.total_orders || 0) + 1,
            last_order_at: new Date().toISOString()
          }).eq('id', clientId);
        } else {
          const { data: newClient } = await supabase.from('clients').insert({
            name: manualOrder.client_name,
            phone: manualOrder.client_phone,
            rut: manualOrder.client_rut,
            total_spent: manualOrder.total,
            total_orders: 1,
            last_order_at: new Date().toISOString()
          }).select('id').single();
          clientId = newClient.id;
        }
      } else {
        // Crear cliente sin RUT
        const { data: newClient } = await supabase.from('clients').insert({
          name: manualOrder.client_name,
          phone: manualOrder.client_phone,
          total_spent: manualOrder.total,
          total_orders: 1,
          last_order_at: new Date().toISOString()
        }).select('id').single();
        clientId = newClient.id;
      }

      // Crear pedido
      await supabase.from('orders').insert({
        client_id: clientId,
        client_name: manualOrder.client_name,
        client_rut: manualOrder.client_rut || '',
        client_phone: manualOrder.client_phone,
        items: manualOrder.items,
        total: manualOrder.total,
        payment_type: manualOrder.payment_type,
        payment_ref: receiptUrl,
        note: manualOrder.note,
        status: 'pending'
      });

      showNotify('Pedido creado exitosamente');
      setIsManualOrderModalOpen(false);
      setManualOrder({
        client_name: '',
        client_rut: '',
        client_phone: '',
        items: [],
        total: 0,
        payment_type: 'efectivo',
        note: ''
      });
      setManualOrderReceiptFile(null);
      setManualOrderReceiptPreview(null);
      loadData(true);
    } catch (error) {
      showNotify('Error al crear pedido: ' + error.message, 'error');
    } finally {
      setLoading(false);
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
    if(!window.confirm('¿Eliminar producto?')) return;
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
    setProducts(prev => prev.map(p => p.id === product.id ? {...p, is_active: newActive} : p));
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
        await supabase.from('categories').insert({...payload, id});
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
    
    // Filtrar usando los datos ya limpios en memoria
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
      
      // Auditoría
      await supabase.from('audit_logs').insert({
        actor_name: trimmedName,
        action: dangerAction,
        created_at: new Date().toISOString()
      }).catch(() => {}); 

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

    // 1. Ingresos Totales (Solo completados/entregados)
    const validOrders = orders.filter(o => o.status === 'completed' || o.status === 'picked_up');
    const totalIncome = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    // 2. Productos Más Vendidos (Top 5)
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

    // 3. Ventas por Método de Pago
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

  const getTimeElapsed = (dateString) => {
    const diff = new Date() - new Date(dateString);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  };

  // --- COMPONENTES UI (SIMPLIFICADOS) ---
  const OrderCard = ({ order }) => (
    <div className={`kanban-card glass animate-slide-up ${order.status === 'pending' ? 'urgent-pulse' : ''}`}>
      <div className="card-header-row">
        <span className="order-time"><Clock size={12}/> {getTimeElapsed(order.created_at)}</span>
        <span className="payment-badge">
          {order.payment_type === 'online' ? 'Transf.' : 
           order.payment_type === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
        </span>
      </div>
      <div className="card-client">
        <h4>{order.client_name}</h4>
        <div style={{fontSize: '0.75rem', opacity: 0.6}}>{order.client_rut}</div>
      </div>
      <div className="card-items">
        {order.items.map((item, idx) => (
          <div key={idx} className="order-item-row">
            <span className="qty-circle">{item.quantity}</span>
            <span className="item-name">{item.name}</span>
          </div>
        ))}
      </div>
      {order.note && <div className="card-note">📝 {order.note}</div>}
      
      {/* COMPROBANTE */}
      {order.payment_type === 'online' && (
        <div style={{marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center'}}>
          {order.payment_ref && order.payment_ref.startsWith('http') ? (
            <>
              <a href={order.payment_ref} target="_blank" rel="noreferrer" style={{display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', fontSize: '0.8rem', textDecoration: 'none'}}>
                <ImageIcon size={14}/> Ver Comprobante
              </a>
              <button onClick={() => setReceiptModalOrder(order)} style={{background: 'none', border: 'none', color: '#aaa', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline'}}>
                Cambiar
              </button>
            </>
          ) : (
            <button onClick={() => setReceiptModalOrder(order)} style={{display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer'}}>
              <Upload size={12}/> Agregar Comprobante
            </button>
          )}
        </div>
      )}
      
      <div className="card-total">Total: ${order.total.toLocaleString('es-CL')}</div>
      <div className="card-actions">
        {order.status === 'pending' && (
          <>
            <button onClick={() => moveOrder(order.id, 'canceled')} className="btn-icon-action cancel"><XCircle size={20}/></button>
            <button onClick={() => moveOrder(order.id, 'active')} className="btn-action primary">A Cocina</button>
          </>
        )}
        {order.status === 'active' && <button onClick={() => moveOrder(order.id, 'completed')} className="btn-action success">Listo</button>}
        {order.status === 'completed' && <button onClick={() => moveOrder(order.id, 'picked_up')} className="btn-action info">Entregado</button>}
      </div>
    </div>
  );

  const InventoryCard = ({ product }) => (
    <div className={`inventory-card glass ${!product.is_active ? 'inactive' : ''}`} onClick={() => {setEditingProduct(product); setIsModalOpen(true)}}>
      <div className="inv-img-wrapper">
        <img src={product.image_url || logo} alt={product.name} onError={(e) => e.target.src = logo} />
        <div className="inv-status-toggle" onClick={(e) => toggleProductActive(product, e)}>
          {product.is_active ? <Eye size={16}/> : <EyeOff size={16}/>}
        </div>
      </div>
      <div className="inv-info">
        <div className="inv-header">
          <h4>{product.name}</h4>
          <span className="inv-price">${product.price.toLocaleString('es-CL')}</span>
        </div>
        <div className="inv-actions">
          <span className={`status-badge ${product.is_active ? 'active' : 'paused'}`}>
            {product.is_active ? 'En Venta' : 'Pausado'}
          </span>
          <button onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }} className="btn-trash-sm"><Trash size={14}/></button>
        </div>
      </div>
    </div>
  );

  if (loading && !refreshing && products.length === 0 && orders.length === 0) return (
    <div className="admin-layout flex-center" style={{height:'100vh', background: '#0a0a0a', flexDirection:'column', gap:20}}>
      <Loader2 className="animate-spin" size={60} color="#e63946" />
      <h3 style={{color:'white'}}>Cargando Sistema...</h3>
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

      {/* SIDEBAR */}
      <aside className="admin-sidebar glass">
        <div className="sidebar-top">
          <div className="logo-circle"><img src={logo} alt="Logo" /></div>
          {!isMobile && <h3 className="brand-title">Oishi Admin</h3>}
        </div>
        <nav className="sidebar-menu">
          <button onClick={() => setActiveTab('orders')} className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}>
            <ChefHat size={22} /> {!isMobile && 'Pedidos'}
            {kanbanColumns.pending.length > 0 && <span className="badge-count">{kanbanColumns.pending.length}</span>}
          </button>
          <button onClick={() => setActiveTab('products')} className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}>
            <ShoppingBag size={22} /> {!isMobile && 'Inventario'}
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}>
            <BarChart3 size={22} /> {!isMobile && 'Reportes'}
          </button>
          <button onClick={() => setActiveTab('clients')} className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`}>
            <Users size={22} /> {!isMobile && 'Clientes'}
          </button>
          <button onClick={() => setActiveTab('categories')} className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}>
            <List size={22} /> {!isMobile && 'Categorías'}
          </button>
          <button onClick={() => setActiveTab('settings')} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}>
            <Settings size={22} /> {!isMobile && 'Herramientas'}
          </button>
        </nav>
        <button onClick={() => navigate('/')} className="nav-item logout">
          <LogOut size={22} /> {!isMobile && 'Salir'}
        </button>
      </aside>

      {/* MAIN CONTENT */}
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
            <>
              <div className="mobile-tabs">
                <button onClick={() => setMobileTab('pending')} className={mobileTab === 'pending' ? 'active' : ''}>Entrantes ({kanbanColumns.pending.length})</button>
                <button onClick={() => setMobileTab('active')} className={mobileTab === 'active' ? 'active' : ''}>Cocina ({kanbanColumns.active.length})</button>
                <button onClick={() => setMobileTab('completed')} className={mobileTab === 'completed' ? 'active' : ''}>Listos ({kanbanColumns.completed.length})</button>
              </div>
              <div className="kanban-board">
                <div className={`kanban-column col-pending ${isMobile && mobileTab !== 'pending' ? 'hidden' : ''}`}>
                  <div className="column-header"><span className="dot dot-orange"></span><h3>ENTRANTES</h3><span className="count">{kanbanColumns.pending.length}</span></div>
                  <div className="column-body">
                    {kanbanColumns.pending.length === 0 ? <div className="empty-zone">Sin pedidos</div> : kanbanColumns.pending.map(o => <OrderCard key={o.id} order={o} />)}
                  </div>
                </div>
                <div className={`kanban-column col-active ${isMobile && mobileTab !== 'active' ? 'hidden' : ''}`}>
                  <div className="column-header"><span className="dot dot-red"></span><h3>COCINANDO</h3><span className="count">{kanbanColumns.active.length}</span></div>
                  <div className="column-body">
                    {kanbanColumns.active.length === 0 ? <div className="empty-zone">Cocina libre</div> : kanbanColumns.active.map(o => <OrderCard key={o.id} order={o} />)}
                  </div>
                </div>
                <div className={`kanban-column col-completed ${isMobile && mobileTab !== 'completed' ? 'hidden' : ''}`}>
                  <div className="column-header"><span className="dot dot-green"></span><h3>LISTOS</h3><span className="count">{kanbanColumns.completed.length}</span></div>
                  <div className="column-body">
                    {kanbanColumns.completed.length === 0 ? <div className="empty-zone">Nada listo</div> : kanbanColumns.completed.map(o => <OrderCard key={o.id} order={o} />)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="history-view glass animate-fade">
              <table className="data-table">
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Estado</th><th>Total</th></tr></thead>
                <tbody>
                  {kanbanColumns.history.map(o => (
                    <tr key={o.id}>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td>{o.client_name}</td>
                      <td><span className={`status-pill ${o.status}`}>{o.status === 'picked_up' ? 'Entregado' : 'Cancelado'}</span></td>
                      <td>${o.total.toLocaleString('es-CL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* 2. INVENTARIO */}
        {activeTab === 'products' && (
           <div className="products-view animate-fade">
             <div className="admin-toolbar glass">
               <div className="search-box">
                  <Search size={18} />
                  <input placeholder="Buscar plato..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
               </div>
               <div className="filter-box">
                  <Filter size={18} />
                  <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                    <option value="all">Todas las categorías</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
             </div>
             <div className="inventory-grid">
               {products
                 .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                 .filter(p => filterCategory === 'all' || p.category_id === filterCategory)
                 .map(p => <InventoryCard key={p.id} product={p} />)
               }
             </div>
           </div>
        )}

        {/* 3. REPORTES */}
        {activeTab === 'analytics' && analyticsData && (
          <div className="analytics-view animate-fade">
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card glass">
                <div className="kpi-icon money"><DollarSign size={24}/></div>
                <div>
                   <h4>Ingresos Totales</h4>
                   <span className="kpi-value">${analyticsData.totalIncome.toLocaleString('es-CL')}</span>
                </div>
              </div>
              <div className="kpi-card glass">
                <div className="kpi-icon orders"><Package size={24}/></div>
                <div>
                   <h4>Pedidos Completados</h4>
                   <span className="kpi-value">{analyticsData.totalOrders}</span>
                </div>
              </div>
              <div className="kpi-card glass">
                <div className="kpi-icon star"><Star size={24}/></div>
                <div>
                   <h4>Ticket Promedio</h4>
                   <span className="kpi-value">
                     ${analyticsData.totalOrders ? Math.round(analyticsData.totalIncome / analyticsData.totalOrders).toLocaleString('es-CL') : 0}
                   </span>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              {/* Top Productos */}
              <div className="chart-card glass">
                <div className="chart-header">
                  <Trophy size={20} color="#f4a261"/>
                  <h3>Platos Más Vendidos</h3>
                </div>
                <div className="top-products-list">
                  {analyticsData.sortedProducts.map((p, idx) => (
                    <div key={idx} className="top-product-item">
                      <div className="rank-num">#{idx+1}</div>
                      <div className="rank-info">
                        <div className="rank-name">{p.name}</div>
                        <div className="rank-bar-bg">
                           <div className="rank-bar-fill" style={{width: `${analyticsData.sortedProducts[0]?.count ? (p.count / analyticsData.sortedProducts[0].count) * 100 : 0}%`}}></div>
                        </div>
                      </div>
                      <div className="rank-count">{p.count}</div>
                    </div>
                  ))}
                  {analyticsData.sortedProducts.length === 0 && <div className="empty-chart">Aún no hay ventas suficientes</div>}
                </div>
              </div>

              {/* Métodos de Pago */}
              <div className="chart-card glass">
                <div className="chart-header">
                  <PieChart size={20} color="#38bdf8"/>
                  <h3>Métodos de Pago</h3>
                </div>
                <div className="payment-stats">
                  <div className="pay-stat-row">
                     <span>Transferencia</span>
                     <div className="pay-bar">
                       <div className="pay-fill online" style={{width: `${(analyticsData.payments.online / (analyticsData.totalOrders || 1)) * 100}%`}}></div>
                     </div>
                     <span>{analyticsData.payments.online}</span>
                  </div>
                  <div className="pay-stat-row">
                     <span>Local (Efec/Tarj)</span>
                     <div className="pay-bar">
                       <div className="pay-fill store" style={{width: `${(analyticsData.payments.tienda / (analyticsData.totalOrders || 1)) * 100}%`}}></div>
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
          <div className="clients-view glass animate-fade">
            <div className="admin-toolbar" style={{padding:0, border:'none', marginBottom:20}}>
               <div className="search-box">
                  <Search size={18} />
                  <input placeholder="Buscar cliente..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
               </div>
            </div>
            <table className="data-table">
              <thead><tr><th>Nombre</th><th>RUT</th><th>Teléfono</th><th>Último Pedido</th><th>Total</th></tr></thead>
              <tbody>
                {clients.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.rut?.includes(searchQuery))
                  .map(c => (
                  <tr key={c.id} onClick={() => handleSelectClient(c)} style={{cursor: 'pointer'}}>
                    <td><b>{c.name}</b></td>
                    <td>{c.rut || '-'}</td>
                    <td>{c.phone}</td>
                    <td>{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : 'N/A'}</td>
                    <td style={{color:'#25d366', fontWeight:'800'}}>${(c.total_spent || 0).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. CATEGORÍAS */}
        {activeTab === 'categories' && (
           <div className="categories-list glass animate-fade">
             {categories.map(c => (
               <div key={c.id} className="cat-row-item">
                 <div className="cat-name-lg">{c.name}</div>
                 <button onClick={() => {setEditingCategory(c); setIsCategoryModalOpen(true)}} className="btn-icon-action"><Edit size={18}/></button>
               </div>
             ))}
           </div>
        )}

        {/* 6. HERRAMIENTAS */}
        {activeTab === 'settings' && (
          <div className="settings-view animate-fade" style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20}}>
            <div className="glass" style={{padding: 25, borderRadius: 16, border: '1px solid var(--accent-success)'}}>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:15}}>
                <FileText size={28} color="#25d366"/>
                <h3 style={{margin:0}}>Cierre Mensual</h3>
              </div>
              <p style={{color:'var(--text-secondary)', fontSize:'0.9rem', marginBottom:20}}>
                Exporta tus ventas a Excel.
              </p>
              <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                <input type="month" className="form-input" style={{width:'auto'}} value={analyticsDate} onChange={e=>setAnalyticsDate(e.target.value)} />
                <button onClick={handleExportMonthlyCsv} className="btn btn-primary" style={{background:'#25d366', color:'black', flex:1}}>
                  Descargar
                </button>
              </div>
            </div>

            <div className="glass" style={{padding: 25, borderRadius: 16, border: '1px solid #ff4444'}}>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:15}}>
                <Trash2 size={28} color="#ff4444"/>
                <h3 style={{margin:0}}>Zona de Peligro</h3>
              </div>
              <p style={{color:'var(--text-secondary)', fontSize:'0.9rem', marginBottom:20}}>
                Acciones irreversibles. Requiere clave.
              </p>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <button onClick={() => openDangerModal('monthlyOrders')} className="btn btn-secondary" style={{borderColor: '#ff4444', color: '#ff4444', justifyContent:'flex-start'}}>
                  Borrar Ventas del Mes
                </button>
                <button onClick={() => openDangerModal('allClients')} className="btn btn-secondary" style={{borderColor: '#ff4444', color: '#ff4444', justifyContent:'flex-start'}}>
                  Borrar Clientes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PANEL CLIENTE LATERAL (CON SANEAMIENTO) */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="admin-side-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <div style={{display:'flex', flexDirection:'column'}}>
                <h3 style={{margin:0}}>{selectedClient.name}</h3>
                <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>RUT: {selectedClient.rut}</span>
              </div>
              <button onClick={() => setSelectedClient(null)} className="btn-close-sidepanel"><X size={24}/></button>
            </div>
            
            <div className="admin-side-body">
              <div className="kpi-grid" style={{gridTemplateColumns:'1fr 1fr', marginBottom: 20}}>
                <div className="kpi-card" style={{padding:15, flexDirection:'column', alignItems:'flex-start', background:'rgba(255,255,255,0.05)'}}>
                  <span style={{fontSize:'0.75rem', color:'#aaa'}}>GASTO TOTAL</span>
                  <span style={{fontSize:'1.1rem', fontWeight:'800', color:'#25d366'}}>${(selectedClient.total_spent || 0).toLocaleString('es-CL')}</span>
                </div>
                <div className="kpi-card" style={{padding:15, flexDirection:'column', alignItems:'flex-start', background:'rgba(255,255,255,0.05)'}}>
                  <span style={{fontSize:'0.75rem', color:'#aaa'}}>PEDIDOS</span>
                  <span style={{fontSize:'1.1rem', fontWeight:'800'}}>{selectedClient.total_orders || 0}</span>
                </div>
              </div>

              <h4 style={{marginBottom:10, color:'var(--accent-secondary)'}}>Historial</h4>
              {clientHistoryLoading ? <div style={{textAlign:'center', padding:20}}><Loader2 className="animate-spin"/></div> : (
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {selectedClientOrders.length === 0 ? <p style={{textAlign:'center', opacity:0.6}}>Sin compras registradas con este ID.</p> :
                    selectedClientOrders.map(order => (
                      <div key={order.id} style={{background:'rgba(255,255,255,0.03)', padding:12, borderRadius:10, border:'1px solid var(--card-border)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', marginBottom:5}}>
                          <span style={{color:'var(--text-secondary)'}}>{new Date(order.created_at).toLocaleDateString('es-CL')}</span>
                          <span style={{fontWeight:'700'}}>${order.total.toLocaleString('es-CL')}</span>
                        </div>
                        <div style={{fontSize:'0.8rem', opacity:0.8, marginBottom:8}}>
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8}}>
                          <span className={`status-badge ${order.status === 'completed' || order.status === 'picked_up' ? 'active' : 'paused'}`} style={{fontSize:'0.7rem'}}>
                            {order.status === 'picked_up' ? 'Entregado' : order.status === 'completed' ? 'Completado' : order.status === 'active' ? 'En Cocina' : order.status === 'canceled' ? 'Cancelado' : 'Pendiente'}
                          </span>
                          <div style={{display:'flex', gap:8, alignItems:'center'}}>
                            {order.payment_ref && order.payment_ref.startsWith('http') ? (
                              <>
                                <a href={order.payment_ref} target="_blank" rel="noreferrer" style={{display:'flex', alignItems:'center', gap:4, color:'#3b82f6', fontSize:'0.75rem', textDecoration:'underline'}}>
                                  <ImageIcon size={12}/> Ver Comprobante
                                </a>
                                <button onClick={() => setReceiptModalOrder(order)} style={{background:'none', border:'none', color:'#aaa', fontSize:'0.7rem', cursor:'pointer', textDecoration:'underline'}}>
                                  Cambiar
                                </button>
                              </>
                            ) : order.payment_type === 'online' ? (
                              <button onClick={() => setReceiptModalOrder(order)} style={{display:'flex', alignItems:'center', gap:4, background:'rgba(59, 130, 246, 0.1)', border:'1px solid #3b82f6', color:'#3b82f6', padding:'4px 8px', borderRadius:6, fontSize:'0.7rem', cursor:'pointer'}}>
                                <Upload size={10}/> Agregar
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
          <div className="admin-side-panel glass animate-slide-in" style={{maxWidth:350}} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <div className="flex-center"><AlertCircle size={22} className="text-accent" /><h3>Confirmar</h3></div>
              <button onClick={() => setIsDangerModalOpen(false)} className="btn-close-sidepanel"><XCircle size={24}/></button>
            </div>
            <div className="admin-side-body">
              <p style={{fontSize: '0.9rem', marginBottom: 20}}>Acción irreversible. Ingresa credenciales.</p>
              <div className="form-group">
                <label>Usuario</label>
                <input className="form-input" value={dangerUserName} onChange={e => setDangerUserName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Clave</label>
                <input type="password" className="form-input" value={dangerPassword} onChange={e => setDangerPassword(e.target.value)} />
              </div>
              {dangerError && <div style={{color: '#ff4444', fontSize: '0.85rem', marginTop: 10}}>{dangerError}</div>}
            </div>
            <div className="admin-side-footer">
              <button className="btn btn-primary btn-block" onClick={executeDangerAction}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE */}
      {receiptModalOrder && (
        <div className="modal-overlay" onClick={() => { setReceiptModalOrder(null); setReceiptPreview(null); }}>
          <div className="admin-side-panel glass animate-slide-in" style={{maxWidth:450}} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <h3>Comprobante de Pago</h3>
              <button onClick={() => { setReceiptModalOrder(null); setReceiptPreview(null); }} className="btn-close-sidepanel"><X size={24}/></button>
            </div>
            <div className="admin-side-body">
              {receiptModalOrder.payment_ref && receiptModalOrder.payment_ref.startsWith('http') && !receiptPreview && (
                <div style={{marginBottom: 20}}>
                  <p style={{marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Comprobante actual:</p>
                  <a href={receiptModalOrder.payment_ref} target="_blank" rel="noreferrer" style={{display: 'block', marginBottom: 15}}>
                    <img src={receiptModalOrder.payment_ref} alt="Comprobante" style={{width: '100%', borderRadius: 8, border: '1px solid var(--card-border)'}} />
                  </a>
                </div>
              )}
              
              <div className="form-group">
                <label>Subir nuevo comprobante</label>
                <div className="upload-box" onClick={() => document.getElementById('receipt-upload-modal').click()} style={{borderColor: receiptPreview ? '#25d366' : 'var(--card-border)'}}>
                  <input type="file" id="receipt-upload-modal" accept="image/*" hidden onChange={handleReceiptFileChange} />
                  {receiptPreview ? (
                    <div style={{display:'flex', alignItems:'center', gap: 15, justifyContent:'center'}}>
                      <img src={receiptPreview} alt="Preview" style={{width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid white'}} />
                      <div style={{textAlign:'left'}}>
                        <span style={{display:'block', fontSize:'0.85rem', fontWeight:'bold', color:'white'}}>Imagen Seleccionada</span>
                        <span style={{fontSize:'0.75rem', color:'#25d366'}}>Click para cambiar</span>
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

      {/* MODAL PEDIDO MANUAL */}
      {isManualOrderModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsManualOrderModalOpen(false);
          setManualOrderReceiptFile(null);
          setManualOrderReceiptPreview(null);
        }}>
          <div className="admin-side-panel glass animate-slide-in" style={{maxWidth:500}} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <h3>Nuevo Pedido Manual</h3>
              <button onClick={() => {
                setIsManualOrderModalOpen(false);
                setManualOrderReceiptFile(null);
                setManualOrderReceiptPreview(null);
              }} className="btn-close-sidepanel"><X size={24}/></button>
            </div>
            <div className="admin-side-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>
              <div className="form-group">
                <label>Nombre Cliente *</label>
                <input 
                  className="form-input" 
                  value={manualOrder.client_name} 
                  onChange={e => setManualOrder(prev => ({...prev, client_name: e.target.value}))}
                  placeholder="Nombre completo"
                />
              </div>
              
              <div className="form-group">
                <label>RUT (opcional)</label>
                <input 
                  className="form-input" 
                  value={manualOrder.client_rut} 
                  onChange={e => setManualOrder(prev => ({...prev, client_rut: e.target.value}))}
                  placeholder="12.345.678-9"
                />
              </div>
              
              <div className="form-group">
                <label>Teléfono *</label>
                <input 
                  className="form-input" 
                  value={manualOrder.client_phone} 
                  onChange={e => setManualOrder(prev => ({...prev, client_phone: e.target.value}))}
                  placeholder="+56 9..."
                />
              </div>

              <div className="form-group">
                <label>Método de Pago</label>
                <select 
                  className="form-input" 
                  value={manualOrder.payment_type} 
                  onChange={e => {
                    setManualOrder(prev => ({...prev, payment_type: e.target.value}));
                    // Limpiar comprobante si cambia a método que no requiere comprobante
                    if (e.target.value !== 'online') {
                      setManualOrderReceiptFile(null);
                      setManualOrderReceiptPreview(null);
                    }
                  }}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="online">Transferencia</option>
                </select>
              </div>

              {manualOrder.payment_type === 'online' && (
                <div className="form-group">
                  <label>Comprobante de Transferencia *</label>
                  <div className="upload-box" onClick={() => document.getElementById('manual-receipt-upload').click()} style={{borderColor: manualOrderReceiptPreview ? '#25d366' : 'var(--card-border)'}}>
                    <input type="file" id="manual-receipt-upload" accept="image/*" hidden onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setManualOrderReceiptFile(file);
                        setManualOrderReceiptPreview(URL.createObjectURL(file));
                      }
                    }} />
                    {manualOrderReceiptPreview ? (
                      <div style={{display:'flex', alignItems:'center', gap: 15, justifyContent:'center'}}>
                        <img src={manualOrderReceiptPreview} alt="Preview" style={{width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid white'}} />
                        <div style={{textAlign:'left'}}>
                          <span style={{display:'block', fontSize:'0.85rem', fontWeight:'bold', color:'white'}}>Imagen Seleccionada</span>
                          <span style={{fontSize:'0.75rem', color:'#25d366'}}>Click para cambiar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <Upload size={24} />
                        <span>Subir comprobante</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Agregar Productos</label>
                <div style={{display: 'flex', gap: 8, marginBottom: 10}}>
                  <select 
                    className="form-input" 
                    value={selectedProduct?.id || ''} 
                    onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      setSelectedProduct(prod);
                    }}
                    style={{flex: 1}}
                  >
                    <option value="">Seleccionar producto</option>
                    {products.filter(p => p.is_active).map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.price.toLocaleString('es-CL')}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={itemQuantity} 
                    onChange={e => setItemQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    style={{width: 80}}
                  />
                  <button onClick={addItemToManualOrder} className="btn btn-primary" disabled={!selectedProduct}>
                    <Plus size={16}/>
                  </button>
                </div>
                
                {manualOrder.items.length > 0 && (
                  <div style={{background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginTop: 10}}>
                    {manualOrder.items.map((item, idx) => (
                      <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: idx < manualOrder.items.length - 1 ? '1px solid var(--card-border)' : 'none'}}>
                        <span style={{fontSize: '0.9rem'}}>{item.quantity}x {item.name}</span>
                        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                          <span style={{fontWeight: '700'}}>${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                          <button onClick={() => removeItemFromManualOrder(idx)} style={{background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer'}}>
                            <X size={16}/>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card-border)'}}>
                      <strong>Total:</strong>
                      <strong style={{fontSize: '1.1rem', color: '#25d366'}}>${manualOrder.total.toLocaleString('es-CL')}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Nota (opcional)</label>
                <textarea 
                  className="form-input" 
                  value={manualOrder.note} 
                  onChange={e => setManualOrder(prev => ({...prev, note: e.target.value}))}
                  rows="2"
                  placeholder="Notas especiales..."
                />
              </div>
            </div>
            <div className="admin-side-footer">
              <button className="btn btn-primary btn-block" onClick={saveManualOrder} disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} product={editingProduct} categories={categories} />
      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={handleSaveCategory} category={editingCategory} />
    </div>
  );
};

export default Admin;