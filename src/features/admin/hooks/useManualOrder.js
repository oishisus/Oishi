import { useState, useCallback, useMemo } from 'react';
import { formatRut } from '../../../shared/utils/formatters';
import { createManualOrder } from '../../orders/services/orders';

const initialOrderState = {
    client_name: '',
    client_rut: '',
    client_phone: '',
    items: [],
    total: 0,
    payment_type: 'tienda',
    note: ''
};

export const useManualOrder = (showNotify, onOrderSaved, onClose) => {
    // --- ESTADOS DE DATOS ---
    // Usar lazy initialization para evitar reset
    const [manualOrder, setManualOrder] = useState(() => initialOrderState);
    const [loading, setLoading] = useState(false);

    // --- ESTADOS DE VALIDACIÓN Y ARCHIVOS ---
    const [rutValid, setRutValid] = useState(null);
    const [phoneValid, setPhoneValid] = useState(null);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);

    // --- MANEJADORES DE FORMULARIO ---
    const updateClientName = (val) => setManualOrder(prev => ({ ...prev, client_name: val }));
    const updateNote = (val) => setManualOrder(prev => ({ ...prev, note: val }));

    const updatePaymentType = (type) => {
        setManualOrder(prev => ({ ...prev, payment_type: type }));
        // Si cambia a efectivo, limpiamos la foto
        if (type !== 'online') {
            setReceiptFile(null);
            setReceiptPreview(null);
        }
    };

    const handleRutChange = (e) => {
        const formatted = formatRut(e.target.value);
        setManualOrder(prev => ({ ...prev, client_rut: formatted }));
        setRutValid(formatted.length >= 8);
    };

    const handlePhoneChange = (e) => {
        let input = e.target.value;
        if (!input.startsWith("+56 9")) input = "+56 9 ";
        const numbersOnly = input.replace(/[^0-9+ ]/g, '');
        setManualOrder(prev => ({ ...prev, client_phone: numbersOnly }));
        const digitCount = numbersOnly.replace(/\D/g, '').length;
        setPhoneValid(digitCount >= 11);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };

    const removeReceipt = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
    };

    // --- LÓGICA DEL CARRITO ---
    const addItem = useCallback((product) => {
        setManualOrder(prev => {
            const currentItems = prev.items || [];
            const exists = currentItems.find(i => i.id === product.id);
            let newItems;

            if (exists) {
                newItems = currentItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                newItems = [...currentItems, {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    quantity: 1
                }];
            }
            // Recalcular total
            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const newState = { ...prev, items: newItems, total: newTotal };
            return newState;
        });
    }, []);

    const updateQuantity = useCallback((itemId, change) => {
        setManualOrder(prev => {
            const item = prev.items.find(i => i.id === itemId);
            if (!item) return prev;

            let newItems;
            if (item.quantity + change < 1) {
                // Opción: No bajar de 1 (usar botón eliminar para eso)
                newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity: 1 } : i);
            } else {
                newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity + change } : i);
            }

            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            return { ...prev, items: newItems, total: newTotal };
        });
    }, []);

    const removeItem = useCallback((itemId) => {
        setManualOrder(prev => {
            const newItems = prev.items.filter(i => i.id !== itemId);
            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            return { ...prev, items: newItems, total: newTotal };
        });
    }, []);

    const resetOrder = useCallback(() => {
        setManualOrder(initialOrderState);
        setReceiptFile(null);
        setReceiptPreview(null);
        setRutValid(null);
        setPhoneValid(null);
    }, []);

    // --- ENVÍO ---
    const submitOrder = async () => {
        if (!manualOrder.client_name || !manualOrder.client_phone || manualOrder.items.length === 0) {
            showNotify('Faltan datos obligatorios', 'error');
            return;
        }
        if (manualOrder.payment_type === 'online' && !receiptFile) {
            showNotify('Falta el comprobante', 'error');
            return;
        }

        setLoading(true);
        try {
            // Aquí llamamos a tu servicio existente
            await createManualOrder(manualOrder, receiptFile);

            showNotify('Pedido creado con éxito', 'success');
            resetOrder();
            if (onOrderSaved) onOrderSaved();
            if (onClose) onClose();

        } catch (error) {
            console.error(error);
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