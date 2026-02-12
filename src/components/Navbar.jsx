import React, { useRef, useEffect } from 'react';

const Navbar = ({ categories, activeCategory, onCategoryClick }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    // Centrar la categoría activa automáticamente
    if (activeCategory && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`.tab-item[data-id="${activeCategory}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  return (
    <nav className="navbar-sticky glass">
      <div className="navbar-container" ref={scrollRef}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-id={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className={`tab-item ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;