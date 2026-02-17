import React, { useState } from 'react';
import {
    X, Search, Plus, User, ShoppingBag, Minus, Trash2,
    CreditCard, CheckCircle2, Store, Receipt, MessageCircle,
    Upload, FileText
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import logo from '../../assets/logo.png';
import { useManualOrder } from '../../hooks/useManualOrder';
import '../../styles/ManualOrderModal.css';

const ManualOrderModal = ({ isOpen, onClose, products = [], onOrderSaved, showNotify }) => {
    const {
        manualOrder, loading, rutValid, phoneValid,
        receiptFile, receiptPreview,
        updateClientName, updateNote, updatePaymentType, handleRutChange,
        handlePhoneChange, handleFileChange, removeReceipt, addItem, updateQuantity, removeItem,
        submitOrder, getInputStyle
    } = useManualOrder(showNotify, onOrderSaved, onClose);

    const [searchQuery, setSearchQuery] = useState('');

    const getQty = (id) => manualOrder.items.find(i => i.id === id)?.quantity || 0;

    // --- EFFECT: ESCAPE KEY ---
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // --- MOBILE GESTURES ---
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientY);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientY);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isDownSwipe = distance < -minSwipeDistance;
        if (isDownSwipe) {
            onClose();
        }
    };

    const [searchExpanded, setSearchExpanded] = useState(false);
    const searchInputRef = React.useRef(null);

    const toggleSearch = () => {
        setSearchExpanded(!searchExpanded);
        if (!searchExpanded) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    };

    const handleSearchBlur = () => {
        if (!searchQuery) {
            setSearchExpanded(false);
        }
    };

    if (!isOpen) return null;

    // Validación del formulario
    const isFormValid = () => {
        const hasItems = manualOrder.items && manualOrder.items.length > 0;
        const hasClientName = manualOrder.client_name && manualOrder.client_name.trim().length >= 3;
        const hasPaymentType = manualOrder.payment_type !== null;

        // Validación específica por tipo de pago
        let isPaymentValid = true;
        if (manualOrder.payment_type === 'online') {
            isPaymentValid = !!receiptFile;
        }

        const isRutValidOrEmpty = !manualOrder.client_rut || rutValid;
        const isPhoneValidOrEmpty = !manualOrder.client_phone || phoneValid;

        return hasItems && hasClientName && hasPaymentType && isPaymentValid && isRutValidOrEmpty && isPhoneValidOrEmpty;
    };

    return (
        <div className="manual-order-overlay" onClick={onClose}>
            <div
                className="manual-order-container"
                onClick={e => e.stopPropagation()}
            >
                {/* DRAG HANDLER (Invisible top area for gestures) */}
                <div
                    className="manual-order-drag-zone"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                />

                {/* FLOATING CLOSE BUTTON */}
                <button
                    onClick={onClose}
                    className="manual-order-floating-close"
                    title="Cerrar (Esc)"
                >
                    <X size={24} />
                </button>

                {/* HEADER REMOVED */}

                {/* CONTENT: 2 COLUMNAS */}
                <div className="manual-order-body">
                    {/* COLUMNA IZQUIERDA: PRODUCTOS */}
                    <div className="manual-order-products">

                        {/* FLOATING SEARCH PILL */}
                        <div
                            className={`manual-order-search-pill ${searchExpanded || searchQuery ? 'expanded' : ''}`}
                            onClick={toggleSearch}
                        >
                            <div className="manual-order-search-icon-wrapper">
                                <Search size={20} />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar..."
                                className="manual-order-search-input-pill"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onBlur={handleSearchBlur}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Grid de productos */}
                        <div className="manual-order-products-grid">
                            {products
                                .filter(p => p.is_active && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .length === 0 ? (
                                <div className="manual-order-empty-search" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#666' }}>
                                    No se encontraron productos
                                </div>
                            ) : (
                                products
                                    .filter(p => p.is_active && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(p => {
                                        const handleAddClick = (e) => {
                                            e.stopPropagation();
                                            try {
                                                addItem(p);
                                            } catch (error) {
                                                console.error('Error calling addItem:', error);
                                            }
                                        };

                                        return (
                                            <div
                                                key={p.id}
                                                className="manual-order-product-card"
                                                onClick={() => addItem(p)}
                                            >
                                                {/* Badge removed as requested */}

                                                {/* Imagen del producto */}
                                                <div className="manual-order-image-wrapper">
                                                    <img
                                                        src={p.image_url || logo}
                                                        alt={p.name}
                                                        className={!p.image_url ? 'is-logo' : ''}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = logo;
                                                            e.target.classList.add('is-logo');
                                                        }}
                                                    />
                                                </div>

                                                {/* Info del producto */}
                                                <div className="manual-order-card-content">
                                                    <span className="manual-order-card-category">
                                                        {p.category_name || 'GENERAL'}
                                                    </span>
                                                    <h3 className="manual-order-card-title" title={p.name}>
                                                        {p.name}
                                                    </h3>
                                                    <div className="manual-order-card-footer-row">
                                                        <div className="manual-order-card-price">
                                                            {formatCurrency(p.price)}
                                                        </div>
                                                        <div className="manual-order-stepper-container">
                                                            {getQty(p.id) === 0 ? (
                                                                <button
                                                                    className="manual-order-add-btn"
                                                                    onClick={handleAddClick}
                                                                >
                                                                    <Plus size={18} />
                                                                </button>
                                                            ) : (
                                                                <div className="manual-order-stepper" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="mo-step-btn minus"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (getQty(p.id) === 1) removeItem(p.id);
                                                                            else updateQuantity(p.id, -1);
                                                                        }}
                                                                    >
                                                                        <Minus size={14} />
                                                                    </button>
                                                                    <span className="mo-step-count">{getQty(p.id)}</span>
                                                                    <button
                                                                        className="mo-step-btn plus"
                                                                        onClick={handleAddClick}
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: SIDEBAR */}
                    <div className="manual-order-sidebar">
                        {/* Sección: Datos Cliente */}
                        <div className="manual-order-section">
                            <div className="manual-order-section-title">
                                <User size={14} />
                                DATOS CLIENTE
                            </div>
                            <div className="manual-order-form-grid">
                                <div className="manual-order-input-wrapper full-width">
                                    <input
                                        type="text"
                                        placeholder="NOMBRE COMPLETO *"
                                        className="manual-order-input"
                                        value={manualOrder.client_name}
                                        onChange={e => updateClientName(e.target.value)}
                                        aria-label="Nombre completo del cliente"
                                        style={{ paddingRight: manualOrder.client_name.length >= 3 ? '40px' : '16px' }}
                                    />
                                    {manualOrder.client_name.length >= 3 && (
                                        <div className="manual-order-validation-icon">
                                            <CheckCircle2 size={18} color="#25d366" />
                                        </div>
                                    )}
                                </div>

                                <div className="manual-order-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="RUT"
                                        className="manual-order-input"
                                        value={manualOrder.client_rut}
                                        onChange={handleRutChange}
                                        style={{
                                            ...getInputStyle(rutValid),
                                            paddingRight: rutValid ? '40px' : '16px'
                                        }}
                                    />
                                    {rutValid && (
                                        <div className="manual-order-validation-icon">
                                            <CheckCircle2 size={18} color="#25d366" />
                                        </div>
                                    )}
                                </div>

                                <div className="manual-order-input-wrapper">
                                    <input
                                        type="tel"
                                        placeholder="+56 9..."
                                        className="manual-order-input"
                                        value={manualOrder.client_phone}
                                        onChange={handlePhoneChange}
                                        style={{
                                            ...getInputStyle(phoneValid),
                                            paddingRight: phoneValid ? '40px' : '16px'
                                        }}
                                    />
                                    {phoneValid && (
                                        <div className="manual-order-validation-icon">
                                            <CheckCircle2 size={18} color="#25d366" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sección: Nota/Comentario - Compacto */}
                        <div className="manual-order-section" style={{ padding: '12px 16px' }}>
                            <div className="manual-order-section-title" style={{ marginBottom: '8px', fontSize: '10px' }}>
                                <MessageCircle size={12} />
                                NOTA DEL PEDIDO
                            </div>
                            <div style={{ position: 'relative' }}>
                                <textarea
                                    placeholder="Nota opcional..."
                                    className="manual-order-input"
                                    value={manualOrder.note}
                                    onChange={e => updateNote(e.target.value)}
                                    rows={1}
                                    maxLength={500}
                                    aria-label="Nota o comentario del pedido"
                                    style={{
                                        width: '100%',
                                        resize: 'vertical',
                                        minHeight: '36px',
                                        fontFamily: 'inherit',
                                        fontSize: '12px',
                                        lineHeight: '1.4',
                                        padding: '8px 10px'
                                    }}
                                />
                                {manualOrder.note.length > 0 && (
                                    <div style={{
                                        fontSize: '10px',
                                        color: manualOrder.note.length > 450 ? '#e63946' : '#666',
                                        textAlign: 'right',
                                        marginTop: '2px',
                                        fontWeight: manualOrder.note.length > 450 ? '600' : '400'
                                    }}>
                                        {manualOrder.note.length}/500
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sección: Resumen Orden - Expandido */}
                        <div className="manual-order-section" style={{ borderBottom: 'none', flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
                            <div className="manual-order-section-title" style={{ padding: '12px 16px 8px', margin: 0, background: '#0f0f0f', zIndex: 1 }}>
                                <ShoppingBag size={14} />
                                RESUMEN ORDEN ({manualOrder.items.reduce((acc, i) => acc + i.quantity, 0)})
                            </div>

                            {/* Carrito - VERSIÓN SIMPLE */}
                            <div style={{
                                flex: 1,
                                padding: '0 16px 16px',
                                overflowY: 'auto',
                                backgroundColor: '#0a0a0a'
                            }}>
                                {manualOrder.items.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px 20px',
                                        color: '#666'
                                    }}>
                                        <ShoppingBag size={48} strokeWidth={1} />
                                        <div style={{ marginTop: '10px' }}>CARRITO VACÍO</div>
                                    </div>
                                ) : (
                                    <div>
                                        {manualOrder.items.map(item => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    backgroundColor: '#141414',
                                                    border: '1px solid #222',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    marginBottom: '12px',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <img
                                                    src={item.image_url || logo}
                                                    alt={item.name}
                                                    style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        borderRadius: '6px',
                                                        objectFit: 'cover'
                                                    }}
                                                    onError={(e) => { e.target.src = logo }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        color: 'white',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {item.name}
                                                    </div>
                                                    <div style={{
                                                        color: '#e63946',
                                                        fontSize: '13px',
                                                        fontWeight: '700'
                                                    }}>
                                                        {formatCurrency(item.price * item.quantity)}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    backgroundColor: '#0a0a0a',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span style={{
                                                        color: 'white',
                                                        minWidth: '20px',
                                                        textAlign: 'center',
                                                        fontSize: '14px',
                                                        fontWeight: '600'
                                                    }}>
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#666',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer: Total y Pago */}
                        <div className="manual-order-footer">
                            <div className="manual-order-total">
                                <span className="manual-order-total-label">TOTAL A PAGAR</span>
                                <span className="manual-order-total-amount">
                                    {formatCurrency(manualOrder.total)}
                                </span>
                            </div>

                            {/* Métodos de pago */}
                            <div className="manual-order-payment-methods">
                                <button
                                    className={`manual-order-payment-btn ${manualOrder.payment_type === 'tienda' ? 'active' : ''}`}
                                    onClick={() => updatePaymentType('tienda')}
                                >
                                    <Store size={20} />
                                    EFECTIVO
                                </button>
                                <button
                                    className={`manual-order-payment-btn ${manualOrder.payment_type === 'tarjeta' ? 'active' : ''}`}
                                    onClick={() => updatePaymentType('tarjeta')}
                                >
                                    <CreditCard size={20} />
                                    TARJETA
                                </button>
                                <button
                                    className={`manual-order-payment-btn ${manualOrder.payment_type === 'online' ? 'active' : ''}`}
                                    onClick={() => updatePaymentType('online')}
                                >
                                    <Receipt size={20} />
                                    TRANSF.
                                </button>
                            </div>

                            {/* Comprobante de transferencia - Destacado */}
                            {manualOrder.payment_type === 'online' && (
                                <div style={{
                                    marginBottom: '12px',
                                    padding: '12px',
                                    background: 'rgba(230, 57, 70, 0.08)',
                                    border: '1px solid rgba(230, 57, 70, 0.3)',
                                    borderRadius: '8px',
                                    animation: 'fadeIn 0.3s ease'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#e63946',
                                        fontWeight: '800',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        textTransform: 'uppercase'
                                    }}>
                                        <Upload size={14} />
                                        Adjuntar Comprobante
                                    </div>

                                    <label
                                        htmlFor="receipt-upload"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '16px',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                            border: '1px dashed rgba(230, 57, 70, 0.3)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(230, 57, 70, 0.05)';
                                            e.currentTarget.style.borderColor = '#e63946';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                                            e.currentTarget.style.borderColor = 'rgba(230, 57, 70, 0.3)';
                                        }}
                                    >
                                        <div style={{
                                            background: '#e63946',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <FileText size={16} color="white" />
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#ccc', fontWeight: '500' }}>
                                            {receiptFile ? receiptFile.name : 'Click para subir imagen'}
                                        </span>
                                    </label>
                                    <input
                                        id="receipt-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />

                                    {receiptPreview && (
                                        <div style={{
                                            marginTop: '12px',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            position: 'relative'
                                        }}>
                                            <img
                                                src={receiptPreview}
                                                alt="Preview"
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    maxHeight: '150px',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    removeReceipt();
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    background: 'rgba(230, 57, 70, 0.9)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                                                }}
                                            >
                                                QUITAR
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botón confirmar */}
                            <button
                                className="manual-order-confirm-btn"
                                onClick={submitOrder}
                                disabled={loading || !isFormValid()}
                                style={{
                                    opacity: loading || !isFormValid() ? 0.5 : 1,
                                    cursor: loading || !isFormValid() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite'
                                        }} />
                                        PROCESANDO...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={20} />
                                        CONFIRMAR PEDIDO
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualOrderModal;
