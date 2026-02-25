import { useState, useCallback, useMemo, useEffect } from 'react';
import { formatRut, validateRut } from '../../../shared/utils/formatters';
import { validateImageFile } from '../../../shared/utils/cloudinary';
import { createManualOrder } from '../../orders/services/orders';

const initialOrderState = {
    client_name: '',
    client_rut: '',
    client_phone: '+56 9 ',
    items: [],
    total: 0,
    payment_type: 'tienda',
    note: ''
};

export const useManualOrder = (showNotify, onOrderSaved, onClose, registerSale, branch) => {

    // --- ESTADOS DE DATOS ---
    // Usar lazy initialization para evitar reset
    const [manualOrder, setManualOrder] = useState(() => initialOrderState);
    const [loading, setLoading] = useState(false);

    // --- ESTADOS DE VALIDACIÓN Y ARCHIVOS ---
    const [rutValid, setRutValid] = useState(null);
    const [phoneValid, setPhoneValid] = useState(null);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);

    useEffect(() => {
        return () => {
            if (receiptPreview) URL.revokeObjectURL(receiptPreview);
        };
    }, [receiptPreview]);

    const getPrice = useCallback((product) => {
        if (product?.has_discount && product?.discount_price && parseInt(product.discount_price) > 0) {
            return parseInt(product.discount_price);
        }
        return parseInt(product?.price);
    }, []);

    // --- MANEJADORES DE FORMULARIO ---
    const updateClientName = (val) => setManualOrder(prev => ({ ...prev, client_name: val }));
    const updateNote = (val) => setManualOrder(prev => ({ ...prev, note: val }));

    const updatePaymentType = (type) => {
        setManualOrder(prev => ({ ...prev, payment_type: type }));
        // Si cambia a efectivo, limpiamos la foto
        if (type !== 'online') {
            setReceiptFile(null);
            setReceiptPreview(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        }
    };

    const handleRutChange = (e) => {
        const rawValue = e.target.value;
        const formatted = formatRut(rawValue);
        setManualOrder(prev => ({ ...prev, client_rut: formatted }));

        setRutValid(validateRut(formatted));
    };

    const handlePhoneChange = (e) => {
        let input = e.target.value;
        if (!input.startsWith("+56 9")) {
            if (input.length < 6) input = "+56 9 ";
        }
        const cleaned = input;
        setManualOrder(prev => ({ ...prev, client_phone: cleaned }));

        const digitCount = cleaned.replace(/\D/g, '').length;
        setPhoneValid(digitCount >= 11);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const { valid, error: validationError } = validateImageFile(file);
            if (!valid) {
                showNotify(validationError || 'Archivo no válido', 'error');
                e.target.value = '';
                return;
            }
            if (receiptPreview) URL.revokeObjectURL(receiptPreview);
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };

    const removeReceipt = () => {
        setReceiptFile(null);
        setReceiptPreview(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    };

    // --- LÓGICA DEL CARRITO ---
    const addItem = useCallback((product) => {
        setManualOrder(prev => {
            const currentItems = prev.items || [];
            const exists = currentItems.find(i => i.id === product.id);
            let newItems;

            if (exists) {
                if (exists.quantity >= 20) return prev;
                newItems = currentItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                newItems = [...currentItems, {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    has_discount: product.has_discount,
                    discount_price: product.discount_price,
                    image_url: product.image_url,
                    description: product.description,
                    quantity: 1
                }];
            }
            // Recalcular total
            const newTotal = Math.round(newItems.reduce((acc, i) => acc + (getPrice(i) * i.quantity), 0));
            const newState = { ...prev, items: newItems, total: newTotal };
            return newState;
        });
    }, [getPrice]);

    const updateQuantity = useCallback((itemId, change) => {
        setManualOrder(prev => {
            const item = prev.items.find(i => i.id === itemId);
            if (!item) return prev;

            if (change > 0 && item.quantity >= 20) return prev;

            let newItems;
            if (item.quantity + change < 1) {
                // Opción: No bajar de 1 (usar botón eliminar para eso)
                newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity: 1 } : i);
            } else {
                newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity + change } : i);
            }

            const newTotal = Math.round(newItems.reduce((acc, i) => acc + (getPrice(i) * i.quantity), 0));
            return { ...prev, items: newItems, total: newTotal };
        });
    }, [getPrice]);

    const removeItem = useCallback((itemId) => {
        setManualOrder(prev => {
            const newItems = prev.items.filter(i => i.id !== itemId);
            const newTotal = Math.round(newItems.reduce((acc, i) => acc + (getPrice(i) * i.quantity), 0));
            return { ...prev, items: newItems, total: newTotal };
        });
    }, [getPrice]);

    const resetOrder = useCallback(() => {
        setManualOrder(initialOrderState);
        setReceiptFile(null);
        setReceiptPreview(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setRutValid(null);
        setPhoneValid(null);
    }, []);

    // --- ENVÍO ---
    const submitOrder = async () => {
        if (!branch) {
            showNotify('Error: No hay sucursal seleccionada', 'error');
            return;
        }

        const sanitizeInput = (text) => text ? text.replace(/<[^>]*>?/gm, "").trim() : "";

        const digitCount = (manualOrder.client_phone || '').replace(/\D/g, '').length;
        if (!manualOrder.client_name || manualOrder.client_name.trim().length < 3 || digitCount < 11 || manualOrder.items.length === 0) {
            showNotify('Faltan datos obligatorios o son incorrectos', 'error');
            return;
        }
        if (!manualOrder.client_rut || !validateRut(manualOrder.client_rut)) {
            showNotify('El RUT ingresado no es válido', 'error');
            return;
        }
        if (manualOrder.payment_type === 'online' && !receiptFile) {
            showNotify('Falta el comprobante de transferencia', 'error');
            return;
        }

        setLoading(true);
        try {
            const sanitizedOrder = {
                ...manualOrder,
                client_name: sanitizeInput(manualOrder.client_name),
                client_phone: sanitizeInput(manualOrder.client_phone),
                client_rut: sanitizeInput(manualOrder.client_rut),
                note: sanitizeInput(manualOrder.note),
                branch_id: branch.id,
                company_id: branch.company_id,
                branch_name: branch.name
            };

            const itemsForOrder = (sanitizedOrder.items || []).map((item) => ({
                id: item.id,
                name: String(item.name ?? ''),
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
                has_discount: Boolean(item.has_discount),
                discount_price: item.has_discount && item.discount_price != null ? Number(item.discount_price) : null,
                description: item.description ? String(item.description) : null
            }));

            const totalForOrder = itemsForOrder.reduce((acc, i) => {
                const unit = i.has_discount && i.discount_price && Number(i.discount_price) > 0 ? Number(i.discount_price) : Number(i.price);
                return acc + (unit * i.quantity);
            }, 0);

            sanitizedOrder.items = itemsForOrder;
            sanitizedOrder.total = totalForOrder;

            // Aquí llamamos a tu servicio existente
            const { order } = await createManualOrder(sanitizedOrder, receiptFile);

            // [FIX] Registrar venta en caja si existe la función
            if (order && registerSale) {
                await registerSale(order);
            }

            showNotify('Pedido creado con éxito', 'success');
            resetOrder();
            if (onOrderSaved) onOrderSaved();
            if (onClose) onClose();

        } catch (error) {
            showNotify(error.message || 'Error al crear pedido', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isValid = useMemo(() => {
        return manualOrder.client_name && manualOrder.items.length > 0;
    }, [manualOrder]);

    const getInputStyle = (isValid) => {
        if (isValid === true) return { borderColor: '#25d366', boxShadow: '0 0 0 1px #25d366' };
        if (isValid === false) return { borderColor: '#ff4444', boxShadow: '0 0 0 1px #ff4444' };
        return {};
    };

    return {
        manualOrder,
        loading,
        rutValid,
        phoneValid,
        receiptFile,
        receiptPreview,
        updateClientName,
        updateNote,
        updatePaymentType,
        handleRutChange,
        handlePhoneChange,
        handleFileChange,
        removeReceipt,
        addItem,
        updateQuantity,
        removeItem,
        submitOrder,
        isValid,
        getInputStyle
    };
};