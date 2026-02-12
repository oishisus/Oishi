import React, { useRef, useEffect } from 'react';

const Navbar = ({ categories, activeCategory, onCategoryClick }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    // Centrar la categoría activa en el scroll horizontal
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

      <style jsx>{`
        .navbar-sticky {
          position: sticky;
          top: 65px; /* Altura del menu-header */
          z-index: 100;
          padding: 10px 0;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--card-border);
          background: var(--bg-primary); /* Asegurar que no sea transparente al scrollear */
        }

        .navbar-container {
          display: flex;
          overflow-x: auto;
          white-space: nowrap;
          padding: 0 15px;
          gap: 10px;
          scrollbar-width: none; /* Firefox */
        }

        .navbar-container::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        .tab-item {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--card-border);
          background: transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .tab-item.active {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
          box-shadow: 0 4px 10px rgba(230, 57, 70, 0.3);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
