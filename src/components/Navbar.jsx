import React, { useRef, useEffect, useState } from 'react';

const Navbar = ({ categories, activeCategory, onCategoryClick }) => {
  const scrollRef = useRef(null);
  const [isManualClick, setIsManualClick] = useState(false);

  // 1. AUTO-CENTRADO: Cuando cambia la categoría activa, centrar el botón
  useEffect(() => {
    if (activeCategory && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`.tab-item[data-id="${activeCategory}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      }
    }
  }, [activeCategory]);

  // 2. SCROLL SPY (Detector): Detectar qué sección se está viendo
  useEffect(() => {
    const handleScroll = () => {
      // Si el usuario acaba de hacer clic, no detectamos scroll por 1 seg para evitar saltos
      if (isManualClick) return;

      const scrollPosition = window.scrollY + 150; // Offset para detectar un poco antes

      // Buscamos qué categoría está actualmente en esa posición
      for (const cat of categories) {
        const element = document.getElementById(cat.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            if (activeCategory !== cat.id) {
              // Llamamos a la función pero marcando que es automático
              onCategoryClick(cat.id, false); 
            }
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory, isManualClick, onCategoryClick]);

  const handleClick = (id) => {
    setIsManualClick(true); // Bloqueamos el detector temporalmente
    onCategoryClick(id, true); // True = Es un clic manual (para hacer scroll)
    
    // Desbloqueamos el detector después de la animación de scroll (aprox 1s)
    setTimeout(() => setIsManualClick(false), 1000);
  };

  return (
    <div className="navbar-wrapper">
      {/* Máscaras de degradado para indicar scroll */}
      <div className="nav-fade-left"></div>
      
      <nav className="navbar-container" ref={scrollRef}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-id={cat.id}
            onClick={() => handleClick(cat.id)}
            className={`tab-item ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {/* Si tienes iconos en la base de datos, podrías usarlos aquí */}
            {/* <img src={cat.icon} alt="" /> */}
            {cat.name}
          </button>
        ))}
      </nav>
      
      <div className="nav-fade-right"></div>
    </div>
  );
};

export default Navbar;