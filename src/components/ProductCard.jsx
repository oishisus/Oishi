import React, { useState, useEffect } from 'react';
import { Plus, Minus, ChevronDown, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ProductCard = React.memo(({ product }) => {
  const { cart, addToCart, decreaseQuantity } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBumping, setIsBumping] = useState(false); // Para la animación

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';

  // Buscar cantidad actual en el carrito
  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Solo habilitar expansión si el texto es largo (> 60 caracteres)
  const isLongDesc = product.description?.length > 60;

  useEffect(() => {
    let timer;
    if (isExpanded) {
      timer = setTimeout(() => setIsExpanded(false), 10000); // 10s lectura
    }
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Animación de rebote al agregar
  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product);
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 200);
  };

  const handleDecrease = (e) => {
    e.stopPropagation();
    decreaseQuantity(product.id);
  };

  return (
    <div 
      className={`product-card glass ${isExpanded ? 'is-viewing-info' : ''}`}
      onClick={() => isLongDesc && setIsExpanded(!isExpanded)}
    >
      {/* IMAGEN CON SKELETON */}
      <div className={`product-image ${isBumping ? 'bump-active' : ''}`}>
        {!imageLoaded && <div className="skeleton-loader absolute inset-0" />}
        <img 
          src={product.image_url || FALLBACK_IMAGE} 
          alt={product.name} 
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={!imageLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}
        />
        
        {product.is_special && (
          <span className="badge-special">
            ESPECIAL
          </span>
        )}
        
        {/* Badge de cantidad sobre la imagen si hay > 0 */}
        {quantity > 0 && (
          <div className="qty-badge-overlay animate-bounce-in">
            {quantity}
          </div>
        )}
      </div>
      
      <div className="product-info">
        <div className="info-content-wrapper">
          {!isExpanded ? (
            <>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-desc-clamped">{product.description}</p>
            </>
          ) : (
            <div className="product-desc-scrollable animate-in-fade">
              <div className="desc-header">
                <span>Detalles</span>
                <button onClick={(e) => {e.stopPropagation(); setIsExpanded(false)}} className="btn-icon-sm">
                  <X size={14} />
                </button>
              </div>
              <div className="scroll-area">
                <p>{product.description}</p>
              </div>
            </div>
          )}
        </div>
        
        {isLongDesc && !isExpanded && (
          <div className="info-hint">
            <ChevronDown size={14} /> Ver detalles
          </div>
        )}
        
        <div className="product-footer">
          <span className="product-price">${product.price.toLocaleString('es-CL')}</span>
          
          {/* SELECTOR DE CANTIDAD INTELIGENTE */}
          {quantity === 0 ? (
            <button onClick={handleAdd} className="btn-add">
              <Plus size={18} />
              <span>Agregar</span>
            </button>
          ) : (
            <div className="stepper-control animate-fade">
              <button onClick={handleDecrease} className="step-btn minus">
                <Minus size={16} />
              </button>
              <span className="step-count">{quantity}</span>
              <button onClick={handleAdd} className="step-btn plus">
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;