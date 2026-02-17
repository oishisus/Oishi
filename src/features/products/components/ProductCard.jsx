import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Minus, ChevronDown, X } from 'lucide-react';
import { useCart } from '../../cart/hooks/useCart';
import '../../../styles/ProductCard.css';

// Constante fuera para no recrearla
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';

// Formateador de moneda reutilizable (más eficiente)
const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(Number(price) || 0); // Number() es más seguro que parseInt() para evitar NaN
};

const ProductCard = React.memo(({ product }) => {
  const { cart, addToCart, decreaseQuantity } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBumping, setIsBumping] = useState(false);

  // Optimización: Memoizar la búsqueda en el carrito
  const cartItem = useMemo(() => cart.find(item => item.id === product.id), [cart, product.id]);
  const quantity = cartItem ? cartItem.quantity : 0;

  const isLongDesc = product.description?.length > 60;

  // Auto-collapse (Opcional: aumentado a 15s para lectura lenta)
  useEffect(() => {
    let timer;
    if (isExpanded) {
      timer = setTimeout(() => setIsExpanded(false), 15000);
    }
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Handlers con useCallback para evitar re-creación de funciones
  const handleAdd = useCallback((e) => {
    e.stopPropagation();
    addToCart(product);
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 200);
  }, [addToCart, product]);

  const handleDecrease = useCallback((e) => {
    e.stopPropagation();
    decreaseQuantity(product.id);
  }, [decreaseQuantity, product.id]);

  const toggleExpand = useCallback(() => {
    if (isLongDesc) setIsExpanded(prev => !prev);
  }, [isLongDesc]);

  // Manejo de teclado para accesibilidad
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand();
    }
  };

  return (
    <div
      className={`product-card glass ${isExpanded ? 'is-viewing-info' : ''} ${!isLongDesc ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={toggleExpand}
      // --- ACCESIBILIDAD AÑADIDA ---
      role={isLongDesc ? "button" : "article"}
      tabIndex={isLongDesc ? 0 : -1}
      onKeyDown={isLongDesc ? handleKeyDown : undefined}
      aria-expanded={isExpanded}
      aria-label={`Ver detalles de ${product.name}`}
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
          // Evitar que la imagen rota rompa el layout visualmente
          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
        />

        {product.is_special && <span className="badge-special">ESPECIAL</span>}
        {product.has_discount && <span className="badge-discount">OFERTA</span>}

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
            <div className="product-desc-scrollable animate-in-fade" onClick={(e) => e.stopPropagation()}>
              <div className="desc-header">
                <span>Detalles</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} 
                  className="btn-icon-sm"
                  aria-label="Cerrar detalles"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="scroll-area">
                <p>{product.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Hint visual solo si es expandible */}
        {isLongDesc && !isExpanded && (
          <div className="info-hint">
            <ChevronDown size={14} /> Ver detalles
          </div>
        )}

        <div className="product-footer">
          <div className={`price-container ${product.has_discount ? 'has-discount' : ''}`}>
            {product.has_discount && product.discount_price ? (
              <>
                <span className="product-price discounted">{formatPrice(product.discount_price)}</span>
                <span className="product-price original">{formatPrice(product.price)}</span>
              </>
            ) : (
              <span className="product-price">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* SELECTOR DE CANTIDAD */}
          {quantity === 0 ? (
            <button onClick={handleAdd} className="btn-add" aria-label={`Agregar ${product.name} al carrito`}>
              <Plus size={18} />
              <span>Agregar</span>
            </button>
          ) : (
            <div className="stepper-control animate-fade" onClick={e => e.stopPropagation()}>
              <button onClick={handleDecrease} className="step-btn minus" aria-label="Disminuir cantidad">
                <Minus size={16} />
              </button>
              <span className="step-count">{quantity}</span>
              <button onClick={handleAdd} className="step-btn plus" aria-label="Aumentar cantidad">
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