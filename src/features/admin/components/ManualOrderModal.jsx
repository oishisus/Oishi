import React, { useState } from 'react';
import {
    X, Search, Plus, User, ShoppingBag, Minus, Trash2,
    CreditCard, CheckCircle2, Store, Receipt, MessageCircle, Printer,
    Upload, FileText
} from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import logo from '../../../assets/logo.png';
import { useManualOrder } from '../hooks/useManualOrder';
import '../../../styles/ManualOrderModal.css';
import { printOrderTicket } from '../utils/receiptPrinting';

const ManualOrderModal = ({ isOpen, onClose, products, categories = [], onOrderSaved, showNotify, registerSale, branch, isMobile }) => {
    const {
        manualOrder, loading, rutValid, phoneValid,
        receiptFile, receiptPreview,
        updateClientName, updateNote, updatePaymentType, handleRutChange,
        handlePhoneChange, handleFileChange, removeReceipt, addItem, updateQuantity, removeItem,
        submitOrder, getInputStyle
    } = useManualOrder(showNotify, onOrderSaved, onClose, registerSale, branch);

    const [searchQuery, setSearchQuery] = useState('');

    const getQty = (id) => manualOrder.items.find(i => i.id === id)?.quantity || 0;

    // [MEJORA SEGURIDAD] Función de sanitización
    const sanitizeInput = (text) => {
        if (!text) return '';
        return text.replace(/[<>]/g, '').trim(); // Elimina < y > para evitar inyección básica
    };

    // [NUEVO] Función para imprimir ticket térmico
    const handlePrintPreCheck = () => {
        printOrderTicket(manualOrder, branch?.name, logo);
    };

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
        const hasPaymentType = !!manualOrder.payment_type;

        // Validación específica por tipo de pago
        let isPaymentValid = true;
        if (manualOrder.payment_type === 'online') {
            isPaymentValid = !!receiptFile;
        }

        const exactRutLength = manualOrder.client_rut?.trim().length || 0;
        const isRutRequiredAndValid = exactRutLength > 0 && rutValid;
        const isPhoneStrictlyValid = phoneValid === true;

        return hasItems && hasClientName && hasPaymentType && isPaymentValid && isRutRequiredAndValid && isPhoneStrictlyValid;
    };

    const renderProductCard = (p) => {
        const hasDiscount = Boolean(p.has_discount) && p.discount_price != null && Number(p.discount_price) > 0;
        const unitPrice = hasDiscount ? Number(p.discount_price) : Number(p.price);

        const handleAddClick = (e) => {
            e.stopPropagation();
            try { addItem(p); } catch {}
        };

        return (
            <div key={p.id} className="manual-order-product-card" onClick={() => addItem(p)}>
                {hasDiscount && (
                    <div style={{
                        position: 'absolute', top: '10px', left: '10px',
                        background: 'rgba(230,57,70,0.95)', color: '#fff',
                        fontSize: '10px', fontWeight: '800', padding: '4px 8px',
                        borderRadius: '999px', letterSpacing: '1px',
                        textTransform: 'uppercase', boxShadow: '0 8px 20px rgba(230,57,70,0.25)', zIndex: 2
                    }}>
                        Oferta
                    </div>
                )}
                <div className="manual-order-image-wrapper">
                    <img
                        src={p.image_url || logo} alt={p.name}
                        className={!p.image_url ? 'is-logo' : ''}
                        onError={(e) => { e.target.onerror = null; e.target.src = logo; e.target.classList.add('is-logo'); }}
                    />
                </div>
                <div className="manual-order-card-content">
                    <h3 className="manual-order-card-title" title={p.name}>{p.name}</h3>
                    {p.description && (
                        <p className="manual-order-card-desc" title={p.description}>
                            {p.description}
                        </p>
                    )}
                    <div className="manual-order-card-footer-row">
                        <div className="manual-order-card-price">
                            {hasDiscount ? (
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                                    <span style={{ fontSize: '11px', opacity: 0.65, textDecoration: 'line-through' }}>
                                        {formatCurrency(Number(p.price))}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#e63946' }}>
                                        {formatCurrency(unitPrice)}
                                    </span>
                                </div>
                            ) : (
                                formatCurrency(Number(p.price))
                            )}
                        </div>
                        <div className={`manual-order-stepper-container ${getQty(p.id) > 0 ? 'active' : ''}`}>
                            {getQty(p.id) === 0 ? (
                                <button className="manual-order-add-btn" onClick={handleAddClick}>
                                    <Plus size={18} />
                                </button>
                            ) : (
                                <div className="manual-order-stepper animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                    <button className="mo-step-btn minus" onClick={(e) => {
                                        e.stopPropagation();
                                        if (getQty(p.id) === 1) removeItem(p.id);
                                        else updateQuantity(p.id, -1);
                                    }}>
                                        <Minus size={14} />
                                    </button>
                                    <span className="mo-step-count">{getQty(p.id)}</span>
                                    <button className="mo-step-btn plus" onClick={handleAddClick}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
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

                        {/* Productos agrupados por categoría */}
                        <div className="manual-order-categories-scroll">
                            {(() => {
                                const query = searchQuery.toLowerCase();
                                const activeProducts = products.filter(p => p.is_active && p.name.toLowerCase().includes(query));

                                if (activeProducts.length === 0) {
                                    return (
                                        <div className="manual-order-empty-search" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                            No se encontraron productos
                                        </div>
                                    );
                                }

                                const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

                                const uncategorized = activeProducts.filter(p => !p.category_id || !categories.some(c => c.id === p.category_id));

                                return (
                                    <>
                                        {sortedCategories.map(cat => {
                                            const catProducts = activeProducts.filter(p => p.category_id === cat.id);
                                            if (catProducts.length === 0) return null;

                                            return (
                                                <div key={cat.id} className="manual-order-category-section">
                                                    <h3 className="manual-order-category-title">{cat.name}</h3>
                                                    <div className="manual-order-products-grid">
                                                        {catProducts.map(p => renderProductCard(p))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {uncategorized.length > 0 && (
                                            <div className="manual-order-category-section">
                                                <h3 className="manual-order-category-title">Otros</h3>
                                                <div className="manual-order-products-grid">
                                                    {uncategorized.map(p => renderProductCard(p))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
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
                                        onChange={e => updateClientName(sanitizeInput(e.target.value))}
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
                                        placeholder="RUT *"
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
                                    onChange={e => updateNote(sanitizeInput(e.target.value))}
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ShoppingBag size={14} />
                                RESUMEN ORDEN ({manualOrder.items.reduce((acc, i) => acc + i.quantity, 0)})
                            </div>
                                    {manualOrder.items.length > 0 && (
                                        <button onClick={handlePrintPreCheck} className="btn-icon-xs" title="Imprimir Pre-cuenta" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 4, padding: 4, cursor: 'pointer' }}>
                                            <Printer size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Carrito - VERSIÓN PREMIUM GLASSMORPHIC */}
                            <div style={{
                                flex: 1,
                                padding: '0 16px 16px',
                                overflowY: 'auto'
                            }}>
                                {manualOrder.items.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '50px 20px',
                                        color: '#555',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px',
                                        marginTop: '16px'
                                    }}>
                                        <ShoppingBag size={42} strokeWidth={1} style={{ opacity: 0.5 }} />
                                        <div style={{ fontSize: '0.85rem', letterSpacing: '2px', fontWeight: '600' }}>CARRITO VACÍO</div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {manualOrder.items.map(item => (
                                            <div
                                                key={item.id}
                                                className="animate-slide-up"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '12px',
                                                    padding: '10px 12px',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'center',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0, top: 0, bottom: 0, width: '4px',
                                                    background: 'var(--accent-red)'
                                                }} />

                                                <img
                                                    src={item.image_url || logo}
                                                    alt={item.name}
                                                    style={{
                                                        width: '46px',
                                                        height: '46px',
                                                        borderRadius: '8px',
                                                        objectFit: 'cover',
                                                        background: '#000'
                                                    }}
                                                    onError={(e) => { e.target.src = logo }}
                                                />
                                                
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{
                                                        color: '#eee',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        marginBottom: '2px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {item.name}
                                                    </div>

                                                    <div style={{
                                                        color: '#e63946',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '800'
                                                    }}>
                                                        {(() => {
                                                            const hasDiscount = Boolean(item.has_discount) && item.discount_price != null && Number(item.discount_price) > 0;
                                                            const unit = hasDiscount ? Number(item.discount_price) : Number(item.price);
                                                            const subtotal = unit * Number(item.quantity || 1);
                                                            return (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    {hasDiscount && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{
                                                                                fontSize: '10px',
                                                                                fontWeight: '900',
                                                                                color: '#fff',
                                                                                background: 'rgba(230,57,70,0.9)',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '999px',
                                                                                letterSpacing: '0.8px',
                                                                                textTransform: 'uppercase'
                                                                            }}>
                                                                                Oferta
                                                                            </span>
                                                                            <span style={{
                                                                                fontSize: '11px',
                                                                                opacity: 0.7,
                                                                                textDecoration: 'line-through',
                                                                                fontWeight: '700',
                                                                                color: '#cfcfcf'
                                                                            }}>
                                                                                {formatCurrency(Number(item.price))}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                                                                        <span style={{
                                                                            fontSize: '13px',
                                                                            fontWeight: '900',
                                                                            color: '#e63946'
                                                                        }}>
                                                                            {formatCurrency(subtotal)}
                                                                        </span>
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            opacity: 0.75,
                                                                            color: '#cfcfcf',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {formatCurrency(unit)} c/u
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                                    padding: '4px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#ccc',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            transition: 'color 0.2s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span style={{
                                                        color: 'white',
                                                        minWidth: '16px',
                                                        textAlign: 'center',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '700'
                                                    }}>
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#ccc',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            transition: 'color 0.2s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    title="Eliminar ítem"
                                                    style={{
                                                        background: 'rgba(230,57,70,0.1)',
                                                        border: '1px solid rgba(230,57,70,0.2)',
                                                        color: '#e63946',
                                                        cursor: 'pointer',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = '#e63946';
                                                        e.currentTarget.style.color = '#fff';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'rgba(230,57,70,0.1)';
                                                        e.currentTarget.style.color = '#e63946';
                                                    }}
                                                >
                                                    <Trash2 size={14} />
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
