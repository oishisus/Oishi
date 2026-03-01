import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Trash2, Plus, Minus, MessageCircle, ShoppingBag,
  CreditCard, Store, Check, Upload, ArrowLeft,
  CheckCircle2, Copy, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { ordersService } from '../../orders/services/orders';
import { useBusiness } from '../../../context/useBusiness';
import { useLocation } from '../../../context/useLocation';
import { useCash } from '../../../context/useCash';
import { formatRut, validateRut } from '../../../shared/utils/formatters';
import { validateImageFile } from '../../../shared/utils/cloudinary';

import '../../../styles/CartModal.css';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';
const WHATSAPP_NUMBER = "56976645547";

const generateWSMessage = (formData, cart, total, paymentType, note, businessName) => {
  let msg = `*NUEVO PEDIDO WEB - ${businessName || 'RESTAURANTE'}*\n`;
  msg += '================================\n\n';
  msg += `Cliente: ${formData.name}\n`;
  msg += `RUT: ${formData.rut}\n`;
  msg += `Fono: ${formData.phone}\n\n`;
  msg += 'DETALLE:\n';
  cart.forEach(item => {
    msg += `+ ${item.quantity} x ${(item.name ?? '').toUpperCase()}\n`;
    if (item.description) {
      msg += `   (Hacer: ${item.description})\n`;
    }
  });
  msg += `\n*TOTAL: $${total.toLocaleString('es-CL')}*\n`;
  msg += `Pago: ${paymentType === 'online' ? 'Transferencia (Comprobante Adjunto)' : 'En Local'}\n`;
  if (note && note.trim()) msg += `\nNota: ${note}\n`;
  return msg;
};

