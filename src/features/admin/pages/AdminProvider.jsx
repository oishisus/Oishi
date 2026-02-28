import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import { uploadImage, validateImageFile } from '../../../shared/utils/cloudinary';
import { useCashSystem } from '../hooks/useCashSystem';
import { sanitizeOrder } from '../../../shared/utils/orderUtils';

let notificationAudio;
try {
	notificationAudio = new Audio('/sounds/notification.mp3');
	notificationAudio.preload = 'auto';
} catch (_) {}

export const AdminContext = createContext(null);

export const useAdmin = () => {
	const context = useContext(AdminContext);
	if (!context) throw new Error('useAdmin must be used within an AdminProvider');
	return context;
};

export const AdminProvider = ({ children }) => {
	const navigate = useNavigate();

	const [activeTab, setActiveTab] = useState('orders');
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [orders, setOrders] = useState([]);
	const [clients, setClients] = useState([]);
	const [branches, setBranches] = useState([]);
	const [selectedBranch, setSelectedBranch] = useState(null);
	const [isHistoryView, setIsHistoryView] = useState(false);
	const [mobileTab, setMobileTab] = useState('pending');
	const [searchQuery, setSearchQuery] = useState('');
	const [filterCategory, setFilterCategory] = useState('all');
	const [filterStatus, setFilterStatus] = useState('all');
	const [viewMode, setViewMode] = useState('grid');
	const [sortOrder, setSortOrder] = useState('name-asc');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState(null);
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);
	const [notification, setNotification] = useState(null);
	const [receiptModalOrder, setReceiptModalOrder] = useState(null);
	const [receiptPreview, setReceiptPreview] = useState(null);
	const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
	const [uploadingReceipt, setUploadingReceipt] = useState(false);
	const [scopeModal, setScopeModal] = useState({ isOpen: false, item: null, type: 'product' });
	const [productToDelete, setProductToDelete] = useState(null);
	const [categoryToDelete, setCategoryToDelete] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [userEmail, setUserEmail] = useState(null);
	const [selectedClient, setSelectedClient] = useState(null);
	const [selectedClientOrders, setSelectedClientOrders] = useState([]);
	const [clientHistoryLoading, setClientHistoryLoading] = useState(false);

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth <= 1024);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const showNotify = useCallback((msg, type = 'success') => {
		setNotification({ msg, type });
		setTimeout(() => setNotification(null), 3000);
	}, []);

	const cashSystem = useCashSystem(showNotify, selectedBranch?.id);

	useEffect(() => {
		const verifyAdminAccess = async () => {
			// Usar getSession() (storage) en lugar de getUser() (red) para no redirigir al recargar
			// mientras la sesión ya fue validada por ProtectedRoute.
			const { data: { session } } = await supabase.auth.getSession();
			const user = session?.user;
			if (!user?.email) {
				setUserRole(null);
				navigate('/login');
				return;
			}
			setUserEmail(user.email);
				const [{ data: isAdmin, error: adminError }, { data: role, error: roleError }] = await Promise.all([
					supabase.rpc('is_admin'),
					supabase.rpc('get_user_role')
				]);
				if (adminError || !isAdmin) {
				setUserRole(null);
				await supabase.auth.signOut();
				navigate('/login');
				showNotify('No tienes permisos de administrador', 'error');
			} else {
					setUserRole(role || null);
			}
		};
		verifyAdminAccess();
	}, [navigate, showNotify]);

	const refreshBranches = useCallback(async () => {
		const { data, error } = await supabase.from(TABLES.branches).select('*').order('name');
		if (!error && data?.length > 0) {
			setBranches(data);
			setSelectedBranch(prev => {
				if (!prev || prev.id === 'all') return prev || data[0];
				const updated = data.find(b => b.id === prev.id);
				return updated || data[0];
			});
		}
	}, []);

	useEffect(() => { refreshBranches(); }, [refreshBranches]);

	useEffect(() => {
		if (branches.length === 0) return;
		if (activeTab !== 'analytics' && (!selectedBranch || selectedBranch.id === 'all')) {
			setSelectedBranch(branches[0]);
		}
	}, [activeTab, branches, selectedBranch]);

	const loadData = useCallback(async (isRefresh = false) => {
		if (!selectedBranch) return;
		if (isRefresh) setRefreshing(true);
		else setLoading(true);
		try {
			const isAllBranches = selectedBranch.id === 'all';
			const categoriesQuery = isAllBranches
				? supabase.from(TABLES.categories).select('*').order('order')
				: supabase
					.from(TABLES.categories)
					.select('id, name, company_id, category_branch!inner(order, is_active, branch_id)')
					.eq('category_branch.branch_id', selectedBranch.id);
			const promises = [
				categoriesQuery,
				supabase.from(TABLES.products).select('*').order('name'),
				isAllBranches
					? supabase.from(TABLES.orders).select('*').order('created_at', { ascending: false }).limit(100)
					: supabase.from(TABLES.orders).select('*').eq('branch_id', selectedBranch.id).order('created_at', { ascending: false }).limit(100),
				supabase.from(TABLES.clients).select('*').order('last_order_at', { ascending: false }).limit(200)
			];
			if (!isAllBranches) {
				promises.push(supabase.from(TABLES.product_prices).select('*').eq('branch_id', selectedBranch.id));
				promises.push(supabase.from(TABLES.product_branch).select('*').eq('branch_id', selectedBranch.id));
			}
			const results = await Promise.all(promises);
			const [catsRes, globalProductsRes, ordsRes, cltsRes] = results;
			const pricesRes = !isAllBranches ? results[4] : { data: [] };
			const branchStatusRes = !isAllBranches ? results[5] : { data: [] };
			if (catsRes.error) throw catsRes.error;
			if (globalProductsRes.error) throw globalProductsRes.error;
			if (ordsRes.error) throw ordsRes.error;
			if (cltsRes.error) throw cltsRes.error;
			if (!isAllBranches) {
				if (pricesRes.error) throw pricesRes.error;
				if (branchStatusRes.error) throw branchStatusRes.error;
			}
			const branchPrices = pricesRes.data || [];
			const branchStatuses = branchStatusRes.data || [];
			const mergedProducts = (globalProductsRes.data || []).map(prod => {
				if (isAllBranches) return prod;
				const priceData = branchPrices.find(p => p.product_id === prod.id);
				const statusData = branchStatuses.find(s => s.product_id === prod.id);
				return {
					...prod,
					price: priceData ? priceData.price : 0,
					has_discount: priceData ? priceData.has_discount : false,
					discount_price: priceData ? priceData.discount_price : 0,
					is_active: statusData ? statusData.is_active : false,
					is_special: statusData ? statusData.is_special : false,
					category_id: statusData?.category_id || prod.category_id,
					price_id: priceData?.id,
					branch_relation_id: statusData?.id
				};
			});
			const cleanOrders = (ordsRes.data || []).map(sanitizeOrder);
			const clientIdsInOrders = new Set(cleanOrders.map(o => o.client_id).filter(Boolean));
			const filteredClients = (cltsRes.data || []).filter(c => clientIdsInOrders.has(c.id));
			const categoriesData = (catsRes.data || []).map(cat => {
				if (isAllBranches) return cat;
				const branchInfo = Array.isArray(cat.category_branch) ? cat.category_branch[0] : null;
				return {
					id: cat.id,
					name: cat.name,
					company_id: cat.company_id,
					order: branchInfo?.order ?? 0,
					is_active: branchInfo?.is_active ?? false
				};
			}).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
			setCategories(categoriesData);
			setProducts(mergedProducts);
			setOrders(cleanOrders);
			setClients(filteredClients);
		} catch (error) {
			showNotify("Error de conexión", 'error');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [showNotify, selectedBranch]);

	const loadClientHistory = useCallback(async (client) => {
		if (!client) return;
		setClientHistoryLoading(true);
		try {
			const { data, error } = await supabase
				.from(TABLES.orders)
				.select('*')
				.eq('client_id', client.id)
				.order('created_at', { ascending: false });
			if (error) throw error;
			setSelectedClientOrders((data || []).map(sanitizeOrder));
		} catch {
			showNotify('Error al cargar historial', 'error');
		} finally {
			setClientHistoryLoading(false);
		}
	}, [showNotify]);

	const handleSelectClient = useCallback((client) => {
		setSelectedClient(client);
		loadClientHistory(client);
	}, [loadClientHistory]);

	const handleRealtimeEvent = useCallback((payload) => {
		if (payload.eventType === 'INSERT') {
			const newOrder = sanitizeOrder(payload.new);
			setOrders(prev => [newOrder, ...prev]);
			showNotify(`Nuevo pedido #${newOrder.id.toString().slice(-4)}`, 'success');
			try {
				if (typeof notificationAudio !== 'undefined') {
					notificationAudio.currentTime = 0;
					notificationAudio.play().catch(() => {});
				}
			} catch (_) {}
		} else if (payload.eventType === 'UPDATE') {
			setOrders(prev => prev.map(o => o.id === payload.new?.id ? sanitizeOrder(payload.new) : o));
		} else if (payload.eventType === 'DELETE') {
			setOrders(prev => prev.filter(o => o.id !== payload.old?.id));
		}
	}, [showNotify]);

	useEffect(() => {
		loadData();
		const channel = supabase
			.channel('table-db-changes')
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'orders',
				filter: selectedBranch && selectedBranch.id !== 'all' ? `branch_id=eq.${selectedBranch.id}` : undefined
			}, handleRealtimeEvent)
			.subscribe();
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible' && !isModalOpen && !editingProduct) loadData(true);
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			supabase.removeChannel(channel);
		};
	}, [loadData, handleRealtimeEvent, isModalOpen, editingProduct, selectedBranch]);

	const moveOrder = useCallback(async (orderId, nextStatus) => {
		const previousOrders = [...orders];
		setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
		try {
			const { error } = await supabase.from(TABLES.orders).update({ status: nextStatus }).eq('id', orderId);
			if (error) throw error;
			if (nextStatus === 'completed' || nextStatus === 'picked_up') {
				const targetOrder = previousOrders.find(o => o.id === orderId);
				if (targetOrder) {
					const ok = await cashSystem.registerSale(targetOrder);
					if (!ok) {
						showNotify('No se pudo registrar la venta en caja', 'error');
					}
				}
			}
			if (nextStatus === 'cancelled') {
				const targetOrder = previousOrders.find(o => o.id === orderId);
				if (targetOrder && (targetOrder.status === 'completed' || targetOrder.status === 'picked_up')) {
					const ok = await cashSystem.registerRefund(targetOrder);
					if (!ok) {
						showNotify('No se pudo registrar la devolucion en caja', 'error');
					}
				}
			}
			showNotify('Pedido actualizado');
		} catch {
			setOrders(previousOrders);
			showNotify("Error al actualizar", "error");
		}
	}, [orders, activeTab, cashSystem, showNotify]);

	const uploadReceiptToOrder = useCallback(async (orderId, file) => {
		if (!file) return;
		setUploadingReceipt(true);
		try {
			const receiptUrl = await uploadImage(file, 'receipts');
			const { error } = await supabase.from(TABLES.orders).update({ payment_ref: receiptUrl }).eq('id', orderId);
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
	}, [selectedClient, showNotify]);

	const handleReceiptFileChange = useCallback((e) => {
		const file = e.target.files[0];
		if (file) {
			const { valid, error: validationError } = validateImageFile(file);
			if (!valid) {
				showNotify(validationError || 'Archivo no válido', 'error');
				e.target.value = '';
				return;
			}
			setReceiptPreview(prev => {
				if (prev) URL.revokeObjectURL(prev);
				return URL.createObjectURL(file);
			});
		}
	}, [showNotify]);

	const handleSaveProduct = useCallback(async (formData, localFile) => {
		if (!selectedBranch) return;
		if (selectedBranch.id === 'all') {
			showNotify('Selecciona una sucursal para crear o editar productos', 'error');
			return;
		}
		setRefreshing(true);
		try {
			let finalImageUrl = formData.image_url;
			if (localFile) finalImageUrl = await uploadImage(localFile, 'menu');
			const { data: productId, error } = await supabase.rpc('admin_upsert_product_with_branch', {
				p_product_id: editingProduct?.id || null,
				p_name: formData.name,
				p_description: formData.description,
				p_image_url: finalImageUrl,
				p_category_id: formData.category_id || null,
				p_branch_id: selectedBranch.id,
				p_price: Number(formData.price) || 0,
				p_has_discount: formData.has_discount || false,
				p_discount_price: formData.has_discount ? (Number(formData.discount_price) || 0) : null,
				p_is_active: editingProduct ? Boolean(editingProduct.is_active) : true,
				p_is_special: formData.is_special || false
			});
			if (error) throw error;
			if (!productId) throw new Error('No se pudo guardar el producto');
			showNotify(editingProduct ? "Producto actualizado" : "Producto creado");
			setIsModalOpen(false);
			loadData(true);
		} catch (error) {
			showNotify("Error: " + error.message, 'error');
		} finally {
			setRefreshing(false);
		}
	}, [selectedBranch, editingProduct, showNotify, loadData]);

	const deleteProduct = useCallback((id) => setProductToDelete(id), []);

	const confirmDeleteProduct = useCallback(async () => {
		if (!productToDelete) return;
		const id = productToDelete;
		setProductToDelete(null);
		try {
			const { error } = await supabase.rpc('admin_delete_product_with_branch', {
				p_product_id: id
			});
			if (error) throw error;
			showNotify("Producto eliminado correctamente");
			loadData(true);
		} catch (error) {
			showNotify("No se pudo eliminar: " + (error.message || 'Error desconocido'), 'error');
		}
	}, [productToDelete, showNotify, loadData]);

	const toggleProductActive = useCallback((product, e) => {
		e.stopPropagation();
		if (!selectedBranch) return;
		setScopeModal({ isOpen: true, item: product, type: 'product' });
	}, [selectedBranch]);

	const handleScopeConfirm = useCallback(async (scope) => {
		const { item, type } = scopeModal;
		setScopeModal(prev => ({ ...prev, isOpen: false }));
		if (!item) return;
		const newActive = !item.is_active;
		if (type === 'product') {
			setProducts(prev => prev.map(p => p.id === item.id ? { ...p, is_active: newActive } : p));
		}
		try {
			if (scope === 'global' || selectedBranch?.id === 'all') {
				await supabase.from(TABLES.products).update({ is_active: newActive }).eq('id', item.id);
				showNotify(newActive ? 'Activado en todos los locales' : 'Desactivado en todos los locales');
			} else {
				await supabase.from(TABLES.product_branch).upsert({
					product_id: item.id,
					branch_id: selectedBranch.id,
					is_active: newActive,
					company_id: selectedBranch.company_id || null
				}, { onConflict: 'product_id, branch_id' });
				showNotify(newActive ? 'Activado en este local' : 'Desactivado en este local');
			}
		} catch {
			loadData(true);
			showNotify('Error al cambiar estado', 'error');
		}
	}, [scopeModal, selectedBranch, showNotify, loadData]);

	const handleSaveCategory = useCallback(async (formData) => {
		if (!selectedBranch || selectedBranch.id === 'all') {
			showNotify('Selecciona una sucursal para gestionar categorías', 'error');
			return;
		}
		try {
			const orderValue = Number(formData.order);
			const normalizedOrder = Number.isFinite(orderValue) && orderValue > 0 ? orderValue : null;
			if (editingCategory) {
				const { error } = await supabase
					.from(TABLES.categories)
					.update({ name: formData.name })
					.eq('id', editingCategory.id);
				if (error) throw error;

				const { error: statusError } = await supabase
					.from(TABLES.category_branch)
					.upsert({
						category_id: editingCategory.id,
						branch_id: selectedBranch.id,
						is_active: formData.is_active,
						company_id: selectedBranch.company_id || null
					}, { onConflict: 'category_id, branch_id' });
				if (statusError) throw statusError;

				if (normalizedOrder && normalizedOrder !== editingCategory.order) {
					const { error: reorderError } = await supabase.rpc('admin_set_category_order', {
						p_branch_id: selectedBranch.id,
						p_category_id: editingCategory.id,
						p_new_order: normalizedOrder
					});
					if (reorderError) throw reorderError;
				}
			} else {
				const { error } = await supabase.rpc('admin_create_category_with_overrides', {
					p_name: formData.name,
					p_branch_id: selectedBranch.id,
					p_order: normalizedOrder,
					p_is_active: formData.is_active
				});
				if (error) throw error;
			}
			setIsCategoryModalOpen(false);
			loadData(true);
			showNotify('Categoría guardada');
		} catch (error) {
			showNotify('Error al guardar: ' + error.message, 'error');
		}
	}, [selectedBranch, editingCategory, showNotify, loadData]);

	const reorderCategories = useCallback(async (orderedIds) => {
		if (!selectedBranch || selectedBranch.id === 'all') return;
		if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
		setCategories(prev => {
			const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
			return prev.map(cat => orderMap.has(cat.id) ? { ...cat, order: orderMap.get(cat.id) } : cat);
		});
		const { error } = await supabase.rpc('admin_reorder_categories', {
			p_branch_id: selectedBranch.id,
			p_category_ids: orderedIds
		});
		if (error) {
			showNotify('No se pudo reordenar categorías', 'error');
			loadData(true);
		}
	}, [selectedBranch, showNotify, loadData]);

	const toggleCategoryActive = useCallback(async (categoryId, nextValue) => {
		if (!selectedBranch || selectedBranch.id === 'all') return;
		setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, is_active: nextValue } : cat));
		const { error } = await supabase
			.from(TABLES.category_branch)
			.upsert({
				category_id: categoryId,
				branch_id: selectedBranch.id,
				is_active: nextValue,
				company_id: selectedBranch.company_id || null
			}, { onConflict: 'category_id, branch_id' });
		if (error) {
			showNotify('No se pudo actualizar la categoría', 'error');
			loadData(true);
		}
	}, [selectedBranch, showNotify, loadData]);

	const deleteCategory = useCallback((cat) => {
		setCategoryToDelete(cat);
	}, []);

	const confirmDeleteCategory = useCallback(async () => {
		if (!categoryToDelete) return;
		const id = categoryToDelete.id;
		setCategoryToDelete(null);
		try {
			await supabase.from(TABLES.products).update({ category_id: null }).eq('category_id', id);
			const { error } = await supabase.from(TABLES.categories).delete().eq('id', id);
			if (error) throw error;
			showNotify('Categoría eliminada');
			loadData(true);
		} catch (error) {
			showNotify('No se pudo eliminar: ' + (error.message || 'Error desconocido'), 'error');
		}
	}, [categoryToDelete, showNotify, loadData]);

	const kanbanColumns = useMemo(() => ({
		pending: orders.filter(o => o.status === 'pending'),
		active: orders.filter(o => o.status === 'active'),
		completed: orders.filter(o => o.status === 'completed'),
		cancelled: orders.filter(o => o.status === 'cancelled'),
		history: orders.filter(o => o.status === 'picked_up' || o.status === 'cancelled')
	}), [orders]);

	const processedProducts = useMemo(() => {
		let result = products.filter(p =>
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
			(filterCategory === 'all' || p.category_id === filterCategory) &&
			(filterStatus === 'all' || (filterStatus === 'active' ? p.is_active : !p.is_active))
		);
		return result.sort((a, b) => {
			if (filterStatus === 'all' && a.is_active !== b.is_active) return a.is_active ? -1 : 1;
			if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
			if (sortOrder === 'price-asc') return a.price - b.price;
			if (sortOrder === 'price-desc') return b.price - a.price;
			return 0;
		});
	}, [products, searchQuery, filterCategory, filterStatus, sortOrder]);

	const productStats = useMemo(() => ({
		total: products.length,
		active: products.filter(p => p.is_active).length,
		paused: products.filter(p => !p.is_active).length
	}), [products]);

	const value = useMemo(() => ({
		navigate,
		activeTab, setActiveTab,
		products, setProducts,
		categories, setCategories,
		orders, setOrders,
		clients, setClients,
		branches, setBranches,
		selectedBranch, setSelectedBranch,
		isHistoryView, setIsHistoryView,
		mobileTab, setMobileTab,
		searchQuery, setSearchQuery,
		filterCategory, setFilterCategory,
		filterStatus, setFilterStatus,
		viewMode, setViewMode,
		sortOrder, setSortOrder,
		loading, setLoading,
		refreshing, setRefreshing,
		isMobile, setIsMobile,
		isModalOpen, setIsModalOpen,
		editingProduct, setEditingProduct,
		isCategoryModalOpen, setIsCategoryModalOpen,
		editingCategory, setEditingCategory,
		notification, setNotification,
		receiptModalOrder, setReceiptModalOrder,
		receiptPreview, setReceiptPreview,
		isManualOrderModalOpen, setIsManualOrderModalOpen,
		uploadingReceipt, setUploadingReceipt,
		selectedClient, setSelectedClient,
		selectedClientOrders, setSelectedClientOrders,
		clientHistoryLoading, setClientHistoryLoading,
		userRole,
		showNotify,
		cashSystem,
		loadData,
		refreshBranches,
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
		toggleCategoryActive,
		reorderCategories,
		kanbanColumns,
		processedProducts,
		productStats,
		userEmail,
		productToDelete,
		setProductToDelete,
		confirmDeleteProduct,
	}), [
		navigate, activeTab, products, categories, orders, clients, branches, selectedBranch,
		isHistoryView, mobileTab, searchQuery, filterCategory, filterStatus, viewMode, sortOrder,
		loading, refreshing, isMobile, isModalOpen, editingProduct, isCategoryModalOpen, editingCategory,
		notification, receiptModalOrder, receiptPreview, isManualOrderModalOpen, uploadingReceipt,
		selectedClient, selectedClientOrders, clientHistoryLoading, userRole, showNotify, cashSystem,
		loadData, refreshBranches, handleSelectClient, moveOrder, uploadReceiptToOrder, handleReceiptFileChange,
		handleSaveProduct, deleteProduct, toggleProductActive, scopeModal, handleScopeConfirm, handleSaveCategory,
		deleteCategory, categoryToDelete, confirmDeleteCategory, toggleCategoryActive, reorderCategories,
		kanbanColumns, processedProducts, productStats, userEmail, productToDelete, confirmDeleteProduct,
	]);

	return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};