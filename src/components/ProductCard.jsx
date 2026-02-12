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
          <span className="product-price">${product.price.toLocaleString('es-CL')}</span>
          <button onClick={() => onAdd(product)} className="btn-add">
            <Plus size={20} />
            <span>Agregar</span>
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
        }

        .product-image {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .badge-special {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #e63946;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .product-info {
          padding: 15px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .product-name {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .product-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 15px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .product-price {
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--accent-secondary);
        }

        .btn-add {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--bg-tertiary);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: var(--transition-fast);
        }

        .btn-add:active {
          transform: scale(0.9);
          background: var(--accent-primary);
        }
      `}</style>
    </div>
  );
};

export default ProductCard;
