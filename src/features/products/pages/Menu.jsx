import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Navbar from '../../../shared/components/Navbar';
import ProductCard from '../components/ProductCard';
import { Search, ChevronLeft, Loader2, X } from 'lucide-react';
import '../../../styles/Menu.css';
import '../../../styles/Navbar.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase/client';
import logo from '../../../assets/logo.png';

const Menu = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);



  // Referencia para bloquear el Scroll Spy durante el desplazamiento manual
  const isManualScrolling = useRef(false);

  const FIRE_ICON = "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif";

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('order', { ascending: true });

        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        setCategories(categoriesData || []);
        setProducts(productsData || []);

        const hasSpecial = (productsData || []).some(p => p.is_special);
        if (hasSpecial) setActiveCategory('special');
        else if (categoriesData?.length > 0) setActiveCategory(categoriesData[0].id);

      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper para detectar el contenedor de scroll activo dinámicamente
  const getScrollParent = () => {
    const wrapper = document.querySelector('.app-wrapper');
    if (wrapper) {
      const style = window.getComputedStyle(wrapper);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return wrapper;
      }
    }
    return window;
  };

  // Función de scroll mejorada: Usa scrollIntoView nativo + scrollMarginTop CSS
  const scrollToCategory = (id) => {
    isManualScrolling.current = true;
    setActiveCategory(id);

    const element = document.getElementById(`section-${id}`);
    if (element) {
      // scrollMarginTop en el estilo del elemento maneja el offset del header
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        isManualScrolling.current = false;
      }, 850);
    }
  };

  useEffect(() => {
    if (loading) return;

    const handleScroll = () => {
      if (isManualScrolling.current) return;

      const container = getScrollParent();
      const currentScroll = container === window ? window.scrollY : container.scrollTop;

      const headerEl = document.querySelector('.navbar-sticky');
      const headerHeight = headerEl ? headerEl.offsetHeight : 110;

      // Lista de secciones a verificar
      const sections = [];
      if (document.getElementById('section-special')) sections.push({ id: 'special', elId: 'section-special' });
      categories.forEach(c => {
        if (document.getElementById(`section-${c.id}`)) {
          sections.push({ id: c.id, elId: `section-${c.id}` });
        }
      });

      if (sections.length === 0) return;

      // SI ESTAMOS CERKA DEL TOP, SIEMPRE ES LA PRIMERA SECCIÓN
      if (currentScroll < 100) {
        if (activeCategory !== sections[0].id) setActiveCategory(sections[0].id);
        return;
      }

      let currentId = null;
      // Usamos una línea de disparo visual (un poco debajo del header)
      const trigger = headerHeight + 60;

      for (const section of sections) {
        const el = document.getElementById(section.elId);
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        // NORMALIZACIÓN ANTI-ZOOM: Al usar zoom en el body, las coordenadas del rect se escalan.
        // Las multiplicamos por DPR para volver a la escala real de la página.
        const dpr = window.devicePixelRatio || 1;
        const isZoomed = dpr > 1 && !('ontouchstart' in window); // Solo en PC
        const normalizedTop = isZoomed ? rect.top * dpr : rect.top;
        const normalizedBottom = isZoomed ? rect.bottom * dpr : rect.bottom;

        // Si el tope de la sección ya pasó la línea de disparo
        // Y el fondo de la sección aun no ha pasado la línea de disparo
        if (normalizedTop <= trigger && normalizedBottom > trigger) {
          currentId = section.id;
          break;
        }
      }

      if (currentId && currentId !== activeCategory) {
        setActiveCategory(currentId);
      }
    };

    // Listener dinámico
    const scrollContainer = getScrollParent();
    scrollContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    // También escuchamos scroll en window por si acaso cambia el modo dinámicamente
    if (scrollContainer !== window) window.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (scrollContainer !== window) window.removeEventListener('scroll', handleScroll);
    };
  }, [categories, products, loading, activeCategory]);



  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
      </div>
    );
  }

  const specialProducts = products.filter(p => p.is_special);
  const query = (searchQuery || '').trim().toLowerCase();
  const filteredBySearch = query
    ? products.filter(p => p.name?.toLowerCase().includes(query))
    : [];

  return (
    <div className="page-wrapper">
      {/* Portal del Header Fijo (Lo enviamos a la capa de UI fuera del scroll) */}
      
      {document.getElementById('navbar-portal-root') && createPortal(
        <header className="navbar-sticky">
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
              <ChevronLeft size={28} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={logo} alt="Oishi Logo" style={{ height: '38px', width: 'auto', borderRadius: '6px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'white' }}>Oishi Sushi</h2>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>Carta Digital</span>
              </div>
            </div>
            <div className="nav-search-section">
              <div
                className={`search-pill-wrapper ${searchExpanded ? 'expanded' : ''}`}
                onClick={() => {
                  if (!searchExpanded) {
                    setSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }
                }}
              >
                <Search size={20} className="search-icon-pill" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input-pill"
                  placeholder="Buscar plato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery?.trim()) setSearchExpanded(false); }}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchExpanded && (
                  <button
                    type="button"
                    className="btn-close-pill"
                    onClick={(e) => { e.stopPropagation(); setSearchExpanded(false); setSearchQuery(''); }}
                    aria-label="Cerrar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <Navbar
            categories={[
              ...(specialProducts.length > 0 ? [{
                id: 'special',
                name: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={FIRE_ICON} style={{ width: '14px', height: '14px' }} alt="🔥" />
                    Solo por hoy
                  </div>
                )
              }] : []),
              ...categories
            ]}
            activeCategory={activeCategory}
            onCategoryClick={scrollToCategory}
          />
        </header>,
        document.getElementById('navbar-portal-root')
      )}

      {/* Espaciador (Spacer) para empujar el contenido debajo del header fijo */}
      <div style={{ height: 'var(--menu-header-height)', width: '100%' }}></div>

      <main className="container">
        {/* BÚSQUEDA: resultados filtrados */}
        {query && (
          <section id="section-search" className="category-section">
            <h2 className="category-title">
              Resultados para &quot;{searchQuery.trim()}&quot;
            </h2>
            {filteredBySearch.length > 0 ? (
              <div className="product-grid">
                {filteredBySearch.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>No hay platos con ese nombre.</p>
            )}
          </section>
        )}

        {/* SECCIÓN ESPECIAL (sin búsqueda activa) */}
        {!query && specialProducts.length > 0 && (
          <section id="section-special" className="category-section">
            <h2 className="category-title">
              <img src={FIRE_ICON} className="category-icon" alt="🔥" />
              Solo por hoy
            </h2>
            <div className="product-grid">
              {specialProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* CATEGORÍAS NORMALES (sin búsqueda activa) */}
        {!query && categories.map((cat) => {
          const catProducts = products.filter(p => p.category_id === cat.id);
          if (catProducts.length === 0) return null;

          return (
            <section key={cat.id} id={`section-${cat.id}`} className="category-section">
              <h2 className="category-title">
                {cat.name}
              </h2>
              <div className="product-grid">
                {catProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default Menu;