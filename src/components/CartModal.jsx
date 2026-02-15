import React, { useState, useCallback, useMemo, useEffect } from 'react';
import '../styles/CartModal.css';
import { useNavigate } from 'react-router-dom';
import {
  X, Trash2, Plus, Minus, MessageCircle, ShoppingBag,
  CreditCard, Store, Check, Upload, FileText, ArrowLeft,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { useCart } from '../context/useCart';
import { ordersService } from '../services/orders';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';
const WHATSAPP_NUMBER = "56976645547";

const CartModal = React.memo(() => {
  const {
    cart, isCartOpen, toggleCart,
    addToCart, decreaseQuantity, removeFromCart, clearCart,
    cartTotal, getPrice, orderNote, setOrderNote
  } = useCart();

  const navigate = useNavigate();

  // --- ESTADOS DE FLUJO ---
  const [viewState, setViewState] = useState({
    showPaymentInfo: false,
    showForm: false,
    showSuccess: false,
    isSaving: false
  });

  const [paymentType, setPaymentType] = useState(null);

  // --- ESTADOS DE DATOS DEL CLIENTE ---
  const [formData, setFormData] = useState({
    name: "",
    phone: "+56 9 ",
    rut: "",
    receiptFile: null,
    receiptPreview: null
  });

  // --- LIMPIEZA DE MEMORIA (SENIOR) ---
  useEffect(() => {
    // Cleanup de la URL de previsualización para evitar fugas de memoria
    return () => {
      if (formData.receiptPreview) {
        URL.revokeObjectURL(formData.receiptPreview);
      }
    };
  }, [formData.receiptPreview]);

  // --- LÓGICA DE VALIDACIÓN (MEMOIZADA) ---
  const validation = useMemo(() => {
    const rutClean = formData.rut.replace(/[^0-9kK]/g, '');
    const phoneDigits = formData.phone.replace(/\D/g, '').length;

    return {
      rut: rutClean.length >= 8, // RUT básico válido (ej: 11111111-1)
      phone: phoneDigits >= 11, // 569 + 8 dígitos
      isReady: formData.name.trim().length > 2 && phoneDigits >= 11 && rutClean.length >= 8
    };
  }, [formData.rut, formData.phone, formData.name]);

  // --- MANEJADORES DE INPUT ---
  const formatRut = useCallback((value) => {
    let clean = value.replace(/[^0-9kK]/g, '');
    if (clean.length <= 1) return clean;

    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    let formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedBody}-${dv}`;
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      if (field === 'rut') value = formatRut(value);
      if (field === 'phone' && !value.startsWith("+56 9")) value = "+56 9 ";

      return { ...prev, [field]: value };
    });
  }, [formatRut]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (formData.receiptPreview) URL.revokeObjectURL(formData.receiptPreview);
      setFormData(prev => ({
        ...prev,
        receiptFile: file,
        receiptPreview: URL.createObjectURL(file)
      }));
    }
  }, [formData.receiptPreview]);

  const resetFlow = useCallback(() => {
    setViewState({
      showPaymentInfo: false,
      showForm: false,
      showSuccess: false,
      isSaving: false
    });
    setPaymentType(null);
    setFormData({
      name: "",
      phone: "+56 9 ",
      rut: "",
      receiptFile: null,
      receiptPreview: null
    });
  }, []);

  // --- LÓGICA DE ENVÍO (SENIOR SERVICE) ---
  const handleSendOrder = async (e) => {
    e.preventDefault();
    if (viewState.isSaving) return;

    if (!validation.phone) {
      alert("Por favor completa un número de teléfono válido.");
      return;
    }

    setViewState(v => ({ ...v, isSaving: true }));

    try {
      const orderPayload = {
        client_name: formData.name,
        client_phone: formData.phone,
        client_rut: formData.rut,
        payment_type: paymentType,
        total: cartTotal,
        items: cart,
        note: orderNote,
        status: 'pending'
      };

      // Llamada al servicio senior
      await ordersService.createOrder(orderPayload, formData.receiptFile);

      // UI Success
      setViewState(v => ({ ...v, showForm: false, showSuccess: true, isSaving: false }));

      // Generación de Mensaje de WhatsApp
      setTimeout(() => {
        const message = generateWSMessage(formData, cart, cartTotal, paymentType, orderNote);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');

        clearCart();
        // toggleCart(); // Comentado por petición previa del usuario
      }, 4000);

    } catch (error) {
      console.error('Checkout error:', error);
      alert("Lo sentimos, hubo un problema al procesar tu pedido: " + (error.message || 'Error de red'));
      setViewState(v => ({ ...v, isSaving: false }));
    }
  };

  // Helper para el estilo de los inputs
  const getInputStyle = useCallback((isValid) => {
    if (isValid === true) return { borderColor: '#25d366', boxShadow: '0 0 0 1px #25d366' };
    if (isValid === false) return { borderColor: '#ff4444', boxShadow: '0 0 0 1px #ff4444' };
    return {};
  }, []);

  const handleCloseCart = useCallback(() => {
    if (viewState.showSuccess) {
      toggleCart();
      return;
    }
    resetFlow();
    toggleCart();
  }, [viewState.showSuccess, toggleCart, resetFlow]);

  if (!isCartOpen) return null;

  return (
    <div className="modal-overlay cart-overlay" onClick={handleCloseCart}>
      <div className="cart-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>

        {viewState.showSuccess ? (
          <SuccessView onNewOrder={resetFlow} onGoHome={() => { resetFlow(); navigate('/'); }} />
        ) : (
          <>
            <header className="cart-header">
              <div className="flex-center">
                <ShoppingBag size={22} className="text-accent" />
                <h3>Tu Pedido</h3>
                <span className="cart-count-badge">{cart.reduce((a, c) => a + c.quantity, 0)}</span>
              </div>
              <button onClick={handleCloseCart} className="btn-close-cart"><X size={24} /></button>
            </header>

            <div className="cart-body">
              {cart.length === 0 ? (
                <EmptyState onMenu={handleCloseCart} />
              ) : (
                <>
                  <div className="cart-items-list">
                    {cart.map(item => (
                      <CartItem
                        key={item.id}
                        item={item}
                        unitPrice={getPrice(item)}
                        onRemove={removeFromCart}
                        onAdd={addToCart}
                        onDecrease={decreaseQuantity}
                      />
                    ))}
                  </div>
                  <div className="cart-notes">
                    <label>Notas de cocina</label>
                    <textarea
                      className="form-input"
                      placeholder="Ej: Sin sésamo..."
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
                {!viewState.showPaymentInfo && (
                  <div className="total-row"><span>Total</span><span className="total-price">${cartTotal.toLocaleString('es-CL')}</span></div>
                )}

                {viewState.showPaymentInfo ? (
                  <PaymentFlow
                    paymentType={paymentType}
                    setPaymentType={setPaymentType}
                    showForm={viewState.showForm}
                    setShowForm={(val) => setViewState(v => ({ ...v, showForm: val }))}
                    formData={formData}
                    onInputChange={handleInputChange}
                    onFileChange={handleFileChange}
                    onSubmit={handleSendOrder}
                    isSaving={viewState.isSaving}
                    validation={validation}
                    getInputStyle={getInputStyle}
                    cartTotal={cartTotal}
                    onBack={() => setViewState(v => ({ ...v, showPaymentInfo: false }))}
                    resetFlow={resetFlow}
                  />
                ) : (
                  <button onClick={() => setViewState(v => ({ ...v, showPaymentInfo: true }))} className="btn btn-primary btn-block btn-lg">Ir a Pagar</button>
                )}
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// --- SUB-COMPONENTES PARA LIMPIEZA ---

const SuccessView = ({ onNewOrder, onGoHome }) => (
  <div className="cart-success-view">
    <div className="success-icon-circle"><Check size={40} /></div>
    <h2 className="text-gradient">¡Pedido Recibido!</h2>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
      Estamos validando tu pago. Te contactaremos por WhatsApp.
    </p>

    <div className="order-summary-card animate-fade">
      <div className="summary-label">Lugar de Retiro</div>
      <div className="summary-value" style={{ marginBottom: 4 }}>Castelar Nte. 141</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        8940000 San Joaquín<br />Región Metropolitana, Chile
      </div>
    </div>

    <div className="success-actions">
      <button className="btn btn-primary btn-block" onClick={onNewOrder}>Nuevo Pedido</button>
      <button className="btn btn-secondary btn-block" onClick={onGoHome}>Volver al Menú</button>
    </div>
  </div>
);

const EmptyState = ({ onMenu }) => (
  <div className="empty-state">
    <span className="empty-emoji">🍣</span>
    <h3>Bandeja Vacía</h3>
    <button onClick={onMenu} className="btn btn-secondary mt-20">Ir al Menú</button>
  </div>
);

const CartItem = ({ item, unitPrice, onRemove, onAdd, onDecrease }) => (
  <div className="cart-item">
    <img
      src={item.image_url || FALLBACK_IMAGE}
      alt={item.name}
      className="item-thumb"
      onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
    />
    <div className="item-details">
      <div className="item-top">
        <h4>{item.name}</h4>
        <button onClick={() => onRemove(item.id)} className="btn-trash"><Trash2 size={16} /></button>
      </div>
      <div className="item-bottom">
        <span className="item-price">${(unitPrice * item.quantity).toLocaleString('es-CL')}</span>
        <div className="qty-control-sm">
          <button onClick={() => onDecrease(item.id)}><Minus size={12} /></button>
          <span>{item.quantity}</span>
          <button onClick={() => onAdd(item)}><Plus size={12} /></button>
        </div>
      </div>
    </div>
  </div>
);

const PaymentFlow = ({
  paymentType, setPaymentType, showForm, setShowForm,
  formData, onInputChange, onFileChange, onSubmit,
  isSaving, validation, getInputStyle, cartTotal, onBack, resetFlow
}) => {
  if (paymentType && showForm) {
    return (
      <form onSubmit={onSubmit} className="checkout-form animate-fade">
        <h4 className="form-title"><MessageCircle size={18} /> Datos del Cliente</h4>

        <div className="form-group">
          <label>Nombre Completo</label>
          <input
            type="text" required
            value={formData.name}
            onChange={e => onInputChange('name', e.target.value)}
            className="form-input" placeholder="Tu nombre"
          />
        </div>

        <div className="form-group">
          <div className="flex-between">
            <label>RUT</label>
            {validation.rut && <CheckCircle2 size={16} color="#25d366" />}
          </div>
          <input
            type="text" required
            value={formData.rut}
            onChange={e => onInputChange('rut', e.target.value)}
            className="form-input"
            placeholder="12.345.678-9"
            maxLength={12}
            style={getInputStyle(formData.rut.length > 5 ? validation.rut : null)}
          />
        </div>

        <div className="form-group">
          <div className="flex-between">
            <label>Teléfono</label>
            {validation.phone && <CheckCircle2 size={16} color="#25d366" />}
          </div>
          <input
            type="tel" required
            value={formData.phone}
            onChange={e => onInputChange('phone', e.target.value)}
            className="form-input"
            placeholder="+56 9..."
            style={getInputStyle(formData.phone.length > 6 ? validation.phone : null)}
          />
        </div>

        {paymentType === 'online' && (
          <div className="form-group">
            <label>Comprobante de Transferencia</label>
            <div
              className="upload-box"
              onClick={() => document.getElementById('receipt-upload').click()}
              style={{ borderColor: formData.receiptPreview ? '#25d366' : 'var(--card-border)' }}
            >
              <input type="file" id="receipt-upload" accept="image/*" hidden onChange={onFileChange} />
              {formData.receiptPreview ? (
                <div className="file-preview-container flex-center gap-15">
                  <img src={formData.receiptPreview} alt="Comprobante" className="receipt-thumb-mini" />
                  <div className="text-left">
                    <span className="file-status-label">Imagen Cargada</span>
                    <span className="file-status-sub">Click para cambiar</span>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <Upload size={24} />
                  <span>Subir captura</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="form-actions-col">
          <button type="submit" disabled={isSaving || !validation.phone} className="btn btn-primary btn-block">
            {isSaving ? 'Enviando...' : 'Confirmar Pedido'}
          </button>
          <button type="button" className="btn btn-text btn-block" onClick={() => setShowForm(false)}>
            <ArrowLeft size={16} className="mr-5" /> Volver atrás
          </button>
        </div>
      </form>
    );
  }

  if (paymentType) {
    return (
      <div className="payment-details animate-fade">
        {paymentType === 'online' ? (
          <div className="bank-info glass">
            <h4>Datos para Transferir</h4>
            <ul>
              <li><span>Banco:</span> <b>Tenpo (Prepago)</b></li>
              <li><span>Cuenta:</span> <b>111126281473</b></li>
              <li><span>RUT:</span> <b>26.281.473-4</b></li>
              <li><span>Email:</span> <b>doranteegrimar@gmail.com</b></li>
            </ul>
            <div className="pay-total">Total: ${cartTotal.toLocaleString('es-CL')}</div>
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-block mt-4">Ya pagué, subir comprobante</button>
          </div>
        ) : (
          <div className="store-pay-info glass">
            <Store size={32} className="text-accent" />
            <h4>Pagar en Local</h4><p>Pagas en efectivo o tarjeta al retirar.</p>
            <div className="pay-total">Total: ${cartTotal.toLocaleString('es-CL')}</div>
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-block mt-4">Continuar</button>
          </div>
        )}
        <button onClick={() => setPaymentType(null)} className="btn btn-text btn-block mt-2">
          <ArrowLeft size={16} className="mr-5" /> Elegir otro método
        </button>
      </div>
    );
  }

  return (
    <div className="payment-options animate-fade">
      <h4 className="text-center mb-15 text-white">Método de Pago</h4>
      <button className="btn btn-secondary btn-block payment-opt" onClick={() => setPaymentType('online')}><CreditCard size={20} /> Transferencia</button>
      <button className="btn btn-secondary btn-block payment-opt" onClick={() => setPaymentType('tienda')}><Store size={20} /> Pagar en Local</button>
      <button onClick={onBack} className="btn btn-text btn-block">Cancelar</button>
    </div>
  );
};

// --- HELPERS DE TEXTO ---

const generateWSMessage = (formData, cart, total, paymentType, note) => {
  let msg = '*NUEVO PEDIDO WEB - OISHI*\n';
  msg += '================================\n\n';
  msg += `Cliente: ${formData.name}\n`;
  msg += `RUT: ${formData.rut}\n`;
  msg += `Fono: ${formData.phone}\n\n`;
  msg += 'DETALLE:\n';
  cart.forEach(item => {
    msg += `+ ${item.quantity} x ${item.name.toUpperCase()}\n`;
  });
  msg += `\n*TOTAL: $${total.toLocaleString('es-CL')}*\n`;
  msg += `Pago: ${paymentType === 'online' ? 'Transferencia (Comprobante Adjunto)' : 'En Local'}\n`;
  if (note.trim()) msg += `\nNota: ${note}\n`;
  return msg;
};

export default CartModal;
