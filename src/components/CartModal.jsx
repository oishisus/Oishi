import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Trash2, Plus, Minus, MessageCircle, ShoppingBag, 
  CreditCard, Store, Check, Upload, FileText, ArrowLeft, 
  AlertCircle, CheckCircle2 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

const CartModal = React.memo(() => {
  const { 
    cart, isCartOpen, toggleCart, 
    addToCart, decreaseQuantity, removeFromCart, clearCart,
    cartTotal, getPrice, orderNote, setOrderNote 
  } = useCart();

  const navigate = useNavigate();
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400';

  // --- ESTADOS ---
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Datos del Cliente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+56 9 "); 
  const [clientRut, setClientRut] = useState(""); 
  const [receiptFile, setReceiptFile] = useState(null); 
  const [receiptPreview, setReceiptPreview] = useState(null); // Nuevo estado para la miniatura
  
  const [paymentType, setPaymentType] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de Validación Visual
  const [phoneValid, setPhoneValid] = useState(null); // null = sin validar, true = valido, false = error
  const [rutValid, setRutValid] = useState(null);

  // --- UTILIDADES DE VALIDACIÓN ---
  
  // 1. Formateador de RUT (Mantiene formato 12.345.678-9)
  const formatRut = (rut) => {
    let value = rut.replace(/[^0-9kK]/g, '');
    if (value.length > 1) {
      const dv = value.slice(-1);
      const cuerpo = value.slice(0, -1);
      let cuerpoFormateado = "";
      for (let i = cuerpo.length - 1, j = 1; i >= 0; i--, j++) {
        cuerpoFormateado = cuerpo.charAt(i) + cuerpoFormateado;
        if (j % 3 === 0 && i !== 0) {
          cuerpoFormateado = "." + cuerpoFormateado;
        }
      }
      return `${cuerpoFormateado}-${dv}`;
    }
    return value;
  };

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setClientRut(formatted);
    // Validación simple de largo (mínimo para un RUT corto: 1.111.111-1 son 11 chars)
    setRutValid(formatted.length >= 11);
  };

  // 2. Manejador de Teléfono Inteligente (Máscara +56 9)
  const handlePhoneChange = (e) => {
    let input = e.target.value;
    
    // Si el usuario intenta borrar el prefijo, lo reseteamos
    if (!input.startsWith("+56 9")) {
      input = "+56 9 "; 
    }

    // Solo permitimos números y espacios extra después del prefijo
    const numbersOnly = input.replace(/[^0-9+ ]/g, '');
    setClientPhone(numbersOnly);

    // Validar largo: +56 9 xxxx xxxx son 12 a 13 caracteres aprox
    // Un número chileno tiene 9 dígitos. +56 9 (5 chars) + 8 dígitos = 13 chars min
    const digitCount = numbersOnly.replace(/\D/g, '').length;
    setPhoneValid(digitCount >= 11); // 569 + 8 dígitos = 11 dígitos total
  };

  // 3. Manejo de Archivo con Preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file)); // Creamos URL temporal
    }
  };

  const resetPaymentFlow = () => {
    setShowPaymentInfo(false);
    setShowForm(false);
    setPaymentType(null);
    setClientName("");
    setClientPhone("+56 9 ");
    setClientRut("");
    setReceiptFile(null);
    setReceiptPreview(null);
    setIsSaving(false);
    setPhoneValid(null);
    setRutValid(null);
  };

  if (!isCartOpen) return null;

  const handlePaid = () => setShowForm(true);

  // --- SUBIDA A SUPABASE ---
  const uploadReceipt = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = `receipts/${fileName}`; 

    const { error } = await supabase.storage.from('images').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSendOrder = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    if (!phoneValid) {
      alert("Por favor completa el número de teléfono.");
      return;
    }

    setIsSaving(true);

    try {
      let receiptUrl = null;

      if (paymentType === 'online') {
        if (!receiptFile) {
          alert("Debes adjuntar el comprobante de transferencia.");
          setIsSaving(false);
          return;
        }
        receiptUrl = await uploadReceipt(receiptFile);
      }

      const { error } = await supabase.from('orders').insert({
        client_name: clientName,
        client_phone: clientPhone,
        client_rut: clientRut,
        payment_ref: receiptUrl ? receiptUrl : 'Pago en Local',
        payment_type: paymentType,
        total: cartTotal,
        items: cart,
        note: orderNote,
        status: 'pending'
      });

      if (error) throw error;

      setShowForm(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        const phoneNumber = "56976645547";
        let message = '';
        message += '*NUEVO PEDIDO WEB - OISHI*\n';
        message += '================================\n\n';
        
        message += `Cliente: ${clientName}\n`;
        message += `RUT: ${clientRut}\n`;
        message += `Fono: ${clientPhone}\n\n`;
        
        message += 'DETALLE:\n';
        cart.forEach(item => {
          const price = getPrice(item);
          message += `+ ${item.quantity} x ${item.name.toUpperCase()}\n`;
        });
        
        message += `\n*TOTAL: $${cartTotal.toLocaleString('es-CL')}*\n`;
        
        if (paymentType === 'online') {
          message += `Pago: Transferencia (Comprobante Adjunto)\n`;
        } else {
          message += `Pago: En Local\n`;
        }

        if (orderNote.trim()) message += `\nNota: ${orderNote}\n`;
        
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Error al procesar: " + error.message);
      setIsSaving(false);
    }
  };

  // Función auxiliar para estilo de validación
  const getInputStyle = (isValid) => {
    if (isValid === true) return { borderColor: '#25d366', boxShadow: '0 0 0 1px #25d366' }; // Verde
    if (isValid === false) return { borderColor: '#ff4444', boxShadow: '0 0 0 1px #ff4444' }; // Rojo
    return {}; // Normal
  };

  return (
    <div className="modal-overlay" onClick={toggleCart}>
      <div className="cart-panel glass animate-slide-in" onClick={e => e.stopPropagation()}>
        
        {showSuccess ? (
          <div className="cart-success-view">
            <div className="success-icon-circle">
              <Check size={40} />
            </div>
            <h2 className="text-gradient">¡Pedido Recibido!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Estamos validando tu pago. Te contactaremos por WhatsApp.
            </p>
            
            <div className="order-summary-card animate-fade">
              <div className="summary-label">Lugar de Retiro</div>
              <div className="summary-value" style={{marginBottom: 4}}>
                Castelar Nte. 141
              </div>
              <div style={{fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight: 1.4}}>
                8940000 San Joaquín<br/>Región Metropolitana, Chile
              </div>
            </div>

            <div className="success-actions">
              <button className="btn btn-primary btn-block" onClick={() => { clearCart(); setShowSuccess(false); resetPaymentFlow(); }}>
                Nuevo Pedido
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => { clearCart(); navigate('/'); }}>
                Volver al Menú
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="cart-header">
              <div className="flex-center">
                <ShoppingBag size={22} className="text-accent" />
                <h3>Tu Pedido</h3>
                <span className="cart-count-badge">{cart.reduce((a,c) => a + c.quantity, 0)}</span>
              </div>
              <button onClick={toggleCart} className="btn-close-cart"><X size={24} /></button>
            </header>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-emoji">🍣</span>
                  <h3>Bandeja Vacía</h3>
                  <button onClick={toggleCart} className="btn btn-secondary mt-20">Ir al Menú</button>
                </div>
              ) : (
                <>
                  <div className="cart-items-list">
                    {cart.map(item => {
                      const unitPrice = getPrice(item);
                      return (
                        <div key={item.id} className="cart-item">
                          <img src={item.image_url || FALLBACK_IMAGE} alt={item.name} className="item-thumb" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }} />
                          <div className="item-details">
                            <div className="item-top">
                              <h4>{item.name}</h4>
                              <button onClick={() => removeFromCart(item.id)} className="btn-trash"><Trash2 size={16} /></button>
                            </div>
                            <div className="item-bottom">
                              <span className="item-price">${(unitPrice * item.quantity).toLocaleString('es-CL')}</span>
                              <div className="qty-control-sm">
                                <button onClick={() => decreaseQuantity(item.id)}><Minus size={12} /></button>
                                <span>{item.quantity}</span>
                                <button onClick={() => addToCart(item)}><Plus size={12} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cart-notes">
                    <label>Notas de cocina</label>
                    <textarea className="form-input" placeholder="Ej: Sin sésamo..." value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows="2" />
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <footer className="cart-footer">
                {!showPaymentInfo && (
                  <div className="total-row"><span>Total</span><span className="total-price">${cartTotal.toLocaleString('es-CL')}</span></div>
                )}

                {showPaymentInfo ? (
                  (paymentType === 'online' || paymentType === 'tienda') ? (
                    showForm ? (
                      <form onSubmit={handleSendOrder} className="checkout-form animate-fade">
                        <h4 className="form-title"><MessageCircle size={18}/> Datos del Cliente</h4>
                        
                        <div className="form-group">
                          <label>Nombre Completo</label>
                          <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)} className="form-input" placeholder="Tu nombre" />
                        </div>

                        <div className="form-group">
                          <div style={{display:'flex', justifyContent:'space-between'}}>
                            <label>RUT</label>
                            {rutValid && <CheckCircle2 size={16} color="#25d366" />}
                          </div>
                          <input 
                            type="text" 
                            required 
                            value={clientRut} 
                            onChange={handleRutChange} 
                            className="form-input" 
                            placeholder="12.345.678-9" 
                            maxLength={12} 
                            style={getInputStyle(rutValid)}
                          />
                        </div>
                        
                        <div className="form-group">
                          <div style={{display:'flex', justifyContent:'space-between'}}>
                            <label>Teléfono</label>
                            {phoneValid && <CheckCircle2 size={16} color="#25d366" />}
                          </div>
                          <input 
                            type="tel" 
                            required 
                            value={clientPhone} 
                            onChange={handlePhoneChange} 
                            className="form-input" 
                            placeholder="+56 9..." 
                            style={getInputStyle(phoneValid)}
                          />
                          {!phoneValid && clientPhone.length > 6 && (
                            <span style={{fontSize:'0.7rem', color:'#ff4444'}}>Faltan números</span>
                          )}
                        </div>

                        {paymentType === 'online' && (
                          <div className="form-group">
                            <label>Comprobante de Transferencia</label>
                            <div 
                              className="upload-box" 
                              onClick={() => document.getElementById('receipt-upload').click()}
                              style={{borderColor: receiptPreview ? '#25d366' : 'var(--card-border)'}}
                            >
                              <input type="file" id="receipt-upload" accept="image/*" hidden onChange={handleFileChange} />
                              
                              {/* VISTA PREVIA DE LA IMAGEN */}
                              {receiptPreview ? (
                                <div className="file-preview-container" style={{display:'flex', alignItems:'center', gap: 15, justifyContent:'center'}}>
                                  <img 
                                    src={receiptPreview} 
                                    alt="Comprobante" 
                                    style={{width: 50, height: 50, borderRadius: 8, objectFit: 'cover', border: '1px solid white'}} 
                                  />
                                  <div style={{textAlign:'left'}}>
                                    <span style={{display:'block', fontSize:'0.85rem', fontWeight:'bold', color:'white'}}>Imagen Cargada</span>
                                    <span style={{fontSize:'0.75rem', color:'#25d366'}}>Click para cambiar</span>
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
                          <button type="submit" disabled={isSaving || !phoneValid} className="btn btn-primary btn-block">
                            {isSaving ? 'Enviando...' : 'Confirmar Pedido'}
                          </button>
                          <button type="button" className="btn btn-text btn-block" onClick={() => setShowForm(false)}>
                            <ArrowLeft size={16} style={{marginRight: 5}}/> Volver atrás
                          </button>
                        </div>
                      </form>
                    ) : (
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
                            <button onClick={handlePaid} className="btn btn-primary btn-block mt-4">Ya pagué, subir comprobante</button>
                          </div>
                        ) : (
                          <div className="store-pay-info glass">
                            <Store size={32} className="text-accent"/>
                            <h4>Pagar en Local</h4>
                            <p>Pagas en efectivo o tarjeta al retirar.</p>
                            <div className="pay-total">Total: ${cartTotal.toLocaleString('es-CL')}</div>
                            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-block mt-4">Continuar</button>
                          </div>
                        )}
                        <button onClick={() => setPaymentType(null)} className="btn btn-text btn-block mt-2">
                          <ArrowLeft size={16} style={{marginRight: 5}}/> Elegir otro método
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="payment-options animate-fade">
                      <h4 style={{textAlign:'center', marginBottom: 15, color:'white'}}>Método de Pago</h4>
                      <button className="btn btn-secondary btn-block payment-opt" onClick={() => setPaymentType('online')}><CreditCard size={20}/> Transferencia</button>
                      <button className="btn btn-secondary btn-block payment-opt" onClick={() => setPaymentType('tienda')}><Store size={20}/> Pagar en Local</button>
                      <button onClick={() => setShowPaymentInfo(false)} className="btn btn-text btn-block">Cancelar</button>
                    </div>
                  )
                ) : (
                  <button onClick={() => setShowPaymentInfo(true)} className="btn btn-primary btn-block btn-lg">Ir a Pagar</button>
                )}
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default CartModal;