// --- COMPONENTE PRINCIPAL ---
const CartModal = React.memo(() => {
  const navigate = useNavigate();
  const { businessInfo } = useBusiness();
  const { selectedBranch } = useLocation();
  const { isShiftActiveForBranch, isShiftLoading } = useCash();
  const canCheckout = isShiftActiveForBranch(selectedBranch?.id);

  const {
    cart, isCartOpen, toggleCart,
    addToCart, decreaseQuantity, removeFromCart, clearCart,
    cartTotal, getPrice, orderNote, setOrderNote
  } = useCart();

  // Estados de Flujo
  const [viewState, setViewState] = useState({
    showPaymentInfo: false,
    showForm: false,
    showSuccess: false,
    isSaving: false,
    error: null,
    receiptUploadFailed: false
  });
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const [paymentType, setPaymentType] = useState(null);
  
  const currentBranch = selectedBranch;

  // [NUEVO] Lógica de Cascada: Sucursal > Global
  // Determina qué datos mostrar (banco, dirección, teléfono) según el contexto
  const activeInfo = useMemo(() => {
    if (!selectedBranch) return businessInfo;
    return {
      ...businessInfo, // Base global
      ...selectedBranch, // Sobrescribe con datos de sucursal si existen
      // Asegurar fallbacks específicos para campos críticos si vienen vacíos en la sucursal
      name: selectedBranch.name || businessInfo.name,
      address: selectedBranch.address || businessInfo.address,
      phone: selectedBranch.phone || businessInfo.phone,
      bank_name: selectedBranch.bank_name || businessInfo.bank_name,
      account_type: selectedBranch.account_type || businessInfo.account_type,
      account_number: selectedBranch.account_number || businessInfo.account_number,
      account_rut: selectedBranch.account_rut || businessInfo.account_rut,
      account_email: selectedBranch.account_email || businessInfo.account_email,
      account_holder: selectedBranch.account_holder || businessInfo.account_holder,
    };
  }, [businessInfo, selectedBranch]);

  // Datos del Cliente
  const [formData, setFormData] = useState({
    name: "",
    phone: "+56 9 ",
    rut: "",
    receiptFile: null,
    receiptPreview: null
  });

  // Limpieza de memoria
  useEffect(() => {
    return () => {
      if (formData.receiptPreview) URL.revokeObjectURL(formData.receiptPreview);
    };
  }, [formData.receiptPreview]);

  // Validación Memoizada
  const validation = useMemo(() => {
    const phoneDigits = formData.phone.replace(/\D/g, '').length;
    const isRutValid = validateRut(formData.rut);
    const nameValue = formData.name.trim();
    const namePattern = /^[\p{L} .'-]+$/u;
    const isNameValid = nameValue.length > 2 && namePattern.test(nameValue);
    // Comprobante requerido solo si es online
    const isReceiptValid = paymentType === 'online' ? !!formData.receiptFile : true;

    return {
      rut: isRutValid,
      phone: phoneDigits >= 11,
      name: isNameValid,
      receipt: isReceiptValid,
      isReady: isNameValid && phoneDigits >= 11 && isRutValid && isReceiptValid
    };
  }, [formData, paymentType]);

  // Handlers
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      let finalValue = value;
      if (field === 'rut') finalValue = formatRut(value);
      if (field === 'phone') {
        if (!value.startsWith("+56 9")) {
           if (value.length < 6) return { ...prev, [field]: "+56 9 " };
        }
        finalValue = value;
      }
      return { ...prev, [field]: finalValue };
    });
    setViewState(prev => ({ ...prev, error: null }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (formData.receiptPreview) URL.revokeObjectURL(formData.receiptPreview);
      const { valid, error: validationError } = validateImageFile(file);
      if (!valid) {
        setViewState(prev => ({ ...prev, error: validationError || "Archivo no válido." }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        receiptFile: file,
        receiptPreview: URL.createObjectURL(file)
      }));
      setViewState(prev => ({ ...prev, error: null }));
    }
  }, [formData.receiptPreview]);

  const resetFlow = useCallback(() => {
    setViewState({ showPaymentInfo: false, showForm: false, showSuccess: false, isSaving: false, error: null, receiptUploadFailed: false });
    setPaymentType(null);
    setFormData({ name: "", phone: "+56 9 ", rut: "", receiptFile: null, receiptPreview: null });
    setShowFieldErrors(false);
  }, []);

  const handleCloseCart = useCallback(() => {
    if (viewState.showSuccess) {
      toggleCart();
      return;
    }
    toggleCart();
    setTimeout(resetFlow, 300);
  }, [viewState.showSuccess, toggleCart, resetFlow]);

  // PROCESO DE COMPRA
  const handleSendOrder = async (e) => {
    e.preventDefault();

    if (!canCheckout) {
      const msg = selectedBranch
        ? `Esta sucursal (${selectedBranch.name}) no está recibiendo pedidos. Abre la caja en el admin para habilitar compras.`
        : (businessInfo.schedule ? `Nuestro horario es: ${businessInfo.schedule}` : 'No se pueden recibir pedidos en este momento.');
      setViewState(v => ({ ...v, isSaving: false, error: msg }));
      return;
    }

    if (viewState.isSaving) return;

    if (!validation.isReady) {
      setShowFieldErrors(true);
      setViewState(prev => ({ ...prev, error: "Por favor completa todos los campos correctamente." }));
      return;
    }

    if (!currentBranch?.id) {
      setViewState(prev => ({ ...prev, error: "No hay sucursal seleccionada. Elige una sucursal para enviar el pedido." }));
      return;
    }

    setViewState(v => ({ ...v, isSaving: true, error: null }));

    try {
      const sanitizeInput = (text) => text ? text.replace(/<[^>]*>?/gm, "").trim() : "";

      // Items solo con campos serializables para JSONB (evitar undefined o tipos raros)
      const itemsForOrder = cart.map((item) => ({
        id: item.id,
        name: String(item.name ?? ''),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        has_discount: Boolean(item.has_discount),
        discount_price: item.has_discount && item.discount_price != null ? Number(item.discount_price) : null,
        description: item.description ? String(item.description) : null
      }));

      const orderPayload = {
        client_name: sanitizeInput(formData.name),
        client_phone: String(formData.phone ?? '').trim(),
        client_rut: String(formData.rut ?? '').trim(),
        payment_type: paymentType,
        total: Number(cartTotal) || 0,
        items: itemsForOrder,
        note: sanitizeInput(orderNote),
        status: 'pending',
        receiptFile: formData.receiptFile,
        branch_id: currentBranch.id,
        branch_name: currentBranch?.name || 'Desconocido',
        company_id: currentBranch?.company_id || null
      };

      const { receiptUploadFailed } = await ordersService.createOrder(orderPayload, formData.receiptFile);

      setViewState(v => ({ ...v, showSuccess: true, isSaving: false, receiptUploadFailed: receiptUploadFailed ?? false }));
      setShowFieldErrors(false);

      setTimeout(() => {
        const message = generateWSMessage(formData, cart, cartTotal, paymentType, orderNote, activeInfo.name);
        
        // Usar teléfono de la sucursal activa (o global si no hay)
        let targetPhone = "56976645547"; // Default
        if (activeInfo.phone) {
            targetPhone = activeInfo.phone.replace(/\D/g, '');
        }

        window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');
        clearCart();
      }, 1500);

    } catch (error) {
      const message = error?.message || error?.error_description || "Error al procesar el pedido. Intenta nuevamente.";
      setViewState(v => ({ ...v, isSaving: false, error: message }));
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="modal-overlay cart-overlay" onClick={handleCloseCart}>
      <div className="cart-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>
        
        {viewState.showSuccess ? (
          <SuccessView
            onNewOrder={resetFlow}
            onGoHome={() => { resetFlow(); navigate('/'); }}
            receiptUploadFailed={viewState.receiptUploadFailed}
            branch={currentBranch}
            activeInfo={activeInfo}
          />
        ) : (
          <>
            <header className="cart-header">
              <div className="flex-center">
                <ShoppingBag size={22} className="text-accent" />
                <h3>Tu Pedido {currentBranch && <span style={{ fontSize: '0.7em', opacity: 0.7 }}>({currentBranch.name})</span>}</h3>
                <span className="cart-count-badge">{cart.reduce((a, c) => a + c.quantity, 0)}</span>
              </div>
              <button onClick={handleCloseCart} className="btn-close-cart"><X size={24} /></button>
            </header>

            {/* ERROR GLOBAL */}
            {viewState.error && (
              <div className="cart-error-banner animate-fade">
                <AlertCircle size={16} /> {viewState.error}
              </div>
            )}

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

            {/* FOOTER: AQUÍ OCURRE EL FLUJO DE PAGO (COMO EN TU ORIGINAL) */}
            {cart.length > 0 && (
              <footer className="cart-footer">
                {!viewState.showPaymentInfo ? (
                  <>
                    <div className="total-row"><span>Total</span><span className="total-price">${cartTotal.toLocaleString('es-CL')}</span></div>
                    
                    {isShiftLoading ? (
                      <button className="btn btn-primary btn-block btn-lg" disabled>Cargando...</button>
                    ) : canCheckout ? (
                      <button onClick={() => setViewState(v => ({ ...v, showPaymentInfo: true }))} className="btn btn-primary btn-block btn-lg">
                        Ir a Pagar
                      </button>
                    ) : (
                      <div className="cash-closed-banner">
                        <AlertCircle size={16} />
                        <span>
                          {selectedBranch
                            ? `Esta sucursal no está recibiendo pedidos. Abre la caja en ${selectedBranch.name} para habilitar compras.`
                            : `Caja cerrada.${businessInfo.schedule ? ` Horario: ${businessInfo.schedule}` : ''}`}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
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
                    showFieldErrors={showFieldErrors}
                    cartTotal={cartTotal}
                    onBack={() => setViewState(v => ({ ...v, showPaymentInfo: false }))}
                    activeInfo={activeInfo}
                  />
                )}
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// --- COMPONENTES AUXILIARES (REFACTORIZADOS) ---

// Flujo de Pago Integrado en Footer
const PaymentFlow = ({
  paymentType, setPaymentType, showForm, setShowForm,
  formData, onInputChange, onFileChange, onSubmit,
  isSaving, validation, showFieldErrors, cartTotal, onBack, activeInfo
}) => {

  const phoneDigits = (formData.phone || '').replace(/\D/g, '').length;
  const showNameError = showFieldErrors && !validation.name;
  const showRutError = showFieldErrors && !validation.rut;
  const showPhoneError = showFieldErrors && !validation.phone;
  const showReceiptError = showFieldErrors && paymentType === 'online' && !validation.receipt;
  
  // 1. VISTA DE FORMULARIO DE DATOS
  if (paymentType && showForm) {
    return (
      <form onSubmit={onSubmit} className="checkout-form animate-fade">
        <h4 className="form-title"><MessageCircle size={18} /> Datos del Cliente</h4>

        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text" required
            value={formData.name}
            onChange={e => onInputChange('name', e.target.value)}
            className="form-input" placeholder="Tu nombre"
            aria-invalid={showNameError}
          />
          {showNameError && (
            <p className="field-error">Nombre invalido. Usa solo letras y espacios.</p>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>RUT {validation.rut && <CheckCircle2 size={14} color="#25d366" />}</label>
            <input
              type="text" required
              value={formData.rut}
              onChange={e => onInputChange('rut', e.target.value)}
              className={`form-input ${!validation.rut && formData.rut.length > 3 ? 'input-error' : ''}`}
              placeholder="12.345.678-9"
              maxLength={12}
              aria-invalid={showRutError}
            />
            {showRutError && (
              <p className="field-error">RUT invalido. Revisa el formato.</p>
            )}
          </div>
          <div className="form-group">
            <label>Teléfono {validation.phone && <CheckCircle2 size={14} color="#25d366" />}</label>
            <input
              type="tel" required
              value={formData.phone}
              onChange={e => onInputChange('phone', e.target.value)}
              className="form-input"
              aria-invalid={showPhoneError}
            />
            {showPhoneError && (
              <p className="field-error">Telefono incompleto. Usa el formato +56 9.</p>
            )}
          </div>
        </div>

        {paymentType === 'online' && (
          <div className="form-group">
            <label>Comprobante {validation.receipt ? <CheckCircle2 size={14} color="#25d366" /> : <span className="text-accent">*</span>}</label>
            <div 
              className="upload-box"
              onClick={() => document.getElementById('receipt-upload').click()}
              style={{ borderColor: formData.receiptPreview ? '#25d366' : 'var(--card-border)' }}
            >
              <input type="file" id="receipt-upload" accept="image/*" hidden onChange={onFileChange} />
              {formData.receiptPreview ? (
                <div className="file-preview-row">
                  <img src={formData.receiptPreview} alt="Comprobante" />
                  <span>Imagen cargada</span>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <Upload size={20} /> <span>Subir captura</span>
                </div>
              )}
            </div>
            {showReceiptError && (
              <p className="field-error">Debes adjuntar el comprobante de transferencia.</p>
            )}
          </div>
        )}

        <div className="form-actions-col mt-20">
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary btn-block"
            onClick={() => {
              if (!validation.isReady) setShowFieldErrors(true);
            }}
          >
            {isSaving ? 'Enviando...' : 'Confirmar Pedido'}
          </button>
          <button type="button" className="btn btn-text btn-block" onClick={() => setShowForm(false)}>
            <ArrowLeft size={16} className="mr-5" /> Volver atrás
          </button>
        </div>
      </form>
    );
  }

  // 2. VISTA DETALLES DE PAGO (BANCO / LOCAL)
  if (paymentType) {
    return (
      <div className="payment-details animate-fade">
        {paymentType === 'online' ? (
          <BankInfo cartTotal={cartTotal} activeInfo={activeInfo} />
        ) : (
          <div className="store-pay-info glass mb-20">
            <Store size={32} className="text-accent" />
            <div>
              <h4>Pagar en Local</h4>
              <p className="text-muted">Pagas en efectivo o tarjeta al retirar.</p>
            </div>
            <div className="pay-total">Total: ${cartTotal.toLocaleString('es-CL')}</div>
          </div>
        )}

        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-block mt-4">
          {paymentType === 'online' ? 'Ya pagué' : 'Continuar'}
        </button>
        
        <button onClick={() => setPaymentType(null)} className="btn btn-text btn-block mt-2">
          <ArrowLeft size={16} className="mr-5" /> Elegir otro método
        </button>
      </div>
    );
  }

  // 3. VISTA SELECCIÓN INICIAL
  return (
    <div className="payment-options animate-fade">
      <h4 className="text-center mb-15 text-white">Método de Pago</h4>
      <button className="btn btn-secondary btn-block payment-opt" onClick={() => setPaymentType('online')}>
        <CreditCard size={20} className="mr-5" /> Transferencia
      </button>
      <button className="btn btn-secondary btn-block payment-opt" onClick={() => setPaymentType('tienda')}>
        <Store size={20} className="mr-5" /> Pagar en Local
      </button>
      <button onClick={onBack} className="btn btn-text btn-block mt-2">Cancelar</button>
    </div>
  );
};

const BankInfo = ({ cartTotal, activeInfo }) => {
  const info = activeInfo || {}; // Usar la info fusionada
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Verificar si hay datos configurados
  const hasData = info.bank_name || info.account_number || info.account_rut || info.account_email || info.account_holder;

  return (
    <div className="bank-info glass">
      <h4>Datos para Transferir</h4>
      {hasData ? (
          <ul className="bank-details-list">
            {info.bank_name && (
                <li><span>Banco:</span> <b>{info.bank_name}</b></li>
            )}
            {info.account_type && (
                <li><span>Tipo:</span> <b>{info.account_type}</b></li>
            )}
            {info.account_number && (
                <li className="copy-row" onClick={() => copyToClipboard(info.account_number)}>
                    <span>Cuenta:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b>{info.account_number}</b> <Copy size={14} />
                    </div>
                </li>
            )}
            {info.account_rut && (
                <li className="copy-row" onClick={() => copyToClipboard(info.account_rut)}>
                    <span>RUT:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b>{info.account_rut}</b> <Copy size={14} />
                    </div>
                </li>
            )}
            {info.account_email && (
                <li className="copy-row" onClick={() => copyToClipboard(info.account_email)}>
                    <span>Email:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b>{info.account_email}</b> <Copy size={14} />
                    </div>
                </li>
            )}
            {info.account_holder && (
                <li><span>Nombre:</span> <b>{info.account_holder}</b></li>
            )}
          </ul>
      ) : (
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
              No hay datos de transferencia configurados.<br/>
              Contacta al administrador.
          </p>
      )}
      <div className="pay-total">Total: ${cartTotal.toLocaleString('es-CL')}</div>
    </div>
  );
};

const SuccessView = ({ onNewOrder, onGoHome, receiptUploadFailed, activeInfo }) => (
  <div className="cart-success-view animate-fade">
    <div className="success-icon-circle"><Check size={40} /></div>
    <h2 className="text-accent">¡Pedido Recibido!</h2>
    <p style={{ color: '#aaa', marginBottom: '20px' }}>
      Estamos validando tu pago. Te contactaremos por WhatsApp.
    </p>
    {receiptUploadFailed && (
      <p className="cart-receipt-fallback" style={{ color: '#f59e0b', marginBottom: '16px', fontSize: '0.9rem' }}>
        No se pudo subir el comprobante. Por favor envíalo por WhatsApp cuando abras el chat.
      </p>
    )}
    <div className="order-summary-card">
      <div className="summary-label">Retiro en</div>
      <div className="summary-value">{activeInfo?.address || "Dirección no disponible"}</div>
      <div className="text-xs text-muted">{activeInfo?.name || "Nombre del local"}</div>
    </div>
    <div className="success-actions">
      <button className="btn btn-primary btn-block" onClick={onNewOrder}>Nuevo Pedido</button>
      <button className="btn btn-secondary btn-block" onClick={onGoHome}>Volver al Menú</button>
    </div>
  </div>
);

const EmptyState = ({ onMenu }) => (
  <div className="empty-state">
    <span className="empty-emoji">🍽️</span>
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
    <div className="item-details" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div className="item-top">
        <h4 style={{ margin: 0 }}>{item.name}</h4>
        <button onClick={() => onRemove(item.id)} className="btn-trash"><Trash2 size={16} /></button>
      </div>

      <div className="item-bottom" style={{ marginTop: 'auto', paddingTop: '4px' }}>
        <span className="item-price" style={{ fontWeight: 'bold' }}>${(unitPrice * item.quantity).toLocaleString('es-CL')}</span>
        <div className="qty-control-sm">
          <button onClick={() => onDecrease(item.id)}><Minus size={12} /></button>
          <span>{item.quantity}</span>
          <button onClick={() => onAdd(item)}><Plus size={12} /></button>
        </div>
      </div>
    </div>
  </div>
);

export default CartModal;