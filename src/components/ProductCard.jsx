import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onAdd }) => {
  return (
    <div className="product-card glass animate-fade">
      <div className="product-image">
        <img 
          src={product.image_url || 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400'} 
          alt={product.name} 
        />
        {product.is_special && <span className="badge-special">🔥 Hoy</span>}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        
        <div className="product-footer">
          <span className="product-price">${product.price ? product.price.toLocaleString('es-CL') : '0'}</span>
          <button onClick={() => onAdd(product)} className="btn-add">
            <Plus size={18} />
            <span className="btn-text">Agregar</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .product-card {
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.2s;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .product-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .badge-special {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #e63946;
          color: white;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .product-info {
          padding: 8px; /* Padding reducido */
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 2px;
        }

        .product-name {
          font-size: 0.85rem; /* Fuente más pequeña */
          font-weight: 700;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: white;
        }

        .product-desc {
          font-size: 0.7rem; /* Fuente más pequeña */
          color: var(--text-secondary);
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .product-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }

        .product-price {
          font-weight: 700;
          font-size: 0.9rem; /* Fuente más pequeña */
          color: var(--accent-secondary);
          white-space: nowrap;
        }

        .btn-add {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: var(--bg-tertiary);
          color: white;
          border: none;
          padding: 4px 8px; /* Más compacto */
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.65rem;
          transition: var(--transition-fast);
        }

        .btn-add:active {
          transform: scale(0.9);
          background: var(--accent-primary);
        }

        .btn-text {
          display: none; /* Ocultar texto "Agregar" en móvil por defecto */
        }

        @media (min-width: 768px) {
          .product-info { padding: 12px; }
          .product-name { font-size: 1rem; }
          .product-desc { font-size: 0.75rem; }
          .product-price { font-size: 1.1rem; }
          .btn-text { display: inline; }
          .btn-add { padding: 6px 12px; font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

export default ProductCard;
