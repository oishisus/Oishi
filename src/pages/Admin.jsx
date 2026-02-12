import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, List, Settings, Plus, Edit, Trash, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import { supabase } from '../lib/supabase';

const Admin = () => {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState('products');
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState(null);
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);
	const [saving, setSaving] = useState(false);

	const sidebarItems = [
		{ id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
		{ id: 'products', label: 'Productos', icon: <ShoppingBag size={20} /> },
		{ id: 'categories', label: 'Categorías', icon: <List size={20} /> },
		{ id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> },
	];

	// Cargar datos desde Supabase
	useEffect(() => {
		const loadData = async () => {
			try {
				// Cargar categorías
				const { data: categoriesData, error: categoriesError } = await supabase
					.from('categories')
					.select('*')
					.order('order', { ascending: true });

				if (categoriesError) throw categoriesError;

				// Cargar productos
				const { data: productsData, error: productsError } = await supabase
					.from('products')
					.select('*, categories(name)')
					.order('name', { ascending: true });

				if (productsError) throw productsError;

				setCategories(categoriesData || []);
				setProducts(productsData || []);
			} catch (error) {
				console.error('Error cargando datos:', error);
				alert('Error al cargar los datos. Verifica tu conexión a Supabase.');
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const handleOpenModal = (product = null) => {
		setEditingProduct(product);
		setIsModalOpen(true);
	};

	const handleOpenCategoryModal = (category = null) => {
		setEditingCategory(category);
		setIsCategoryModalOpen(true);
	};

	const handleSaveProduct = async (formData) => {
		setSaving(true);
		try {
			if (editingProduct) {
				// Actualizar producto existente
				const { data, error } = await supabase
					.from('products')
					.update({
						name: formData.name,
						description: formData.description || null,
						price: parseInt(formData.price),
						category_id: formData.category_id,
						image_url: formData.image_url || null,
						is_special: formData.is_special || false,
					})
					.eq('id', editingProduct.id)
					.select()
					.single();

				if (error) throw error;

				// Actualizar estado local
				setProducts(products.map(p => p.id === editingProduct.id ? data : p));
			} else {
				// Crear nuevo producto
				const { data, error } = await supabase
					.from('products')
					.insert({
						name: formData.name,
						description: formData.description || null,
						price: parseInt(formData.price),
						category_id: formData.category_id,
						image_url: formData.image_url || null,
						is_special: formData.is_special || false,
						is_active: true,
					})
					.select()
					.single();

				if (error) throw error;

				// Actualizar estado local
				setProducts([...products, data]);
			}

			setIsModalOpen(false);
			setEditingProduct(null);
		} catch (error) {
			console.error('Error guardando producto:', error);
			alert('Error al guardar el producto: ' + error.message);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

		try {
			const { error } = await supabase
				.from('products')
				.update({ is_active: false })
				.eq('id', id);

			if (error) throw error;

			// Actualizar estado local (marcar como inactivo)
			setProducts(products.map(p => p.id === id ? { ...p, is_active: false } : p));
		} catch (error) {
			console.error('Error eliminando producto:', error);
			alert('Error al eliminar el producto: ' + error.message);
		}
	};

	const handleSaveCategory = async (formData) => {
		setSaving(true);
		try {
			if (editingCategory) {
				const { data, error } = await supabase
					.from('categories')
					.update({
						name: formData.name,
						order: parseInt(formData.order),
						is_active: formData.is_active
					})
					.eq('id', editingCategory.id)
					.select()
					.single();

				if (error) throw error;
				setCategories(categories.map(c => c.id === editingCategory.id ? data : c).sort((a,b) => a.order - b.order));
			} else {
				const { data, error } = await supabase
					.from('categories')
					.insert({
						id: formData.name.toLowerCase().replace(/\s+/g, '-'),
						name: formData.name,
						order: parseInt(formData.order),
						is_active: true
					})
					.select()
					.single();

				if (error) throw error;
				setCategories([...categories, data].sort((a,b) => a.order - b.order));
			}
			setIsCategoryModalOpen(false);
			setEditingCategory(null);
		} catch (error) {
			console.error('Error guardando categoría:', error);
			alert('Error al guardar la categoría: ' + error.message);
		} finally {
			setSaving(false);
		}
	};

	const getCategoryName = (categoryId) => {
		const category = categories.find(c => c.id === categoryId);
		return category ? category.name : 'Sin categoría';
	};

	if (loading) {
		return (
			<div className="admin-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
				<Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
			</div>
		);
	}

	return (
		<div className="admin-container">
			<aside className="admin-sidebar glass">
				<div className="sidebar-header">
					<button onClick={() => navigate('/')} className="btn-back-home">
						<ArrowLeft size={18} />
						<span>Volver</span>
					</button>
					<h3>Oishi Admin</h3>
				</div>
				
				<nav className="sidebar-nav">
					{sidebarItems.map(item => (
						<button
							key={item.id}
							onClick={() => setActiveTab(item.id)}
							className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
						>
							{item.icon}
							<span>{item.label}</span>
						</button>
					))}
				</nav>
			</aside>

			<main className="admin-main">
				<header className="admin-top-bar glass">
					<h2>{sidebarItems.find(i => i.id === activeTab)?.label}</h2>
					{activeTab === 'products' && (
						<button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm">
							<Plus size={18} />
							<span>Nuevo Producto</span>
						</button>
					)}
					{activeTab === 'categories' && (
						<button onClick={() => handleOpenCategoryModal()} className="btn btn-primary btn-sm">
							<Plus size={18} />
							<span>Nueva Categoría</span>
						</button>
					)}
				</header>

				<section className="admin-content container">
					{activeTab === 'products' ? (
						<div className="table-wrapper glass">
							<table>
								<thead>
									<tr>
										<th>Nombre</th>
										<th>Categoría</th>
										<th>Precio</th>
										<th>Especial</th>
										<th>Estado</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{products.length === 0 ? (
										<tr>
											<td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
												No hay productos. Crea uno nuevo para comenzar.
											</td>
										</tr>
									) : (
										products.map(product => (
											<tr key={product.id}>
												<td>{product.name}</td>
												<td>{getCategoryName(product.category_id)}</td>
												<td>${product.price ? product.price.toLocaleString('es-CL') : '0'}</td>
												<td>{product.is_special ? '🔥' : '-'}</td>
												<td>
													<span className={product.is_active ? 'badge-active' : 'badge-inactive'}>
														{product.is_active ? 'Activo' : 'Inactivo'}
													</span>
												</td>
												<td className="actions">
													<button onClick={() => handleOpenModal(product)} className="btn-icon-sm"><Edit size={16} /></button>
													<button onClick={() => handleDelete(product.id)} className="btn-icon-sm text-red"><Trash size={16} /></button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					) : activeTab === 'categories' ? (
						<div className="table-wrapper glass">
							<table>
								<thead>
									<tr>
										<th>Orden</th>
										<th>Nombre</th>
										<th>Estado</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{categories.map(cat => (
										<tr key={cat.id}>
											<td>{cat.order}</td>
											<td>{cat.name}</td>
											<td>
												<span className={cat.is_active ? 'badge-active' : 'badge-inactive'}>
													{cat.is_active ? 'Activa' : 'Inactiva'}
												</span>
											</td>
											<td className="actions">
												<button onClick={() => handleOpenCategoryModal(cat)} className="btn-icon-sm"><Edit size={16} /></button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="placeholder-content">
							<p>Módulo de {activeTab} en desarrollo...</p>
						</div>
					)}
				</section>
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
			
			<style jsx>{`
				.admin-container {
					display: flex;
					min-height: 100vh;
					background: #050505;
				}
				.admin-sidebar {
					width: 240px;
					height: 100vh;
					position: sticky;
					top: 0;
					display: flex;
					flex-direction: column;
					padding: 20px 0;
					border-right: 1px solid var(--card-border);
				}
				.sidebar-header { padding: 0 20px; margin-bottom: 30px; }
				.btn-back-home { background: none; border: none; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; font-size: 0.8rem; cursor: pointer; margin-bottom: 10px; }
				.sidebar-header h3 { font-size: 1.2rem; color: var(--accent-primary); }
				.sidebar-nav { display: flex; flex-direction: column; gap: 5px; padding: 0 10px; }
				.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: transparent; border: none; color: var(--text-secondary); border-radius: 10px; cursor: pointer; transition: var(--transition-fast); width: 100%; text-align: left; }
				.nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
				.nav-item.active { background: var(--accent-primary); color: white; }
				.admin-main { flex-grow: 1; display: flex; flex-direction: column; }
				.admin-top-bar { padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
				.btn-sm { padding: 8px 16px; font-size: 0.9rem; }
				.table-wrapper { border-radius: 15px; overflow: auto; margin-top: 20px; }
				table { width: 100%; border-collapse: collapse; min-width: 600px; }
				th { text-align: left; padding: 15px; color: var(--text-secondary); font-size: 0.85rem; border-bottom: 1px solid var(--card-border); }
				td { padding: 15px; border-bottom: 1px solid var(--card-border); vertical-align: middle; }
				.badge-active { background: rgba(37, 211, 102, 0.2); color: #25d366; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
				.badge-inactive { background: rgba(255, 0, 0, 0.2); color: #ff4444; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
				.actions { display: flex; gap: 10px; }
				.btn-icon-sm { background: var(--bg-tertiary); border: none; color: white; padding: 6px; border-radius: 6px; cursor: pointer; }
				.text-red { color: var(--accent-primary); }
				.placeholder-content { padding: 50px; text-align: center; color: var(--text-muted); }
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				.animate-spin {
					animation: spin 1s linear infinite;
				}
				@media (max-width: 768px) { .admin-sidebar { width: 60px; } .nav-item span, .sidebar-header h3, .btn-back-home span { display: none; } }
			`}</style>
		</div>
	);
};

export default Admin;
