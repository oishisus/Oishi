import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Minus, ChevronDown, X } from 'lucide-react';
import { useCart } from '../../cart/hooks/useCart';
import '../../../styles/ProductCard.css';
import '../../../styles/Modals.css';

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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBumping, setIsBumping] = useState(false);

  // Optimización: Memoizar la búsqueda en el carrito
  const cartItem = useMemo(() => cart.find(item => item.id === product.id), [cart, product.id]);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Handlers con useCallback para evitar re-creación de funciones
  const handleAdd = useCallback((e) => {
    e?.stopPropagation?.();
    addToCart(product);
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 200);
  }, [addToCart, product]);

  const handleDecrease = useCallback((e) => {
    e?.stopPropagation?.();
    decreaseQuantity(product.id);
  }, [decreaseQuantity, product.id]);

  const openDetailsModal = useCallback((e) => {
    e.stopPropagation();
    setIsDetailsModalOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => setIsDetailsModalOpen(false), []);

  /** Agregar al carrito desde el modal y cerrar el modal en el siguiente tick (evita removeChild del portal). */
  const handleAddFromModal = useCallback((e) => {
    e?.stopPropagation?.();
    addToCart(product);
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 200);
    setTimeout(() => closeDetailsModal(), 0);
  }, [addToCart, product, closeDetailsModal]);

  useEffect(() => {
    if (!isDetailsModalOpen) return;
    const onEscape = (e) => { if (e.key === 'Escape') closeDetailsModal(); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isDetailsModalOpen, closeDetailsModal]);

  return (
    <div
      className="product-card glass"
      role="article"
      aria-label={`Producto: ${product.name}`}
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
          <h3 className="product-name">{product.name}</h3>
          <p className="product-desc-clamped">{product.description}</p>
        </div>

        <button
          type="button"
          className="info-hint btn-ver-detalles"
          onClick={openDetailsModal}
          aria-label={`Ver detalles de ${product.name}`}
        >
          <ChevronDown size={14} /> Ver detalles
        </button>

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

      {isDetailsModalOpen && (
        <div
          className="modal-overlay product-details-modal-overlay"
          onClick={closeDetailsModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-details-title"
        >
          <div
            className="modal-content product-details-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h3 id="product-details-title">Detalles del producto</h3>
              <button
                type="button"
                className="btn-close"
                onClick={closeDetailsModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </header>
            <div className="modal-body product-details-modal-body">
              <div className="product-details-grid">
                <div className="product-details-image-wrap">
                  <img
                    src={product.image_url || FALLBACK_IMAGE}
                    alt={product.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
                  />
                  <div className="product-details-badges">
                    {product.is_special && <span className="badge-special">ESPECIAL</span>}
                    {product.has_discount && <span className="badge-discount">OFERTA</span>}
                  </div>
                </div>
                <div className="product-details-info">
                  <h3 className="product-details-name">{product.name}</h3>
                  {product.description && (
                    <p className="product-details-desc">{product.description}</p>
                  )}
                  <div className={`price-container product-details-price ${product.has_discount ? 'has-discount' : ''}`}>
                    {product.has_discount && product.discount_price ? (
                      <>
                        <span className="product-price discounted">{formatPrice(product.discount_price)}</span>
                        <span className="product-price original">{formatPrice(product.price)}</span>
                      </>
                    ) : (
                      <span className="product-price">{formatPrice(product.price)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <footer className="modal-footer product-details-modal-footer">
              {quantity === 0 ? (
                <button
                  type="button"
                  onClick={handleAddFromModal}
                  className="btn-add btn-add-modal"
                  aria-label={`Agregar ${product.name} al carrito`}
                >
                  <Plus size={18} />
                  <span>Agregar al carrito</span>
                </button>
              ) : (
                <div className="stepper-control" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={handleDecrease} className="step-btn minus" aria-label="Disminuir cantidad">
                    <Minus size={16} />
                  </button>
                  <span className="step-count">{quantity}</span>
                  <button type="button" onClick={handleAddFromModal} className="step-btn plus" aria-label="Aumentar cantidad">
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProductCard;