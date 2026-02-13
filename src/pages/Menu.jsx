import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import FloatingWhatsApp from '../components/CartFloat';
import CartModal from '../components/CartModal';
import { Search, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png'; 

const Menu = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  
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

  // Función de scroll mejorada para evitar conflictos con el detector
  const scrollToCategory = (id) => {
    isManualScrolling.current = true; // Bloqueo temporal
    setActiveCategory(id);

    const element = document.getElementById(`section-${id}`);
    if (element) {
      const headerOffset = 160; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

      // Liberar el detector después de que termine la animación de scroll
      setTimeout(() => {
        isManualScrolling.current = false;
      }, 850);
    }
  };

  useEffect(() => {
    if (loading) return;

    const handleScroll = () => {
      // Si el usuario hizo clic en la nav, ignoramos el detector automático
      if (isManualScrolling.current) return;

      const scrollPosition = window.scrollY + 220;
      const specialSection = document.getElementById('section-special');
      
      if (specialSection) {
        const top = specialSection.offsetTop;
        const height = specialSection.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveCategory('special');
          return; 
        }
      }

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
  }, [categories, products, loading]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
      </div>
    );
  }

  const specialProducts = products.filter(p => p.is_special);

  return (
    <div className="page-wrapper">
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
          {/* Espaciador para mantener layout donde estaba el buscador */}
          <div style={{ width: 24, height: 24 }}></div>
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
      </header>

      <main className="container">
        {/* SECCIÓN ESPECIAL (PREMIUM CON FUEGO) */}
        {specialProducts.length > 0 && (
          <section id="section-special" className="category-section" style={{ scrollMarginTop: '160px' }}>
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

        {/* CATEGORÍAS NORMALES (DISEÑO LIMPIO) */}
        {categories.map((cat) => {
          const catProducts = products.filter(p => p.category_id === cat.id);
          if (catProducts.length === 0) return null;

          return (
            <section key={cat.id} id={`section-${cat.id}`} className="category-section" style={{ scrollMarginTop: '160px' }}>
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

      <CartModal />
      <FloatingWhatsApp />
    </div>
  );
};

export default Menu;