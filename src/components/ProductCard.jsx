import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext'; // Asegúrate de importar esto

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500); // Resetear a los 1.5s
  };

  return (
    <div className="product-card glass animate-fade">
      <div className="product-image">
        <img 
          src={product.image_url || 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=400'} 
          alt={product.name} 
          loading="lazy" 
        />
        {product.is_special && <span className="badge-special">🔥 Hoy</span>}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        
        <div className="product-footer">
          <span className="product-price">${product.price.toLocaleString('es-CL')}</span>
          <button 
            onClick={handleAdd} 
            className={`btn-add ${isAdded ? 'added' : ''}`}
            disabled={isAdded} // Evitar doble click accidental
          >
            {isAdded ? <Check size={18} /> : <Plus size={18} />}
            <span>{isAdded ? 'Listo' : 'Agregar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;