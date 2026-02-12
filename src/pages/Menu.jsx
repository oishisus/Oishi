import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import { Search, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Menu = () => {
	const navigate = useNavigate();
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeCategory, setActiveCategory] = useState(null);
	const sectionRefs = useRef({});

	// Cargar datos desde Supabase
	useEffect(() => {
		const loadData = async () => {
			try {
				// Cargar categorías ordenadas
				const { data: categoriesData, error: categoriesError } = await supabase
					.from('categories')
					.select('*')
					.eq('is_active', true)
					.order('order', { ascending: true });

				if (categoriesError) throw categoriesError;

				// Cargar productos
				const { data: productsData, error: productsError } = await supabase
					.from('products')
					.select('*')
					.eq('is_active', true) // Solo productos activos
					.order('name', { ascending: true });

				if (productsError) throw productsError;

				setCategories(categoriesData || []);
				setProducts(productsData || []);

				// Establecer primera categoría como activa (o especial si hay productos especiales)
				const hasSpecial = (productsData || []).some(p => p.is_special);
				if (hasSpecial) {
					setActiveCategory('special');
				} else if (categoriesData && categoriesData.length > 0) {
					setActiveCategory(categoriesData[0].id);
				}
			} catch (error) {
				console.error('Error cargando datos:', error);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const scrollToCategory = (id) => {
		setActiveCategory(id);
		const element = document.getElementById(`section-${id}`);
		if (element) {
			const offset = 80;
			const bodyRect = document.body.getBoundingClientRect().top;
			const elementRect = element.getBoundingClientRect().top;
			const elementPosition = elementRect - bodyRect;
			const offsetPosition = elementPosition - offset;

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			});
		}
	};

	// Separar productos especiales
	const specialProducts = products.filter(p => p.is_special);

	useEffect(() => {
		if (categories.length === 0) return;

		const handleScroll = () => {
			const scrollPosition = window.scrollY + 100;

			// Verificar sección especial primero
			if (specialProducts.length > 0) {
				const specialElement = document.getElementById('section-special');
				if (specialElement) {
					const top = specialElement.offsetTop;
					const height = specialElement.offsetHeight;
					if (scrollPosition >= top && scrollPosition < top + height) {
						setActiveCategory('special');
						return;
					}
				}
			}

			// Verificar categorías normales
			for (const cat of categories) {
				const element = document.getElementById(`section-${cat.id}`);
				if (element) {
					const top = element.offsetTop;
					const height = element.offsetHeight;

					if (scrollPosition >= top && scrollPosition < top + height) {
						setActiveCategory(cat.id);
						break;
					}
				}
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [categories, specialProducts]);


	if (loading) {
		return (
			<div className="menu-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
				<Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
			</div>
		);
	}

	return (
		<div className="menu-page">
			      <header className="menu-header">
        <div className="container-full">
          <div className="menu-header-content">
            <button onClick={() => window.history.back()} className="btn-icon">
              <ChevronLeft size={24} />
            </button>
            <div className="menu-title">
              <h1>Oishi Sushi</h1>
              <span>CARTA DIGITAL</span>
            </div>
            <button className="btn-icon">
              <Search size={24} />
            </button>
          </div>
        </div>
      </header>

			<Navbar 
				categories={[
					...(specialProducts.length > 0 ? [{ id: 'special', name: '⭐ Solo por hoy' }] : []),
					...categories
				]} 
				activeCategory={activeCategory} 
				onCategoryClick={scrollToCategory} 
			/>

			<main className="menu-main container-full animate-fade">
				{/* Sección de productos especiales */}
				{specialProducts.length > 0 && (
					<section 
						id="section-special" 
						className="category-section"
					>
						<h2 className="section-title">⭐ Solo por hoy</h2>
						<div className="products-grid">
							{specialProducts.map(product => (
								<ProductCard 
									key={product.id} 
									product={product} 
									onAdd={(p) => console.log('Añadido:', p.name)} 
								/>
							))}
						</div>
					</section>
				)}

				{/* Categorías normales */}
				{categories.map((cat) => {
					const categoryProducts = products.filter(p => p.category_id === cat.id);
					if (categoryProducts.length === 0) return null;

					return (
						<section 
							key={cat.id} 
							id={`section-${cat.id}`} 
							className="category-section"
						>
							<h2 className="section-title">{cat.name}</h2>
							<div className="products-grid">
								{categoryProducts.map(product => (
									<ProductCard 
										key={product.id} 
										product={product} 
										onAdd={(p) => console.log('Añadido:', p.name)} 
									/>
								))}
							</div>
						</section>
					);
				})}
			</main>

			<style jsx>{`
				.menu-page {
					padding-bottom: 80px;
				}

				        .menu-container {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: white;
        }

        .container-full {
          width: 100%;
          padding: 0 10px; /* Menos padding lateral para ganar espacio */
          max-width: none;
        }

        .menu-header {
          position: sticky;
          top: 0;
          z-index: 110;
          background: rgba(5,5,5,0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 10px 0;
        }

				.header-flex {
					display: flex;
					align-items: center;
					justify-content: space-between;
				}

				.btn-back {
					background: none;
					border: none;
					color: white;
					cursor: pointer;
					padding: 5px;
				}

				.header-title {
					text-align: center;
				}

				.header-title h2 {
					font-size: 1.2rem;
					margin: 0;
				}

				.header-title span {
					font-size: 0.75rem;
					color: var(--accent-primary);
					text-transform: uppercase;
					letter-spacing: 1px;
				}

				.header-search {
					color: var(--text-secondary);
				}

				.menu-content {
					margin-top: 10px;
				}

				.category-section {
					scroll-margin-top: 150px;
					margin-bottom: 40px;
				}

				.products-grid {
					display: grid;
					grid-template-columns: repeat(2, 1fr); /* 2 columnas en móvil por defecto */
					gap: 10px; /* Gap más pequeño para ahorrar espacio */
				}

				.no-products {
					color: var(--text-muted);
					font-style: italic;
					font-size: 0.9rem;
				}

				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}

				.animate-spin {
					animation: spin 1s linear infinite;
				}

				@media (min-width: 600px) {
					.products-grid {
						grid-template-columns: repeat(3, 1fr);
					}
				}

				@media (min-width: 1024px) {
					.products-grid {
						grid-template-columns: repeat(4, 1fr); /* 4 items por fila en tablets/desktop */
					}
				}
			`}</style>
		</div>
	);
};

export default Menu;
