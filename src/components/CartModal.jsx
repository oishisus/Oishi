import React from 'react';
import { X, Trash2, Plus, Minus, MessageCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CartModal = () => {
  const { 
    cart, isCartOpen, toggleCart, 
    addToCart, decreaseQuantity, removeFromCart, 
    cartTotal, getPrice, orderNote, setOrderNote, 
    generateWhatsAppMessage 
  } = useCart();

  // URL DE LA IMAGEN GENÉRICA (Misma que en ProductCard)
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    const phoneNumber = "56976645547";
    const message = generateWhatsAppMessage();
    if (message) {
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="modal-overlay" onClick={toggleCart}>
      <div className="cart-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>
        
        <header className="cart-header">
          <div className="flex-center">
            <ShoppingBag size={20} className="text-accent" />
            <h3>Tu Pedido</h3>
          </div>
          <button onClick={toggleCart} className="btn-close">
            <X size={24} />
          </button>
        </header>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🍣</span>
              <p>Tu bandeja está vacía</p>
              <span>¡Agrega unos rolls para comenzar!</span>
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button onClick={toggleCart} className="btn btn-secondary mt-20" style={{ margin: '20px auto 0 auto', display: 'block' }}>
                  Ver Menú
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="cart-items-list">
                {cart.map(item => {
                  const unitPrice = getPrice(item);
                  return (
                    <div key={item.id} className="cart-item">
                      
                      {/* --- IMAGEN CON LA MISMA LÓGICA QUE PRODUCT CARD --- */}
                      <img 
                        src={item.image_url || FALLBACK_IMAGE} 
                        alt={item.name} 
                        className="item-thumb" 
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = FALLBACK_IMAGE;
                        }}
                      />
                      {/* ------------------------------------------------ */}
                      
                      <div className="item-details">
                        <div className="item-top">
                          <h4>{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="btn-trash">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="item-bottom">
                          <span className="item-price">
                             ${(unitPrice * item.quantity).toLocaleString('es-CL')}
                          </span>
                          
                          <div className="qty-control">
                            <button onClick={() => decreaseQuantity(item.id)}>
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button onClick={() => addToCart(item)}>
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-notes">
                <label>¿Alguna instrucción especial?</label>
                <textarea 
                  placeholder="Ej: Sin sésamo, traer vuelto de 20.000..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows="2"
                />
              </div>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="cart-footer">
            <div className="total-row">
              <span>Total Estimado</span>
              <span className="total-price">${cartTotal.toLocaleString('es-CL')}</span>
            </div>
            <button onClick={handleCheckout} className="btn btn-primary btn-block" style={{width: '100%'}}>
              <MessageCircle size={20} />
              <span>Pedir por WhatsApp</span>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default CartModal;