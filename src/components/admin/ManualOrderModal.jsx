import React, { useState } from 'react';
import {
    X, Search, Plus, User, ShoppingBag, Minus, Trash2,
    DollarSign, CreditCard, Image as ImageIcon, Upload,
    Loader2, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRut, formatCurrency } from '../../utils/formatters';

const ManualOrderModal = ({
    isOpen,
    onClose,
    products,
    onOrderSaved,
    isMobile,
    showNotify
}) => {
    // --- INTERNAL STATE ---
    const [manualOrder, setManualOrder] = useState({
        client_name: '',
        client_rut: '',
        client_phone: '',
        items: [],
        total: 0,
        payment_type: 'tienda',
        note: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [mobileTab, setMobileTab] = useState('products'); // 'products' | 'checkout'
    const [loading, setLoading] = useState(false);

    // Validation States
    const [rutValid, setRutValid] = useState(null);
    const [phoneValid, setPhoneValid] = useState(null);

    // Receipt Upload States
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);

    // --- HANDLERS ---
    const handleManualRutChange = (e) => {
        const formatted = formatRut(e.target.value);
        setManualOrder(prev => ({ ...prev, client_rut: formatted }));
        setRutValid(formatted.length >= 8);
    };

    const handleManualPhoneChange = (e) => {
        let input = e.target.value;
        if (!input.startsWith("+56 9")) input = "+56 9 ";
        const numbersOnly = input.replace(/[^0-9+ ]/g, '');
        setManualOrder(prev => ({ ...prev, client_phone: numbersOnly }));
        const digitCount = numbersOnly.replace(/\D/g, '').length;
        setPhoneValid(digitCount >= 11);
    };

    const getInputStyle = (isValid) => {
        if (isValid === true) return { borderColor: '#25d366', boxShadow: '0 0 0 1px #25d366' };
        if (isValid === false) return { borderColor: '#ff4444', boxShadow: '0 0 0 1px #ff4444' };
        return {};
    };

    // --- CART LOGIC ---
    const addItemToOrder = (product) => {
        const currentItems = manualOrder.items || [];
        const exists = currentItems.find(i => i.id === product.id);
        let newItems;

        if (exists) {
            newItems = currentItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
            newItems = [...currentItems, {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            }];
        }

        const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        setManualOrder(prev => ({ ...prev, items: newItems, total: newTotal }));
        showNotify("Producto agregado", "success");
    };

    const updateItemQuantity = (itemId, change) => {
        const currentItems = manualOrder.items;
        const item = currentItems.find(i => i.id === itemId);
        if (!item) return;

        let newItems;
        if (item.quantity + change < 1) {
            // Don't remove on minus, require trash button? Or remove?
            // Typical UX: minus on 1 does nothing or removes. Let's start with min 1.
            newItems = currentItems.map(i => i.id === itemId ? { ...i, quantity: 1 } : i);
        } else {
            newItems = currentItems.map(i => i.id === itemId ? { ...i, quantity: i.quantity + change } : i);
        }

        const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        setManualOrder(prev => ({ ...prev, items: newItems, total: newTotal }));
    };

    const removeItem = (itemId) => {
        const newItems = manualOrder.items.filter(i => i.id !== itemId);
        const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        setManualOrder(prev => ({ ...prev, items: newItems, total: newTotal }));
    };

    // --- SAVE LOGIC ---
    const saveManualOrder = async () => {
        // 1. Validaciones básicas
        if (!manualOrder.client_name || !manualOrder.client_phone || manualOrder.items.length === 0) {
            showNotify('Faltan datos (Nombre, Teléfono o Productos)', 'error');
            return;
        }

        // Validar comprobante solo si es transferencia ('online')
        if (manualOrder.payment_type === 'online' && !receiptFile) {
            showNotify('Debes subir el comprobante de transferencia', 'error');
            return;
        }

        setLoading(true);
        try {
            // 2. Subir comprobante (si aplica)
            let receiptUrl = null;
            if (manualOrder.payment_type === 'online' && receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `receipts/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
                const { error: upErr } = await supabase.storage.from('images').upload(fileName, receiptFile);
                if (upErr) throw upErr;
                const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                receiptUrl = data.publicUrl;
            }

            // 3. LÓGICA CLIENTE (Upsert)
            let clientId = null;
            // Intentar buscar por RUT si existe y tiene largo decente
            if (manualOrder.client_rut && manualOrder.client_rut.length > 7) {
                const { data: existingClient } = await supabase
                    .from('clients')
                    .select('id, total_spent, total_orders')
                    .eq('rut', manualOrder.client_rut)
                    .single();

                if (existingClient) {
                    clientId = existingClient.id;
                    await supabase.from('clients').update({
                        name: manualOrder.client_name,
                        phone: manualOrder.client_phone,
                        total_spent: (existingClient.total_spent || 0) + manualOrder.total,
                        total_orders: (existingClient.total_orders || 0) + 1,
                        last_order_at: new Date().toISOString(),
                    }).eq('id', clientId);
                } else {
                    // Crear nuevo con RUT
                    const { data: newClient } = await supabase.from('clients').insert({
                        name: manualOrder.client_name,
                        phone: manualOrder.client_phone,
                        rut: manualOrder.client_rut,
                        total_spent: manualOrder.total,
                        total_orders: 1,
                        last_order_at: new Date().toISOString()
                    }).select('id').single();
                    clientId = newClient.id;
                }
            } else {
                // Cliente sin RUT
                const { data: newClient } = await supabase.from('clients').insert({
                    name: manualOrder.client_name,
                    phone: manualOrder.client_phone,
                    rut: 'SIN-RUT-' + Date.now().toString().slice(-4),
                    total_spent: manualOrder.total,
                    total_orders: 1,
                    last_order_at: new Date().toISOString()
                }).select('id').single();
                clientId = newClient.id;
            }

            // 4. Crear el Pedido
            await supabase.from('orders').insert({
                client_id: clientId,
                client_name: manualOrder.client_name,
                client_rut: manualOrder.client_rut || '',
                client_phone: manualOrder.client_phone,
                items: manualOrder.items,
                total: manualOrder.total,
                payment_type: manualOrder.payment_type,
                payment_ref: receiptUrl ? receiptUrl : (manualOrder.payment_type === 'online' ? '' : 'Pago Presencial'),
                note: manualOrder.note,
                status: 'pending',
                created_at: new Date().toISOString()
            });

            showNotify('Pedido ingresado con éxito');

            // Resetear estado
            setManualOrder({
                client_name: '', client_rut: '', client_phone: '', items: [], total: 0, payment_type: 'tienda', note: ''
            });
            setReceiptFile(null);
            setReceiptPreview(null);
            setRutValid(null);
            setPhoneValid(null);

            onOrderSaved(); // Refresh parent data
            onClose(); // Close modal

        } catch (error) {
            console.error(error);
            showNotify('Error al guardar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="manual-order-container glass animate-slide-in"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '1200px',
                    width: '95%',
                    height: isMobile ? '100%' : '85vh',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* CABECERA */}
                <div className="mo-header">
                    <div>
                        <h3 style={{ margin: 0 }}>NUEVO PEDIDO</h3>
                        <div className="sub-text">Punto de Venta Manual</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn-close-cart"
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* CUERPO PRINCIPAL */}
                <div className="mo-body" style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1.2fr',
                    gap: isMobile ? 15 : 25,
                    padding: isMobile ? 15 : 25,
                    overflow: 'hidden'
                }}>

                    {/* IZQUIERDA: CATÁLOGO */}
                    <div style={{
                        display: isMobile && mobileTab !== 'products' ? 'none' : 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        overflow: 'hidden',
                        paddingRight: !isMobile ? 15 : 0,
                        borderRight: !isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                        {/* Buscador */}
                        <div className="search-box mb-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 15px' }}>
                            <Search size={20} color="var(--text-secondary)" />
                            <input
                                placeholder="BUSCAR PRODUCTO..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                                style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}
                            />
                        </div>

                        {/* Grid Productos */}
                        <div className="inventory-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 15,
                            overflowY: 'auto',
                            paddingBottom: 20
                        }}>
                            {products
                                .filter(p => p.is_active && p.name.toLowerCase().includes((searchQuery || '').toLowerCase()))
                                .map(p => (
                                    <div
                                        key={p.id}
                                        className="pos-product-card glass"
                                        onClick={() => addItemToOrder(p)}
                                    >
                                        <div className="card-cat">{p.category_name || 'General'}</div>
                                        <div className="card-title">{p.name}</div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginTop: 10 }}>
                                            <div className="card-price">
                                                {formatCurrency(p.price)}
                                            </div>
                                            <div className="add-btn">
                                                <Plus size={18} color="black" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* DERECHA: PROCESO DE PAGO */}
                    <div style={{
                        display: isMobile && mobileTab === 'products' ? 'none' : 'flex',
                        flexDirection: 'column',
                        gap: 20,
                        overflowY: 'auto',
                        height: '100%',
                        paddingLeft: !isMobile ? 10 : 0
                    }}>

                        {/* 1. Datos Cliente */}
                        <div className="glass" style={{ padding: 20, borderRadius: 16, background: 'rgba(0,0,0,0.2)' }}>
                            <h4 style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2 }}>
                                <User size={14} /> Datos Cliente
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                                {/* Nombre */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <input
                                        className="mo-input"
                                        value={manualOrder.client_name}
                                        onChange={e => setManualOrder(prev => ({ ...prev, client_name: e.target.value }))}
                                        placeholder="NOMBRE COMPLETO *"
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>

                                {/* RUT */}
                                <div className="input-feedback-wrapper">
                                    <input
                                        className="mo-input"
                                        value={manualOrder.client_rut}
                                        onChange={handleManualRutChange}
                                        placeholder="RUT"
                                        style={getInputStyle(rutValid)}
                                    />
                                </div>

                                {/* Teléfono */}
                                <div className="input-feedback-wrapper">
                                    <input
                                        className="mo-input"
                                        value={manualOrder.client_phone}
                                        onChange={handleManualPhoneChange}
                                        placeholder="+56 9..."
                                        style={getInputStyle(phoneValid)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Resumen Pedido */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150 }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2 }}>
                                <ShoppingBag size={14} /> Resumen Orden
                            </h4>

                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 15, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {(manualOrder.items || []).length === 0 ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, flexDirection: 'column', gap: 10 }}>
                                        <ShoppingBag size={40} strokeWidth={1} />
                                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>Carrito Vacío</span>
                                    </div>
                                ) : (
                                    manualOrder.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'white' }}>{item.name}</div>
                                                <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginTop: 3, fontWeight: 'bold' }}>{formatCurrency(item.price * item.quantity)}</div>
                                            </div>
                                            <div className="qty-control-modern">
                                                <button className="qty-btn" onClick={() => updateItemQuantity(item.id, -1)}><Minus size={14} /></button>
                                                <span className="qty-val">{item.quantity}</span>
                                                <button className="qty-btn" onClick={() => updateItemQuantity(item.id, 1)}><Plus size={14} /></button>
                                                <button className="qty-btn" style={{ color: '#ff4444', marginLeft: 5 }} onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 3. Total y Pago */}
                        <div style={{ background: 'rgba(10,10,10,0.8)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>Total a Pagar</span>
                                <span style={{ color: '#25d366', fontSize: '1.6rem', fontWeight: '800', lineHeight: 1 }}>{formatCurrency(manualOrder.total || 0)}</span>
                            </div>

                            {/* Selector Método Pago */}
                            <div className="payment-method-grid">
                                <div
                                    className={`pm-btn ${manualOrder.payment_type === 'efectivo' ? 'active' : ''}`}
                                    onClick={() => { setManualOrder(prev => ({ ...prev, payment_type: 'efectivo' })); setReceiptFile(null); setReceiptPreview(null); }}
                                >
                                    <DollarSign size={20} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>EFECTIVO</span>
                                </div>

                                <div
                                    className={`pm-btn ${manualOrder.payment_type === 'tarjeta' ? 'active' : ''}`}
                                    onClick={() => { setManualOrder(prev => ({ ...prev, payment_type: 'tarjeta' })); setReceiptFile(null); setReceiptPreview(null); }}
                                >
                                    <CreditCard size={20} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>TARJETA</span>
                                </div>

                                <div
                                    className={`pm-btn ${manualOrder.payment_type === 'online' ? 'active' : ''}`}
                                    onClick={() => { setManualOrder(prev => ({ ...prev, payment_type: 'online' })); }}
                                >
                                    <ImageIcon size={20} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>TRANSF.</span>
                                </div>
                            </div>

                            {/* Upload Comprobante (Solo Transferencia) */}
                            {manualOrder.payment_type === 'online' && (
                                <div className="form-group animate-slide-up" style={{ marginBottom: 15 }}>
                                    <div className="upload-box" onClick={() => document.getElementById('manual-receipt-upload').click()} style={{ padding: 12, minHeight: 50, borderColor: receiptPreview ? '#25d366' : 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                                        <input type="file" id="manual-receipt-upload" accept="image/*" hidden onChange={handleFileChange} />
                                        {receiptPreview ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                                <img src={receiptPreview} alt="Preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                                <span style={{ fontSize: '0.8rem', color: '#25d366', fontWeight: 'bold' }}>Adjuntado</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                                <Upload size={16} />
                                                <span style={{ fontSize: '0.85rem' }}>Adjuntar Comprobante</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-block"
                                onClick={saveManualOrder}
                                disabled={loading || (manualOrder.items || []).length === 0 || !manualOrder.client_name}
                                style={{ padding: 16, fontSize: '1rem', fontWeight: 'bold', background: loading ? '#555' : 'var(--accent-primary)', opacity: loading ? 0.7 : 1, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 }}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><CheckCircle2 size={20} /> Confirmar Pedido</div>}
                            </button>
                        </div>

                    </div>
                </div>

                {/* TABS MÓVIL */}
                {isMobile && (
                    <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#111' }}>
                        <button onClick={() => setMobileTab('products')} style={{ flex: 1, padding: 15, background: 'none', border: 'none', color: mobileTab === 'products' ? 'white' : 'gray', fontWeight: 'bold', borderTop: mobileTab === 'products' ? '3px solid var(--accent-primary)' : '3px solid transparent', fontSize: '0.9rem', textTransform: 'uppercase' }}>Productos</button>
                        <button onClick={() => setMobileTab('checkout')} style={{ flex: 1, padding: 15, background: 'none', border: 'none', color: mobileTab === 'checkout' ? 'white' : 'gray', fontWeight: 'bold', borderTop: mobileTab === 'checkout' ? '3px solid var(--accent-primary)' : '3px solid transparent', fontSize: '0.9rem', textTransform: 'uppercase' }}>Pagar ({formatCurrency(manualOrder.total || 0)})</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualOrderModal;
