import React from 'react';
import {
  Loader2, Search, Filter, CheckCircle2, AlertCircle,
  Package, PlusCircle, X, Trash2, Plus, Edit, RefreshCw, List, ShoppingBag, Tag, LayoutGrid, ArrowUpDown, Eye, EyeOff, MapPin, Upload
} from 'lucide-react';
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
import AdminDangerZone from '../components/AdminDangerZone';
import AdminCompanyData from '../components/AdminCompanyData';
import ClientDetailsPanel from '../components/ClientDetailsPanel';
import CashManager from '../components/caja/CashManager';
import ScopeSelectionModal from '../components/ScopeSelectionModal';
import { supabase } from '../../../lib/supabase';
import { AdminProvider, useAdmin } from './AdminProvider';
import '../../../styles/AdminLayout.css';
import '../../../styles/AdminAnalytics.css';
import '../../../styles/AdminShared.css';
import '../../../styles/AdminCategories.css';

const AdminPage = () => {
  const {
    navigate,
    activeTab, setActiveTab,
    products,
    categories,
    orders,
    clients,
    branches,
    selectedBranch, setSelectedBranch,
    isHistoryView, setIsHistoryView,
    mobileTab, setMobileTab,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterStatus, setFilterStatus,
    viewMode, setViewMode,
    sortOrder, setSortOrder,
    loading,
    refreshing,
    isMobile,
    isModalOpen, setIsModalOpen,
    editingProduct, setEditingProduct,
    isCategoryModalOpen, setIsCategoryModalOpen,
    editingCategory, setEditingCategory,
    notification,
    receiptModalOrder, setReceiptModalOrder,
    receiptPreview, setReceiptPreview,
    isManualOrderModalOpen, setIsManualOrderModalOpen,
    uploadingReceipt,
    selectedClient, setSelectedClient,
    selectedClientOrders,
    clientHistoryLoading,
    showNotify,
    cashSystem,
    loadData,
    handleSelectClient,
    moveOrder,
    uploadReceiptToOrder,
    handleReceiptFileChange,
    handleSaveProduct,
    deleteProduct,
    toggleProductActive,
    scopeModal,
    handleScopeConfirm,
    setScopeModal,
    handleSaveCategory,
    deleteCategory,
    categoryToDelete,
    setCategoryToDelete,
    confirmDeleteCategory,
    kanbanColumns,
    processedProducts,
    productStats,
    refreshBranches,
    userRole,
    userEmail,
    productToDelete,
    setProductToDelete,
    confirmDeleteProduct,
    reorderCategories,
    toggleCategoryActive,
  } = useAdmin();

  const nextCategoryOrder = React.useMemo(() => {
    const maxOrder = categories.reduce((maxValue, cat) => {
      const value = Number(cat.order);
      if (!Number.isFinite(value)) return maxValue;
      return Math.max(maxValue, value);
    }, 0);
    return maxOrder + 1;
  }, [categories]);

  const sortedCategories = React.useMemo(() => (
    [...categories].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
  ), [categories]);

  const companyIdForClients = React.useMemo(() => {
    if (selectedBranch && selectedBranch.id !== 'all' && selectedBranch.company_id) {
      return selectedBranch.company_id;
    }
    const fallback = (branches || []).find(b => b.id !== 'all' && b.company_id);
    return fallback?.company_id || null;
  }, [selectedBranch, branches]);

  const [dragCategoryId, setDragCategoryId] = React.useState(null);
  const [dragOverCategoryId, setDragOverCategoryId] = React.useState(null);
  const dragEnabled = !isMobile;

  const handleDragStart = (categoryId) => {
    setDragCategoryId(categoryId);
  };

  const handleDragOver = (event, categoryId) => {
    event.preventDefault();
    if (categoryId !== dragOverCategoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDragLeave = (categoryId) => {
    if (dragOverCategoryId === categoryId) {
      setDragOverCategoryId(null);
    }
  };

  const handleDrop = async (event, categoryId) => {
    event.preventDefault();
    if (!dragCategoryId || dragCategoryId === categoryId) {
      setDragCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }

    const ids = sortedCategories.map(cat => cat.id);
    const fromIndex = ids.indexOf(dragCategoryId);
    const toIndex = ids.indexOf(categoryId);
    if (fromIndex === -1 || toIndex === -1) {
      setDragCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }

    const nextIds = [...ids];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);

    await reorderCategories(nextIds);
    setDragCategoryId(null);
    setDragOverCategoryId(null);
  };

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

      {productToDelete && (
        <div className="admin-modal-overlay" onClick={() => setProductToDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-confirm-modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', padding: 24, borderRadius: 12, maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <p style={{ margin: '0 0 16px', fontSize: 16 }}>¿Eliminar producto?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="admin-btn secondary" onClick={() => setProductToDelete(null)}>Cancelar</button>
              <button type="button" className="admin-btn danger" onClick={confirmDeleteProduct}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="admin-modal-overlay" onClick={() => setCategoryToDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-confirm-modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', padding: 24, borderRadius: 12, maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <p style={{ margin: '0 0 16px', fontSize: 16 }}>¿Eliminar categoría &quot;{categoryToDelete.name}&quot;? Los productos quedarán sin categoría.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="admin-btn secondary" onClick={() => setCategoryToDelete(null)}>Cancelar</button>
              <button type="button" className="admin-btn danger" onClick={confirmDeleteCategory}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        kanbanColumns={kanbanColumns}
        userRole={userRole}
        userEmail={userEmail}
        branchName={selectedBranch?.name}
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
                      activeTab === 'settings' ? 'Herramientas' :
                      activeTab === 'company' ? 'Datos de la empresa' : 'Categorías'}
          </h1>

          <div className="header-actions">
            <button onClick={() => loadData(true)} className="btn-icon-refresh" disabled={refreshing}>
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* SELECTOR DE SUCURSAL */}
            <div className="branch-selector-wrapper" style={{ marginRight: 10 }}>
              <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 8, gap: 8 }}>
                <MapPin size={16} className="text-accent" />
                <select 
                  value={selectedBranch?.id || ''} 
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setSelectedBranch({ id: 'all', name: 'Todas las sucursales' });
                    } else {
                      const branch = branches.find(b => b.id === e.target.value);
                      setSelectedBranch(branch);
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {branches.map(b => <option key={b.id} value={b.id} style={{color: 'black'}}>{b.name}</option>)}
                  {activeTab === 'analytics' && (
                    <option value="all" style={{color: 'black', fontWeight: 'bold'}}>Todas las sucursales</option>
                  )}
                </select>
              </div>
            </div>

            {activeTab === 'orders' && (
              <>
                <button className={`btn ${isHistoryView ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => setIsHistoryView(!isHistoryView)}
                        style={!isHistoryView ? { background: 'white', color: '#1a1a1a', border: '1px solid #e5e7eb' } : {}}
                >
                  {isHistoryView ? 'Ver Tablero' : 'Ver Historial'}
                </button>
                <button
                  onClick={() => setIsManualOrderModalOpen(true)}
                  className="btn btn-primary"
                  disabled={selectedBranch?.id === 'all' || !selectedBranch}
                  title={selectedBranch?.id === 'all' ? 'Selecciona una sucursal' : undefined}
                >
                  <PlusCircle size={18} /> Pedido Manual
                </button>
              </>
            )}
            {activeTab === 'products' && (
              <button
                onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                className="btn btn-primary"
                disabled={!selectedBranch || selectedBranch.id === 'all'}
                title={selectedBranch?.id === 'all' ? 'Selecciona una sucursal' : undefined}
              >
                <Plus size={18} /> Nuevo Plato
              </button>
            )}
            {activeTab === 'categories' && (
              <button
                onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
                className="btn btn-primary"
                disabled={!selectedBranch || selectedBranch.id === 'all'}
                title={selectedBranch?.id === 'all' ? 'Selecciona una sucursal' : undefined}
              >
                <Plus size={18} /> Nueva Categ.
              </button>
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
              branch={selectedBranch}
              clients={clients}
            />
          ) : (
            <AdminHistoryTable orders={kanbanColumns.history} setReceiptModalOrder={setReceiptModalOrder} />
          )
        )}

        {/* 2. INVENTARIO */}
        {activeTab === 'products' && (
          <div className="products-view animate-fade">
            
            {/* BARRA DE ESTADÍSTICAS */}
            <div className="stats-bar glass" style={{ display: 'flex', gap: 20, padding: '15px 20px', marginBottom: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 8 }}><Package size={18} /></div>
                <div><span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>Total Platos</span><strong style={{ fontSize: '1.1rem' }}>{productStats.total}</strong></div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', padding: 8, borderRadius: 8 }}><Eye size={18} /></div>
                <div><span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>Activos</span><strong style={{ fontSize: '1.1rem', color: '#25d366' }}>{productStats.active}</strong></div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 8, borderRadius: 8 }}><EyeOff size={18} /></div>
                <div><span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>Pausados</span><strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>{productStats.paused}</strong></div>
              </div>
            </div>

            <div className="admin-toolbar glass">
              <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                <div className="search-box" style={{ flex: 1 }}>
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

                <div className="filter-box">
                  <Eye size={18} />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    <option value="active">Solo Activos</option>
                    <option value="paused">Solo Pausados</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
                 <div className="filter-box" style={{ minWidth: 'auto' }}>
                    <ArrowUpDown size={18} />
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                      <option value="name-asc">Nombre (A-Z)</option>
                      <option value="price-asc">Precio (Menor a Mayor)</option>
                      <option value="price-desc">Precio (Mayor a Menor)</option>
                    </select>
                 </div>
                 <button className={`btn-icon-toggle ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Vista Grilla">
                    <LayoutGrid size={18} />
                 </button>
                 <button className={`btn-icon-toggle ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vista Lista">
                    <List size={18} />
                 </button>
              </div>
            </div>
            
            <div className={`inventory-grid ${viewMode === 'list' ? 'list-mode' : ''}`}>
              {processedProducts.map(p => (
                  <InventoryCard
                    key={p.id}
                    product={p}
                    viewMode={viewMode}
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
            <AdminInventory showNotify={showNotify} branchId={selectedBranch?.id} branches={branches} />
        )}

        {/* 3. REPORTES */}
        {activeTab === 'analytics' && (
          <AdminAnalytics 
            orders={orders} 
            products={products} 
            clients={clients} 
            branches={branches.filter(b => b.id !== 'all')}
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
            companyId={companyIdForClients}
          />
        )}

        {/* 4.5 CAJA */}
        {activeTab === 'caja' && (
          <CashManager showNotify={showNotify} selectedBranchId={selectedBranch?.id} />
        )}

        {/* 5. CATEGORÍAS */}
        {activeTab === 'categories' && (
          <div className="cat-container">
            <div className="cat-header">
              <div className="cat-header-left">
                <h2 className="cat-title">Categorías</h2>
                <p className="cat-subtitle">Gestiona tus categorías de productos</p>
              </div>
              <div className="cat-header-actions">
                {categories.length > 0 && (
                  <button
                    onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true) }}
                    className="btn btn-primary"
                    disabled={!selectedBranch || selectedBranch.id === 'all'}
                    title={selectedBranch?.id === 'all' ? 'Selecciona una sucursal' : undefined}
                  >
                    <Plus size={18} /> Nueva Categoría
                  </button>
                )}
              </div>
            </div>
            
            {(!selectedBranch || selectedBranch.id === 'all') ? (
              <div className="cat-empty-state">
                <div className="cat-empty-icon">
                  <List size={48} />
                </div>
                <h3 className="cat-empty-title">Selecciona una sucursal</h3>
                <p className="cat-empty-text">El orden y activación de categorías es por local.</p>
              </div>
            ) : (
            <div className="cat-grid">
              {sortedCategories.map(c => {
                const categoryProducts = products.filter(p => p.category_id === c.id);
                const activeProducts = categoryProducts.filter(p => p.is_active);
                const totalRevenue = orders
                  .filter(o => o.status === 'completed' || o.status === 'picked_up')
                  .reduce((sum, order) => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    return sum + items.reduce((itemSum, item) => {
                      const product = products.find(p => p.id === (item.id ?? item.product_id));
                      if (!product || product.category_id !== c.id) return itemSum;
                      const qty = Math.max(0, Number(item.quantity) || 1);
                      const price = Number(item.price) ?? 0;
                      return itemSum + price * qty;
                    }, 0);
                  }, 0);
                
                return (
                  <div
                    key={c.id}
                    className={`cat-card glass${dragCategoryId === c.id ? ' is-dragging' : ''}${dragOverCategoryId === c.id ? ' is-drop-target' : ''}`}
                    draggable={dragEnabled}
                    onDragStart={dragEnabled ? () => handleDragStart(c.id) : undefined}
                    onDragEnd={dragEnabled ? () => { setDragCategoryId(null); setDragOverCategoryId(null); } : undefined}
                    onDragOver={dragEnabled ? (event) => handleDragOver(event, c.id) : undefined}
                    onDragLeave={dragEnabled ? () => handleDragLeave(c.id) : undefined}
                    onDrop={dragEnabled ? (event) => handleDrop(event, c.id) : undefined}
                  >
                    <div className="cat-card-header">
                      <div className="cat-icon-wrapper">
                        <Tag size={24} />
                      </div>
                      <button
                        type="button"
                        className="cat-status-badge cat-status-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleCategoryActive(c.id, !c.is_active);
                        }}
                        title={c.is_active ? 'Desactivar categoría' : 'Activar categoría'}
                      >
                        <span className={`cat-status-dot ${c.is_active ? 'active' : 'inactive'}`}></span>
                        <span className="cat-status-text">{c.is_active ? 'Activa' : 'Inactiva'}</span>
                      </button>
                    </div>
                    
                    <div className="cat-card-body">
                      <div className="cat-name-row">
                        <h3 className="cat-name">{c.name}</h3>
                        <span className="cat-order-badge">#{Number(c.order) || 0}</span>
                      </div>
                      
                      <div className="cat-stats">
                        <div className="cat-stat">
                          <span className="cat-stat-label">Productos</span>
                          <span className="cat-stat-value">{categoryProducts.length}</span>
                        </div>
                        <div className="cat-stat">
                          <span className="cat-stat-label">Activos</span>
                          <span className="cat-stat-value">{activeProducts.length}</span>
                        </div>
                      </div>
                      
                      <div className="cat-revenue">
                        <span className="cat-revenue-label">Ingresos totales</span>
                        <span className="cat-revenue-value">${totalRevenue.toLocaleString('es-CL')}</span>
                      </div>
                      
                      <div className="cat-progress-wrapper">
                        <div className="cat-progress-bar">
                          <div 
                            className="cat-progress-fill" 
                            style={{ width: `${products.length > 0 ? (categoryProducts.length / products.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="cat-progress-text">
                          {products.length > 0 ? Math.round((categoryProducts.length / products.length) * 100) : 0}% del catálogo
                        </span>
                      </div>
                    </div>
                    
                    <div className="cat-card-footer">
                      <button 
                        onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true) }} 
                        className="cat-btn-edit"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button 
                        onClick={() => {
                          setFilterCategory(c.id);
                          setActiveTab('products');
                        }}
                        className="cat-btn-view"
                      >
                        <ShoppingBag size={16} />
                        Ver productos
                      </button>
                      <button 
                        type="button"
                        onClick={() => deleteCategory(c)}
                        className="cat-btn-delete"
                        title="Eliminar categoría"
                      >
                        <Trash2 size={16} />
                        Borrar
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {categories.length === 0 && (
                <div className="cat-empty-state">
                  <div className="cat-empty-icon">
                    <List size={48} />
                  </div>
                  <h3 className="cat-empty-title">No hay categorías</h3>
                  <p className="cat-empty-text">Crea tu primera categoría para organizar tus productos</p>
                  <button 
                    onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true) }} 
                    className="btn btn-primary"
                  >
                    <Plus size={18} /> Crear Categoría
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* 6. HERRAMIENTAS */}
        {activeTab === 'settings' && (
          <div className="settings-view animate-fade">
             <AdminSettings showNotify={showNotify} isMobile={isMobile} selectedBranch={selectedBranch} onBranchUpdate={refreshBranches} />

             {/* ZONA DE PELIGRO (FUNCIONES AVANZADAS) */}
             <AdminDangerZone 
                orders={orders} 
                showNotify={showNotify} 
                loadData={loadData} 
                isMobile={isMobile}
                selectedBranch={selectedBranch}
             />
          </div>
        )}

        {/* 7. DATOS DE LA EMPRESA (solo rol admin) */}
        {activeTab === 'company' && (
          <div className="settings-view animate-fade">
            <AdminCompanyData showNotify={showNotify} isMobile={isMobile} branches={branches} onBranchUpdate={refreshBranches} />
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



      {/* MODAL COMPROBANTE (EXISTENTE) */}
      {receiptModalOrder && (
        <div className="admin-panel-overlay" onClick={() => { if (receiptPreview) URL.revokeObjectURL(receiptPreview); setReceiptModalOrder(null); setReceiptPreview(null); }}>
          <div className="admin-side-panel glass animate-slide-in" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="admin-side-header">
              <h3>Comprobante de Pago</h3>
              <button onClick={() => { if (receiptPreview) URL.revokeObjectURL(receiptPreview); setReceiptModalOrder(null); setReceiptPreview(null); }} className="btn-close-sidepanel"><X size={24} /></button>
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
        categories={categories}
        onOrderSaved={() => loadData(true)}
        isMobile={isMobile}
        showNotify={showNotify}
        registerSale={cashSystem.registerSale}
        branch={selectedBranch} // Pass selected branch
      />

      {isModalOpen && (
        <ProductModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveProduct} 
          product={editingProduct} 
          categories={categories} 
          saving={refreshing}
        />
      )}

      {/* MODAL DE SELECCIÓN DE ALCANCE */}
      <ScopeSelectionModal
        isOpen={scopeModal.isOpen}
        onClose={() => setScopeModal({ ...scopeModal, isOpen: false })}
        onConfirm={handleScopeConfirm}
        branchName={selectedBranch?.name || 'Sucursal'}
        actionType={scopeModal.item?.is_active ? 'deactivate' : 'activate'}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        category={editingCategory}
        defaultOrder={editingCategory ? editingCategory.order : nextCategoryOrder}
      />
    </div>
  );
};

const Admin = () => (
  <AdminProvider>
    <AdminPage />
  </AdminProvider>
);

export default Admin;
