import React, { useState, useEffect } from 'react';
import { Plus, Check, ChevronDown, X } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ProductCard = React.memo(({ product }) => {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';

  // Solo habilitar expansión si el texto es largo (ej. más de 60 caracteres)
  const isLongDesc = product.description?.length > 60;

  useEffect(() => {
    let timer;
    if (isExpanded) {
      timer = setTimeout(() => setIsExpanded(false), 10000); // 10 segundos de lectura
    }
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1000);
  };

  return (
    <div 
      className={`product-card glass ${isExpanded ? 'is-viewing-info' : ''}`}
      onClick={() => isLongDesc && setIsExpanded(!isExpanded)}
    >
      <div className="product-image">
        <img src={product.image_url || FALLBACK_IMAGE} alt={product.name} />
        {product.is_special && (
          <span className="badge-special">
            <img 
              src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" 
              alt="🔥" 
              style={{ width: '18px', height: '18px' }} 
            />
            Hoy
          </span>
        )}
      </div>
      
      <div className="product-info">
        <div className="info-content-wrapper">
          {!isExpanded ? (
            <>
              <h3 className="product-name">{product.name}</h3>
              {/* Muestra todo lo que quepa en 3 líneas antes de pedir "ver más" */}
              <p className="product-desc-clamped">{product.description}</p>
            </>
          ) : (
            <div className="product-desc-scrollable animate-in-fade">
              <div className="desc-header">
                <span>Detalles</span>
                <X size={14} />
              </div>
              <div className="scroll-area">
                <p>{product.description}</p>
              </div>
            </div>
          )}
        </div>
        
        {isLongDesc && !isExpanded && (
          <div className="info-hint">
            <ChevronDown size={14} /> Ver más detalles
          </div>
        )}
        
        <div className="product-footer">
          <span className="product-price">${product.price.toLocaleString('es-CL')}</span>
          <button 
            onClick={handleAdd} 
            className={`btn-add ${isAdded ? 'added' : ''}`}
            disabled={isAdded}
          >
            {isAdded ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span>{isAdded ? 'Agregado' : 'Agregar'}</span>
          </button>
        </div>
      </div>
    </div>

  );
});

export default ProductCard;