import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  List,
  Settings,
  Plus,
  Edit,
  Trash,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  ChefHat,
  Clock,
  CheckSquare,
  XCircle,
  Phone,
  FileText,
  UserCheck,
  BellRing, // Iconos nuevos para el flujo de retiro
  History,
  Users,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductModal from "../components/ProductModal";
import CategoryModal from "../components/CategoryModal";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";

const Admin = () => {
  const navigate = useNavigate();

  // --- ESTADOS DE DATOS ---
  const [activeTab, setActiveTab] = useState("orders");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [historyFilterDate, setHistoryFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('today'); // today, week, month, custom
  const [analyticsDate, setAnalyticsDate] = useState(new Date().toISOString().split('T')[0]);
  const [clients, setClients] = useState([]);
  const [viewingClientOrders, setViewingClientOrders] = useState(null); // { client, orders }

  // Estados de Filtros
  const [orderStatusFilter, setOrderStatusFilter] = useState("pending"); // pending, active, completed, picked_up, canceled
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- CONTROL DE MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- SINCRONIZACIÓN DE DATOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("order");
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .order("name");
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: clts } = await supabase
        .from("clients")
        .select("*")
        .order("last_order_at", { ascending: false });

      setCategories(cats || []);
      setProducts(prods || []);
      setOrders(ords || []);
      setClients(clts || []);
    } catch (error) {
      showNotify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Suscripción en tiempo real para pedidos
    let channel;
    let reconnectTimeout;
    let pollingInterval;
    let isRealtimeConnected = false;

    const setupRealtime = () => {
      // Limpiar canal anterior si existe
      if (channel) {
        supabase.removeChannel(channel);
      }

      const channelName = `orders-channel-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('🔔 Cambio detectado en pedidos:', payload);
            // Recargar datos cuando hay cambios
            loadData();
          }
        )
        .subscribe((status, err) => {
          console.log('Estado de realtime:', status, err);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime: Conectado con éxito');
            isRealtimeConnected = true;
            // Limpiar polling si realtime funciona
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            // Limpiar timeout de reconexión si existe
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          }
          if (status === 'CLOSED') {
            console.log('⚠️ Realtime: Conexión cerrada, intentando reconectar...');
            isRealtimeConnected = false;
            // Activar polling como fallback
            startPolling();
            // Intentar reconectar después de 2 segundos
            reconnectTimeout = setTimeout(() => {
              setupRealtime();
            }, 2000);
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime: Error en el canal', err);
            isRealtimeConnected = false;
            // Activar polling como fallback
            startPolling();
            // Intentar reconectar después de 3 segundos
            reconnectTimeout = setTimeout(() => {
              setupRealtime();
            }, 3000);
          }
          if (status === 'TIMED_OUT') {
            console.error('⏱️ Realtime: Timeout, intentando reconectar...');
            isRealtimeConnected = false;
            // Activar polling como fallback
            startPolling();
            reconnectTimeout = setTimeout(() => {
              setupRealtime();
            }, 2000);
          }
          if (status === 'SUBSCRIBE_FAILED') {
            console.error('❌ Realtime: Fallo al suscribirse', err);
            isRealtimeConnected = false;
            // Activar polling como fallback
            startPolling();
            reconnectTimeout = setTimeout(() => {
              setupRealtime();
            }, 3000);
          }
        });
    };

    // Polling como fallback si realtime no funciona
    const startPolling = () => {
      if (pollingInterval) return; // Ya está activo
      console.log('🔄 Activando polling como fallback...');
      pollingInterval = setInterval(() => {
        if (!isRealtimeConnected) {
          console.log('🔄 Polling: Recargando datos...');
          loadData();
        }
      }, 5000); // Cada 5 segundos
    };

    // Iniciar realtime
    setupRealtime();
    
    // Iniciar polling después de 3 segundos si realtime no se conecta
    const pollingTimeout = setTimeout(() => {
      if (!isRealtimeConnected) {
        startPolling();
      }
    }, 3000);

    return () => {
      console.log('Limpiando canal de realtime y polling');
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- GESTIÓN DE PEDIDOS ---
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );

      const labels = {
        active: "En Cocina",
        completed: "Listo para Retiro",
        picked_up: "Entregado al Cliente", // Nuevo Label
        canceled: "Cancelado",
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
        .from("products")
        .update({ is_active: newActive })
        .eq("id", product.id)
        .select()
        .single();
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data : p)));
      showNotify(newActive ? "Producto visible" : "Producto pausado");
    } catch (error) {
      showNotify("Error al cambiar estado", "error");
    }
  };

  const handleSaveProduct = async (formData, localFile) => {
    setSaving(true);
    try {
      let finalImageUrl = formData.image_url;
      if (localFile) {
        const fileExt = localFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from("images")
          .upload(`menu/${fileName}`, localFile);
        if (upErr) {
          showNotify(`Error al subir imagen: ${upErr.message}`, "error");
          setSaving(false);
          return;
        }
        const { data } = supabase.storage
          .from("images")
          .getPublicUrl(`menu/${fileName}`);
        finalImageUrl = data.publicUrl;
      }
      const payload = {
        ...formData,
        image_url: finalImageUrl,
        price: parseInt(formData.price),
      };

      if (editingProduct) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id)
          .select()
          .single();
        if (error) {
          console.error("Error actualizando producto:", error);
          showNotify(`Error al actualizar: ${error.message}`, "error");
          setSaving(false);
          return;
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? data : p)),
        );
        showNotify("Producto actualizado");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select()
          .single();
        if (error) {
          console.error("Error creando producto:", error);
          showNotify(`Error al crear: ${error.message}`, "error");
          setSaving(false);
          return;
        }
        setProducts((prev) => [...prev, data]);
        showNotify("Nuevo plato añadido");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error en handleSaveProduct:", error);
      showNotify(error.message || "Error desconocido", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("¿Eliminar permanentemente este producto?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showNotify("Producto eliminado");
    } catch (error) {
      showNotify("Error: El producto tiene dependencias", "error");
    }
  };

  // --- GESTIÓN DE CATEGORÍAS ---
  const handleSaveCategory = async (formData) => {
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        order: parseInt(formData.order),
        is_active: formData.is_active,
      };
      let data, error;

      if (editingCategory) {
        ({ data, error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id)
          .select()
          .single());
        if (!error) {
          setCategories((prev) =>
            prev.map((c) => (c.id === editingCategory.id ? data : c)),
          );
          showNotify("Categoría actualizada");
        }
      } else {
        const id = formData.name.toLowerCase().replace(/\s+/g, "-");
        ({ data, error } = await supabase
          .from("categories")
          .insert({ ...payload, id })
          .select()
          .single());
        if (!error) {
          setCategories((prev) => [...prev, data]);
          showNotify("Nueva categoría añadida");
        }
      }
      setIsCategoryModalOpen(false);
      loadData();
    } catch (error) {
      showNotify(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Se ocultarán los productos asociados si no tienen categoría.')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      showNotify("Categoría eliminada");
    } catch (error) {
      showNotify("Error: La categoría tiene productos asociados", 'error');
    }
  };

  // --- ANALÍTICA Y FILTROS ---
  const stats = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (analyticsPeriod === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (analyticsPeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (analyticsPeriod === 'month') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (analyticsPeriod === 'custom') {
      startDate = new Date(analyticsDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(analyticsDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const validOrders = orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      const isStatusValid = (o.status === "completed" || o.status === "picked_up");
      const isDateValid = orderDate >= startDate && orderDate <= endDate;
      return isStatusValid && isDateValid;
    });

    const incomeTotal = validOrders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    const completedCount = validOrders.length;
    const avgTicket = completedCount > 0 ? Math.round(incomeTotal / completedCount) : 0;

    // Productos más vendidos en el periodo
    const productCounts = {};
    validOrders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          const name = item.name;
          const qty = parseInt(item.quantity) || 0;
          productCounts[name] = (productCounts[name] || 0) + qty;
        });
      }
    });

    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Detección de Hora Pico (por hora del día)
    const hourCounts = {};
    validOrders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let peakHour = "---";
    let maxOrdersInHour = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxOrdersInHour) {
        maxOrdersInHour = count;
        peakHour = `${hour}:00 - ${parseInt(hour) + 1}:00`;
      }
    });

    return {
      total: products.length,
      active: products.filter((p) => p.is_active).length,
      income: incomeTotal,
      avgTicket,
      peakHour,
      pending: orders.filter((o) => o.status === "pending" && new Date(o.created_at) >= startDate).length,
      totalOrders: orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= startDate && d <= endDate;
      }).length,
      completedOrders: completedCount,
      topProducts
    };
  }, [products, orders, analyticsPeriod, analyticsDate]);

  const handleDeleteMonthlyOrders = async () => {
    const date = new Date(analyticsDate);
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthName = date.toLocaleString('es-CL', { month: 'long' });

    const confirmFirst = window.confirm(`⚠️ ¿Estás COMPLETAMENTE SEGURO de que deseas eliminar TODOS los registros de ventas de ${monthName} de ${year}?\n\nEsta acción no se puede deshacer y perderás el historial de analíticas de este periodo.`);
    
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(`🚨 ÚLTIMA ADVERTENCIA: Se borrarán permanentemente todos los pedidos de este mes. ¿Quieres continuar?`);
    
    if (!confirmSecond) return;

    try {
      setLoading(true);
      
      // Aseguramos que el rango cubra todo el mes en UTC
      const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

      console.group("DEBUG: Borrado de Ventas");
      console.log("Rango:", startOfMonth, "a", endOfMonth);

      // Usamos .select() para confirmar si realmente se borró algo
      const { data, error, count } = await supabase
        .from("orders")
        .delete({ count: 'exact' })
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .select();

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      console.log("Datos devueltos tras delete:", data);
      console.log("Conteo exacto:", count);
      console.groupEnd();

      if (!data || data.length === 0) {
        alert("⚠️ NOTA IMPORTANTE:\n\nEl servidor respondió correctamente pero NO eliminó nada (0 registros).\n\nEsto suele pasar por 2 motivos:\n1. No hay pedidos en esas fechas exactas.\n2. No tienes permisos de 'DELETE' activados en Supabase para la tabla 'orders' (RLS).");
        showNotify("No se encontraron registros para borrar", "info");
      } else {
        const deletedIds = new Set(data.map(o => o.id));
        setOrders(prev => prev.filter(o => !deletedIds.has(o.id)));
        showNotify(`✅ ${data.length} pedidos eliminados permanentemente`, "success");
      }
    } catch (error) {
      console.error("Fallo crítico en borrado:", error);
      alert("Error crítico al borrar: " + error.message);
      showNotify(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllClients = async () => {
    const confirm1 = window.confirm("🚨 ¿Estás SEGURO de que deseas eliminar TODOS los clientes registrados?\n\nEsta acción borrará los nombres, teléfonos y estadísticas de frecuencia. Los pedidos previos en el historial NO se borrarán, pero aparecerán sin vínculo al cliente.");
    if (!confirm1) return;

    const confirm2 = window.confirm("⚠️ ÚLTIMA ADVERTENCIA: Esta acción es IRREVERSIBLE. ¿Eliminar base de datos de clientes?");
    if (!confirm2) return;

    try {
      setLoading(true);
      // Intentamos borrar todos los registros. Si Supabase tiene RLS, devolverá 0 si no hay permisos.
      const { data, error } = await supabase
        .from("clients")
        .delete()
        .gt("total_orders", -1) // Un filtro que siempre es verdadero para órdenes de clientes
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        // Si no se borró nada, puede ser un filtro o falta de permisos RLS
        // Intentamos un borrado más directo
        const { data: data2, error: error2 } = await supabase
          .from("clients")
          .delete()
          .neq("phone", "0000") // Otro filtro universal
          .select();
          
        if (error2) throw error2;
        if (!data2 || data2.length === 0) {
          showNotify("No se pudo borrar: verifica si tienes permisos en Supabase (RLS)", "error");
          return;
        }
        setClients([]);
        showNotify(`✅ ${data2.length} clientes eliminados`, "success");
      } else {
        setClients([]);
        showNotify(`✅ ${data.length} clientes eliminados`, "success");
      }
    } catch (error) {
      console.error("Error al limpiar clientes:", error);
      showNotify(`Error crítico: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const showRecentOrders = (client) => {
    // Filtrar pedidos de este cliente en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clientOrders = orders.filter(o => 
      o.client_phone === client.phone && 
      new Date(o.created_at) >= thirtyDaysAgo
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setViewingClientOrders({ client, orders: clientOrders });
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCat =
      filterCategory === "all" || p.category_id === filterCategory;
    return matchesSearch && matchesCat;
  });

  const filteredOrders = orders.filter((o) => o.status === orderStatusFilter);

  // Hook para responsividad
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 800);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 800);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading)
    return (
      <div
        className="admin-layout"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--background-dark, #101828)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Loader2 className="animate-spin" size={54} color="#e63946" />
          <span
            style={{
              color: "#fff",
              fontWeight: 600,
              fontSize: "1.2rem",
              letterSpacing: 0.2,
            }}
          >
            Cargando panel...
          </span>
        </div>
      </div>
    );

  return (
    <div
      className="admin-layout"
      style={{
        display: isMobile ? "block" : "flex",
        minHeight: "100vh",
        background: "var(--background-dark, #101828)",
      }}
    >
      {notification && (
        <div
          className={`admin-notification ${notification.type} animate-slide-up`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* SIDEBAR */}
      <aside
        className="admin-sidebar glass"
        style={{
          minWidth: isMobile ? "100vw" : 220,
          maxWidth: isMobile ? "100vw" : 260,
          width: isMobile ? "100vw" : undefined,
          flexShrink: 0,
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          justifyContent: isMobile ? "flex-start" : "space-between",
          alignItems: isMobile ? "center" : undefined,
          background: "var(--background-dark, #101828)",
          borderRight: isMobile ? "none" : "1.5px solid #22304a",
          borderBottom: isMobile ? "1.5px solid #22304a" : "none",
          color: "#fff",
          padding: isMobile ? "10px 4vw" : undefined,
          height: isMobile ? "auto" : "100vh",
          position: isMobile ? "static" : "sticky",
          top: isMobile ? undefined : 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: isMobile ? "flex" : "block",
            alignItems: "center",
            width: "100%",
            justifyContent: isMobile ? "space-between" : undefined,
          }}
        >
          <div
            className="sidebar-brand-pro"
            style={{
              marginBottom: isMobile ? 0 : 32,
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
              alignItems: "center",
              gap: isMobile ? 8 : 0,
            }}
          >
            <div
              style={{
                background: "var(--background-dark, #101828)",
                borderRadius: "50%",
                padding: isMobile ? 6 : 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 12px #0006",
              }}
            >
              <img
                src={logo}
                alt="Oishi Logo"
                className="admin-logo-img"
                style={{
                  background: "transparent",
                  borderRadius: "50%",
                  width: isMobile ? 38 : 72,
                  height: isMobile ? 38 : 72,
                  objectFit: "contain",
                }}
              />
            </div>
            {!isMobile && (
              <div className="brand-text" style={{ marginTop: 12 }}>
                <h3 className="text-gradient">Oishi Admin</h3>
              </div>
            )}
          </div>
          <nav
            className="sidebar-nav"
            style={{
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
              gap: isMobile ? 4 : 8,
              marginLeft: isMobile ? 8 : 0,
            }}
          >
            <button
              onClick={() => setActiveTab("orders")}
              className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
              style={{
                padding: isMobile ? "8px 10px" : undefined,
                fontSize: isMobile ? 13 : undefined,
              }}
            >
              <CheckSquare size={isMobile ? 18 : 20} />
              {!isMobile && <span>Pedidos</span>}
              {stats.pending > 0 && (
                <span
                  style={{
                    background: "#e63946",
                    color: "white",
                    fontSize: "0.7rem",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    marginLeft: isMobile ? 4 : "auto",
                  }}
                >
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`nav-item ${activeTab === "products" ? "active" : ""}`}
              style={{
                padding: isMobile ? "8px 10px" : undefined,
                fontSize: isMobile ? 13 : undefined,
              }}
            >
              <ShoppingBag size={isMobile ? 18 : 20} />
              {!isMobile && <span>Inventario</span>}
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`nav-item ${activeTab === "categories" ? "active" : ""}`}
              style={{
                padding: isMobile ? "8px 10px" : undefined,
                fontSize: isMobile ? 13 : undefined,
              }}
            >
              <List size={isMobile ? 18 : 20} />
              {!isMobile && <span>Categorías</span>}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`nav-item ${activeTab === "history" ? "active" : ""}`}
              style={{
                padding: isMobile ? "8px 10px" : undefined,
                fontSize: isMobile ? 13 : undefined,
              }}
            >
              <History size={isMobile ? 18 : 20} />
              {!isMobile && <span>Historial</span>}
            </button>
            <button
              onClick={() => setActiveTab("clients")}
              className={`nav-item ${activeTab === "clients" ? "active" : ""}`}
              style={{
                padding: isMobile ? "8px 10px" : undefined,
                fontSize: isMobile ? 13 : undefined,
              }}
            >
              <Users size={isMobile ? 18 : 20} />
              {!isMobile && <span>Clientes</span>}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
              style={{
                padding: isMobile ? "8px 10px" : undefined,
                fontSize: isMobile ? 13 : undefined,
              }}
            >
              <BarChart3 size={isMobile ? 18 : 20} />
              {!isMobile && <span>Reportes</span>}
            </button>
          </nav>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="nav-item logout-btn"
          style={{
            marginTop: isMobile ? 0 : 32,
            fontSize: isMobile ? 13 : undefined,
            padding: isMobile ? "8px 10px" : undefined,
          }}
        >
          <LogOut size={isMobile ? 18 : 20} />
          {!isMobile && <span>Desconectar</span>}
        </button>
      </aside>

      <main
        className="admin-main"
        style={{
          flex: 1,
          padding: isMobile ? "8px 2vw 8px 2vw" : "32px 0 32px 0",
          background: "transparent",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          boxSizing: "border-box",
          overflowX: "auto",
        }}
      >
        <header
          className="admin-header-pro"
          style={{
            margin: isMobile ? "0 2vw 14px 2vw" : "0 40px 32px 40px",
            background: "transparent",
          }}
        >
          <div
            className="header-flex-col"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <h2
              className="section-title text-gradient"
              style={{ marginBottom: 0, textAlign: "center", width: "100%" }}
            >
              {activeTab === "orders"
                ? "Gestión de Pedidos"
                : activeTab === "history"
                  ? "Historial de Pedidos"
                  : activeTab === "clients"
                    ? "Clientes Frecuentes"
                    : activeTab === "products"
                      ? "Inventario"
                      : activeTab === "categories"
                        ? "Estructura"
                        : "Panel de Control"}
            </h2>
            <p
              className="header-subtitle"
              style={{ textAlign: "center", width: "100%" }}
            >
              {activeTab === "orders"
                ? "Administra cocina y entregas"
                : activeTab === "history"
                  ? "Registro de pedidos por día"
                  : activeTab === "clients"
                    ? "Clientes y estadísticas"
                    : "Control de activos en tiempo real"}
            </p>
            <div
              className="header-actions"
              style={{
                display: "flex",
                gap: isMobile ? 8 : 16,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                flexWrap: isMobile ? "wrap" : undefined,
              }}
            >
              <button
                onClick={() => window.open("/", "_blank")}
                className="btn btn-secondary glass"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <ExternalLink size={22} style={{ marginRight: 4 }} />
                <span>Ver Carta</span>
              </button>
              {activeTab === "products" && (
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-primary btn-glow"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Plus size={22} style={{ marginRight: 4 }} />
                  <span>Nuevo Plato</span>
                </button>
              )}
              {activeTab === "categories" && (
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCategoryModalOpen(true);
                  }}
                  className="btn btn-primary btn-glow"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Plus size={22} style={{ marginRight: 4 }} />
                  <span>Nueva Categoría</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* --- VISTA DE PEDIDOS --- */}
        {activeTab === "orders" && (
          <section
            className="admin-orders-section"
            style={{
              margin: isMobile ? "0 1vw" : "0 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 10 : 24,
            }}
          >
            {/* Tabs de Estado ACTUALIZADOS */}
            <div
              className="orders-tabs glass"
              style={{
                display: "flex",
                gap: 10,
                padding: isMobile ? 10 : 15,
                borderRadius: 16,
                flexWrap: "wrap",
                background: "rgba(30,41,59,0.85)",
              }}
            >
              {[
                {
                  id: "pending",
                  label: "Entrantes",
                  icon: <Clock size={18} />,
                  color: "#f4a261",
                },
                {
                  id: "active",
                  label: "En Cocina",
                  icon: <ChefHat size={18} />,
                  color: "#e63946",
                },
                {
                  id: "completed",
                  label: "Listos",
                  icon: <BellRing size={18} />,
                  color: "#25d366",
                },
                {
                  id: "picked_up",
                  label: "Retirados",
                  icon: <UserCheck size={18} />,
                  color: "#3b82f6",
                }, // NUEVO ESTADO
                {
                  id: "canceled",
                  label: "Cancelados",
                  icon: <XCircle size={18} />,
                  color: "#ff4444",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderStatusFilter(tab.id)}
                  className="btn"
                  style={{
                    backgroundColor:
                      orderStatusFilter === tab.id ? tab.color : "transparent",
                    color:
                      orderStatusFilter === tab.id
                        ? tab.id === "pending" || tab.id === "completed"
                          ? "#000"
                          : "#fff"
                        : "var(--text-secondary)",
                    border: "1px solid var(--card-border)",
                    flex: isMobile ? "1 1 40%" : 1,
                    fontSize: isMobile ? "0.85rem" : "1rem",
                    justifyContent: "center",
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div
              className="admin-content-card glass"
              style={{
                padding: 0,
                background: "rgba(30,41,59,0.92)",
                color: "#fff",
                borderRadius: isMobile ? 10 : 18,
                width: "100%",
                overflowX: "auto",
              }}
            >
              <div
                className="table-wrapper"
                style={{ overflowX: "auto", width: "100%" }}
              >
                <table
                  className="data-table"
                  style={{
                    minWidth: isMobile ? 600 : 900,
                    background: "transparent",
                    color: "#fff",
                    fontSize: isMobile ? 12 : undefined,
                    width: "100%",
                  }}
                >
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
                      <tr>
                        <td
                          colSpan="5"
                          style={{
                            textAlign: "center",
                            padding: 40,
                            opacity: 0.5,
                          }}
                        >
                          No hay pedidos en esta sección
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="row-hover">
                          <td style={{ verticalAlign: "top" }}>
                            <div
                              style={{ fontWeight: "bold", fontSize: "1rem" }}
                            >
                              {order.client_name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                opacity: 0.7,
                                marginTop: 4,
                              }}
                            >
                              <Phone size={12} /> {order.client_phone}
                            </div>
                          </td>
                          <td style={{ maxWidth: "300px" }}>
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                fontSize: "0.85rem",
                                margin: 0,
                              }}
                            >
                              {order.items.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: 2 }}>
                                  • {item.quantity}x {item.name}
                                </li>
                              ))}
                            </ul>
                            {order.note && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--accent-secondary)",
                                  marginTop: 6,
                                  fontStyle: "italic",
                                }}
                              >
                                📝 Nota: "{order.note}"
                              </div>
                            )}
                          </td>
                          <td style={{ verticalAlign: "top" }}>
                            <span
                              className="status-pill"
                              style={{
                                background: "rgba(255,255,255,0.1)",
                                fontSize: "0.7rem",
                              }}
                            >
                              {order.payment_type === "online"
                                ? "Transferencia"
                                : "Local"}
                            </span>
                            {order.payment_ref && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  marginTop: 6,
                                  opacity: 0.8,
                                }}
                              >
                                Ref: {order.payment_ref}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              fontWeight: "800",
                              color: "var(--accent-primary)",
                              fontSize: "1rem",
                            }}
                          >
                            ${order.total.toLocaleString("es-CL")}
                          </td>
                          <td>
                            <div
                              className="actions-group"
                              style={{ display: "flex", gap: 8 }}
                            >
                              {/* Flujo: Pendiente -> Cocina */}
                              {order.status === "pending" && (
                                <button
                                  onClick={() =>
                                    updateOrderStatus(order.id, "active")
                                  }
                                  className="action-btn"
                                  title="Pasar a Cocina"
                                  style={{
                                    background: "#e63946",
                                    color: "white",
                                  }}
                                >
                                  <ChefHat size={18} />
                                </button>
                              )}

                              {/* Flujo: Cocina -> Listo */}
                              {order.status === "active" && (
                                <button
                                  onClick={() =>
                                    updateOrderStatus(order.id, "completed")
                                  }
                                  className="action-btn"
                                  title="Listo para Retiro"
                                  style={{
                                    background: "#25d366",
                                    color: "black",
                                  }}
                                >
                                  <BellRing size={18} />
                                </button>
                              )}

                              {/* Flujo: Listo -> Retirado (NUEVO) */}
                              {order.status === "completed" && (
                                <button
                                  onClick={() =>
                                    updateOrderStatus(order.id, "picked_up")
                                  }
                                  className="action-btn"
                                  title="Entregado al Cliente"
                                  style={{
                                    background: "#3b82f6",
                                    color: "white",
                                  }}
                                >
                                  <UserCheck size={18} />
                                </button>
                              )}

                              {/* Cancelar (Disponible hasta que se retira) */}
                              {order.status !== "canceled" &&
                                order.status !== "picked_up" && (
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "canceled")
                                    }
                                    className="action-btn"
                                    title="Cancelar"
                                    style={{
                                      background: "transparent",
                                      border: "1px solid #ff4444",
                                      color: "#ff4444",
                                    }}
                                  >
                                    <XCircle size={18} />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* VISTA DE HISTORIAL DE PEDIDOS POR DÍA */}
        {activeTab === "history" && (
          <section
            className="admin-history-section"
            style={{
              margin: isMobile ? "0 1vw" : "0 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 10 : 24,
            }}
          >
            <div
              className="glass"
              style={{
                padding: isMobile ? 15 : 24,
                borderRadius: 16,
                background: "rgba(30,41,59,0.85)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Calendar size={isMobile ? 20 : 24} />
                  <h3 style={{ margin: 0, fontSize: isMobile ? "1.1rem" : "1.3rem" }}>
                    Historial de Ventas
                  </h3>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(15,23,42,0.6)",
                    padding: "6px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <button
                    onClick={() => {
                      const d = new Date(historyFilterDate || new Date());
                      d.setDate(d.getDate() - 1);
                      setHistoryFilterDate(d.toISOString().split('T')[0]);
                    }}
                    className="action-btn"
                    style={{ background: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 8 }}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                    <Calendar size={18} style={{ opacity: 0.6 }} />
                    <input
                      type="date"
                      value={historyFilterDate}
                      onChange={(e) => setHistoryFilterDate(e.target.value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        outline: "none",
                        cursor: "pointer",
                        width: isMobile ? '120px' : 'auto'
                      }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      const d = new Date(historyFilterDate || new Date());
                      d.setDate(d.getDate() + 1);
                      setHistoryFilterDate(d.toISOString().split('T')[0]);
                    }}
                    className="action-btn"
                    style={{ background: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 8 }}
                  >
                    <ChevronRight size={20} />
                  </button>

                  {historyFilterDate !== new Date().toISOString().split('T')[0] && (
                    <button
                      onClick={() => setHistoryFilterDate(new Date().toISOString().split('T')[0])}
                      style={{
                        background: "rgba(230, 57, 70, 0.15)",
                        border: "none",
                        color: "#f87171",
                        padding: "6px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600
                      }}
                    >
                      Hoy
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                // Agrupar pedidos por día
                const ordersByDay = orders.reduce((acc, order) => {
                  if (order.status === "canceled") return acc;
                  
                  const orderDate = new Date(order.created_at);
                  const dateKey = orderDate.toISOString().split("T")[0]; // YYYY-MM-DD
                  
                  // Si hay un filtro de fecha activo y no coincide
                  if (historyFilterDate && dateKey !== historyFilterDate) return acc;

                  const dateLabel = orderDate.toLocaleDateString("es-CL", {
                    weekday: 'long',
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });

                  if (!acc[dateKey]) {
                    acc[dateKey] = {
                      date: dateLabel,
                      orders: [],
                      total: 0,
                      count: 0,
                    };
                  }
                  acc[dateKey].orders.push(order);
                  acc[dateKey].total += parseFloat(order.total);
                  acc[dateKey].count += 1;
                  return acc;
                }, {});

                const days = Object.values(ordersByDay).sort((a, b) => {
                  const dateA = a.orders[0] ? new Date(a.orders[0].created_at) : new Date(0);
                  const dateB = b.orders[0] ? new Date(b.orders[0].created_at) : new Date(0);
                  return dateB - dateA;
                });

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {days.length === 0 ? (
                      <p style={{ textAlign: "center", opacity: 0.5, padding: 40 }}>
                        No hay pedidos registrados
                      </p>
                    ) : (
                      days.map((day) => (
                        <div
                          key={day.date}
                          className="glass"
                          style={{
                            padding: isMobile ? 15 : 20,
                            borderRadius: 12,
                            background: "rgba(15,23,42,0.6)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 20,
                              flexWrap: "wrap",
                              gap: 15,
                              paddingBottom: 15,
                              borderBottom: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <h4 style={{ margin: 0, fontSize: "1.1rem", textTransform: 'capitalize' }}>
                                {day.date}
                              </h4>
                              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                {day.count} transacciones realizadas
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                              }}
                            >
                              <div style={{
                                background: "rgba(37, 211, 102, 0.15)",
                                color: "#25d366",
                                padding: "8px 16px",
                                borderRadius: 8,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end"
                              }}>
                                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Ventas del día</span>
                                <span style={{ fontWeight: "bold", fontSize: '1.2rem' }}>
                                  ${day.total.toLocaleString("es-CL")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {day.orders.map((order) => (
                              <div
                                key={order.id}
                                className="history-order-item"
                                style={{
                                  padding: "14px 18px",
                                  background: "rgba(30,41,59,0.3)",
                                  borderRadius: 10,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 12,
                                  border: "1px solid rgba(255,255,255,0.03)",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    color: 'rgba(255,255,255,0.7)'
                                  }}>
                                    {order.client_name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                      {order.client_name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        opacity: 0.5,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        marginTop: 2,
                                      }}
                                    >
                                      <Clock size={12} /> {new Date(order.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                      <span style={{ margin: '0 4px' }}>•</span>
                                      <Phone size={12} /> {order.client_phone}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 15,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ textAlign: 'right', marginRight: 10 }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>Pago</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                      {order.payment_type === 'transfer' ? 'Transferencia' : 'Efectivo'}
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 8,
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      background:
                                        order.status === "picked_up"
                                          ? "rgba(59, 130, 246, 0.2)"
                                          : order.status === "completed"
                                            ? "rgba(37, 211, 102, 0.2)"
                                            : order.status === "active"
                                              ? "rgba(230, 57, 70, 0.2)"
                                              : "rgba(244, 162, 97, 0.2)",
                                      color: 
                                        order.status === "picked_up"
                                          ? "#60a5fa"
                                          : order.status === "completed"
                                            ? "#4ade80"
                                            : order.status === "active"
                                              ? "#f87171"
                                              : "#fbbf24",
                                      border: `1px solid ${
                                        order.status === "picked_up"
                                          ? "rgba(59, 130, 246, 0.3)"
                                          : order.status === "completed"
                                            ? "rgba(37, 211, 102, 0.3)"
                                            : order.status === "active"
                                              ? "rgba(230, 57, 70, 0.3)"
                                              : "rgba(244, 162, 97, 0.3)"
                                      }`
                                    }}
                                  >
                                    {order.status === "picked_up"
                                      ? "Retirado"
                                      : order.status === "completed"
                                        ? "Listo"
                                        : order.status === "active"
                                          ? "En Cocina"
                                          : "Pendiente"}
                                  </span>
                                  <span style={{ fontWeight: "bold", fontSize: '1.1rem', minWidth: 80, textAlign: 'right' }}>
                                    ${parseFloat(order.total).toLocaleString("es-CL")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* VISTA DE CLIENTES FRECUENTES */}
        {activeTab === "clients" && (
          <section
            className="admin-clients-section"
            style={{
              margin: isMobile ? "0 1vw" : "0 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 10 : 24,
            }}
          >
            <div
              className="glass"
              style={{
                padding: isMobile ? 15 : 24,
                borderRadius: 16,
                background: "rgba(30,41,59,0.85)",
              }}
            >
              <h3
                style={{
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Users size={24} />
                Clientes Frecuentes
              </h3>

              {(() => {
                const frequentClients = clients.filter((c) => c.is_frequent);
                const otherClients = clients.filter((c) => !c.is_frequent);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* Clientes Frecuentes */}
                    <div>
                      <h4
                        style={{
                          marginBottom: 15,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Star size={20} style={{ color: "#fbbf24" }} />
                        Clientes Frecuentes ({frequentClients.length})
                      </h4>
                      {frequentClients.length === 0 ? (
                        <p style={{ textAlign: "center", opacity: 0.5, padding: 20 }}>
                          Aún no hay clientes frecuentes (3+ pedidos)
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                            gap: 15,
                          }}
                        >
                          {frequentClients.map((client) => (
                            <div
                              key={client.id}
                              className="glass"
                              style={{
                                padding: 20,
                                borderRadius: 12,
                                background: "rgba(15,23,42,0.6)",
                                border: "1px solid rgba(251, 191, 36, 0.3)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: 12,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: "bold",
                                      fontSize: "1.1rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    {client.name}
                                    <Star size={16} style={{ color: "#fbbf24" }} />
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      opacity: 0.7,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      marginTop: 4,
                                    }}
                                  >
                                    <Phone size={12} /> {client.phone}
                                  </div>
                                  {client.rut && (
                                    <div
                                      style={{
                                        fontSize: "0.85rem",
                                        opacity: 0.7,
                                        marginTop: 4,
                                      }}
                                    >
                                      RUT: {client.rut}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: 12,
                                  paddingTop: 12,
                                  borderTop: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                                    Pedidos
                                  </div>
                                  <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                                    {client.total_orders}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                                    Total Gastado
                                  </div>
                                  <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                                    ${parseFloat(client.total_spent || 0).toLocaleString("es-CL")}
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  opacity: 0.6,
                                  marginTop: 8,
                                }}
                              >
                                Último pedido:{" "}
                                {new Date(client.last_order_at).toLocaleDateString("es-CL")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Otros Clientes */}
                    <div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <h4
                           style={{
                             margin: 0,
                             display: "flex",
                             alignItems: "center",
                             gap: 8,
                           }}
                         >
                           <Users size={20} />
                           Todos los Clientes ({clients.length})
                         </h4>
                         {clients.length > 0 && (
                           <button 
                             onClick={handleDeleteAllClients}
                             style={{
                               background: 'rgba(239, 68, 68, 0.1)',
                               color: '#ef4444',
                               border: '1px solid rgba(239, 68, 68, 0.2)',
                               padding: '4px 12px',
                               borderRadius: 8,
                               fontSize: '0.8rem',
                               fontWeight: 600,
                               cursor: 'pointer'
                             }}
                           >
                             Limpiar Clientes
                           </button>
                         )}
                       </div>
                      {otherClients.length === 0 && frequentClients.length === 0 ? (
                        <p style={{ textAlign: "center", opacity: 0.5, padding: 20 }}>
                          No hay clientes registrados
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                            gap: 15,
                          }}
                        >
                          {[...frequentClients, ...otherClients].map((client) => (
                            <div
                              key={client.id}
                              className="glass"
                              style={{
                                padding: 20,
                                borderRadius: 12,
                                background: "rgba(15,23,42,0.6)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: 12,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: "bold",
                                      fontSize: "1.1rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    {client.name}
                                    {client.is_frequent && (
                                      <Star size={16} style={{ color: "#fbbf24" }} />
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      opacity: 0.7,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      marginTop: 4,
                                    }}
                                  >
                                    <Phone size={12} /> {client.phone}
                                  </div>
                                  {client.rut && (
                                    <div
                                      style={{
                                        fontSize: "0.85rem",
                                        opacity: 0.7,
                                        marginTop: 4,
                                      }}
                                    >
                                      RUT: {client.rut}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: 12,
                                  paddingTop: 12,
                                  borderTop: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                                    Pedidos
                                  </div>
                                  <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                                    {client.total_orders}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                                    Total Gastado
                                  </div>
                                  <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                                    ${parseFloat(client.total_spent || 0).toLocaleString("es-CL")}
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  opacity: 0.6,
                                  marginTop: 8,
                                }}
                              >
                                Último pedido:{" "}
                                {new Date(client.last_order_at).toLocaleDateString("es-CL")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* VISTA DE PRODUCTOS */}
        {activeTab === "products" && (
          <section
            className="admin-products-section"
            style={{
              margin: isMobile ? "0 1vw" : "0 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 10 : 24,
            }}
          >
            <div
              className="admin-toolbar glass"
              style={{
                display: "flex",
                gap: isMobile ? 8 : 24,
                alignItems: "center",
                marginBottom: isMobile ? 8 : 16,
                padding: isMobile ? 8 : 16,
                background: "rgba(30,41,59,0.85)",
                color: "#fff",
                borderRadius: isMobile ? 10 : 16,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <div
                className="search-box"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Buscar plato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 16,
                    color: "#fff",
                  }}
                />
              </div>
              <div
                className="filter-box"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <Filter size={18} />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-select"
                  style={{
                    background: "var(--bg-secondary)",
                    color: "#fff",
                    border: "none",
                    appearance: "none",
                  }}
                >
                  <option value="all">Todo el Menú</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="admin-content-card glass"
              style={{
                padding: 0,
                background: "rgba(30,41,59,0.92)",
                color: "#fff",
                borderRadius: isMobile ? 10 : 18,
                width: "100%",
                overflowX: "auto",
              }}
            >
              <div
                className="table-wrapper"
                style={{ overflowX: "auto", width: "100%" }}
              >
                <table
                  className="data-table"
                  style={{
                    minWidth: isMobile ? 520 : 900,
                    background: "transparent",
                    color: "#fff",
                    fontSize: isMobile ? 12 : undefined,
                    width: "100%",
                  }}
                >
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
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="row-hover">
                        <td>
                          <div className="thumb-frame">
                            {p.image_url && p.image_url !== "" ? (
                              <img
                                src={p.image_url}
                                className="table-thumb"
                                alt=""
                              />
                            ) : (
                              <ImageIcon size={38} color="#334155" />
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="p-name">{p.name}</span>
                          {p.is_special && (
                            <span className="premium-label">ESPECIAL 🔥</span>
                          )}
                        </td>
                        <td className="p-cat">
                          {categories.find((c) => c.id === p.category_id)
                            ?.name || "---"}
                        </td>
                        <td className="p-price">
                          ${p.price?.toLocaleString("es-CL")}
                        </td>
                        <td>
                          <button
                            className={`status-pill ${p.is_active ? "active" : "inactive"} status-toggle-btn`}
                            onClick={() => toggleProductActive(p)}
                            style={{
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              padding: 0,
                            }}
                          >
                            {p.is_active ? (
                              <>
                                <Eye
                                  size={16}
                                  style={{ verticalAlign: "middle" }}
                                />{" "}
                                Visible
                              </>
                            ) : (
                              <>
                                <EyeOff
                                  size={16}
                                  style={{ verticalAlign: "middle" }}
                                />{" "}
                                Pausado
                              </>
                            )}
                          </button>
                        </td>
                        <td>
                          <div
                            className="actions-group"
                            style={{ display: "flex", gap: 8 }}
                          >
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsModalOpen(true);
                              }}
                              className="action-btn edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="action-btn delete"
                            >
                              <Trash size={16} />
                            </button>
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

        {/* VISTA DE REPORTES PROFESIONALES AVANZADOS */}
        {activeTab === "analytics" && (
          <div
            className="reports-container animate-fade"
            style={{
              padding: isMobile ? "0 10px" : "0 40px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              paddingBottom: 40
            }}
          >
            {/* Selector de Periodo */}
            <div className="glass" style={{
              padding: 15,
              borderRadius: 15,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(30,41,59,0.7)"
            }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { id: 'today', label: 'Hoy' },
                  { id: 'week', label: 'Últimos 7 días' },
                  { id: 'month', label: 'Últimos 30 días' },
                  { id: 'custom', label: 'Día Específico' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAnalyticsPeriod(p.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: analyticsPeriod === p.id ? "var(--accent-primary)" : "rgba(255,255,255,0.05)",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {analyticsPeriod === 'custom' && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Calendar size={18} style={{ opacity: 0.6 }} />
                  <input
                    type="date"
                    value={analyticsDate}
                    onChange={(e) => setAnalyticsDate(e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "white",
                      padding: "6px 10px",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cuadrícula de Métricas Principales */}
            <div 
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
                gap: 20
              }}
            >
              {[
                { 
                  label: "Ingresos Totales", 
                  val: `$${stats.income.toLocaleString("es-CL")}`, 
                  icon: <DollarSign size={24}/>, 
                  color: "#25d366",
                  bg: "linear-gradient(135deg, rgba(37, 211, 102, 0.2) 0%, rgba(18, 140, 126, 0.2) 100%)" 
                },
                { 
                  label: "Ticket Promedio", 
                  val: `$${stats.avgTicket.toLocaleString("es-CL")}`, 
                  icon: <TrendingUp size={24}/>, 
                  color: "#3b82f6",
                  bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.2) 100%)"
                },
                { 
                  label: "Pedidos Finalizados", 
                  val: stats.completedOrders, 
                  icon: <CheckCircle2 size={24}/>, 
                  color: "#8b5cf6",
                  bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(109, 40, 217, 0.2) 100%)"
                },
                { 
                  label: "Hora de Mayor Venta", 
                  val: stats.peakHour, 
                  icon: <Clock size={24}/>, 
                  color: "#f59e0b",
                  bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(180, 83, 9, 0.2) 100%)"
                }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="glass"
                  style={{
                    padding: 24,
                    borderRadius: 20,
                    background: "rgba(30,41,59,0.7)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 15,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: 4 }}>{item.val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div 
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.7fr 1fr",
                gap: 24
              }}
            >
              {/* Ranking de Productos con mayor detalle */}
              <div 
                className="glass"
                style={{
                  padding: 28,
                  borderRadius: 24,
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(139, 92, 246, 0.15)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Star size={24} style={{ color: "#fbbf24" }} />
                    <h3 style={{ margin: 0 }}>Ranking de Ventas (Top 5)</h3>
                  </div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Periodo seleccionado</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {stats.topProducts.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 15 }}>
                      <Package size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
                      <p style={{ opacity: 0.5, margin: 0 }}>No hay pedidos finalizados en este periodo</p>
                    </div>
                  ) : (
                    stats.topProducts.map((p, idx) => {
                      const maxCount = stats.topProducts[0].count;
                      const percentage = (p.count / maxCount) * 100;
                      return (
                        <div key={idx}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ 
                                width: 24, 
                                height: 24, 
                                background: idx === 0 ? "#fbbf24" : "rgba(255,255,255,0.1)", 
                                color: idx === 0 ? "#000" : "#fff",
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "bold"
                              }}>
                                {idx + 1}
                              </span>
                              <span style={{ fontWeight: 500, fontSize: '1rem' }}>{p.name}</span>
                            </div>
                            <span style={{ opacity: 0.9, fontWeight: "bold", background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
                              {p.count} unid.
                            </span>
                          </div>
                          <div style={{ height: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${percentage}%`, 
                              background: idx === 0 
                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' 
                                : 'linear-gradient(90deg, #6366f1, #a855f7)',
                              borderRadius: 10,
                              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Otras métricas y Resumen rápido */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div 
                  className="glass"
                  style={{
                    padding: 24,
                    borderRadius: 20,
                    background: "rgba(30,41,59,0.5)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 15
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase' }}>Estado de la Operación</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.6 }}>Total Pedidos Recibidos:</span>
                      <span style={{ fontWeight: 600 }}>{stats.totalOrders}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.6 }}>Pedidos Pendientes:</span>
                      <span style={{ fontWeight: 600, color: stats.pending > 0 ? '#f87171' : 'inherit' }}>{stats.pending}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.6 }}>Items en Carta:</span>
                      <span style={{ fontWeight: 600 }}>{stats.total} productos</span>
                    </div>
                  </div>
                  <div style={{ 
                    marginTop: 10, 
                    padding: 12, 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    opacity: 0.6
                  }}>
                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                    Las métricas de ventas solo consideran pedidos en estado "Listo" o "Entregado".
                  </div>
                </div>

                <div 
                  className="glass"
                  style={{
                    padding: 24,
                    borderRadius: 20,
                    background: "rgba(220, 38, 38, 0.05)",
                    border: "1px solid rgba(220, 38, 38, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#ef4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trash2 size={16} /> Zona de Peligro
                  </h4>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                    Elimina permanentemente los registros de ventas del mes correspondiente a la fecha seleccionada.
                  </p>
                  <button 
                    onClick={handleDeleteMonthlyOrders}
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(220, 38, 38, 0.2)",
                      border: "1px solid rgba(220, 38, 38, 0.4)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.3)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)'}
                  >
                    Borrar Ventas del Mes
                  </button>
                </div>
                
                <button 
                  onClick={() => window.print()}
                  className="glass"
                  style={{
                    padding: 18,
                    borderRadius: 15,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <FileText size={18} />
                  Generar Reporte PDF / Imprimir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISTA DE CATEGORÍAS */}
        {activeTab === "categories" && (
          <div
            className="admin-content-card glass animate-fade"
            style={{
              background: "rgba(30,41,59,0.92)",
              color: "#fff",
              borderRadius: isMobile ? 10 : 18,
              width: "100%",
              overflowX: "auto",
              margin: isMobile ? "0 1vw" : "0 40px",
            }}
          >
            <div
              className="table-wrapper"
              style={{ overflowX: "auto", width: "100%" }}
            >
              <table
                className="data-table"
                style={{
                  background: "transparent",
                  color: "#fff",
                  minWidth: isMobile ? 320 : undefined,
                  fontSize: isMobile ? 12 : undefined,
                  width: "100%",
                }}
              >
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Categoría</th>
                    <th>Visibilidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="cat-order">#{c.order}</td>
                      <td className="cat-name">{c.name}</td>
                      <td>
                        <span
                          className={`status-pill ${c.is_active ? "active" : "inactive"}`}
                        >
                          {c.is_active ? "Visible" : "Oculta"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="actions-group"
                          style={{ display: "flex", gap: 8 }}
                        >
                          <button
                            onClick={() => {
                              setEditingCategory(c);
                              setIsCategoryModalOpen(true);
                            }}
                            className="action-btn edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteCategory(c.id)}
                            className="action-btn delete"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
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
