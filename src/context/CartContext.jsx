import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // 1. ESTADO INICIAL
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  // 2. PRECIOS
  const getPrice = (product) => {
    if (product.discount_price && parseInt(product.discount_price) > 0) {
      return parseInt(product.discount_price);
    }
    return parseInt(product.price);
  };

  // 3. ACCIONES
  const toggleCart = () => setIsCartOpen(prev => !prev);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const decreaseQuantity = (productId) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(0, item.quantity - 1) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };
  
  const clearCart = () => {
    setCart([]);
    setOrderNote('');
  };

  // 4. TOTALES
  const cartTotal = cart.reduce((acc, item) => acc + (getPrice(item) * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // 5. GENERADOR DE MENSAJE (CORREGIDO: SOLO TEXTO SIMPLE)
  const generateWhatsAppMessage = () => {
    if (cart.length === 0) return '';

    let message = '';
    // Usamos asteriscos y guiones simples que nunca fallan
    message += '*NUEVO PEDIDO WEB - OISHI*\n'; 
    message += '================================\n\n';

    cart.forEach(item => {
      const price = getPrice(item);
      const subtotal = price * item.quantity;
      
      // Formato simple: 2 x NOMBRE
      message += `+ ${item.quantity} x ${item.name.toUpperCase()}\n`;
      message += `   Subtotal: $${subtotal.toLocaleString('es-CL')}\n`;
      message += '--------------------------------\n';
    });

    message += '\n*TOTAL A PAGAR: $' + cartTotal.toLocaleString('es-CL') + '*\n';
    message += '================================\n';

    if (orderNote.trim()) {
      message += '\nNOTA DE COCINA:\n';
      message += `${orderNote}\n`;
    }

    return encodeURIComponent(message);
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      isCartOpen, 
      toggleCart, 
      addToCart, 
      decreaseQuantity, 
      removeFromCart, 
      clearCart,
      cartTotal, 
      totalItems, 
      getPrice,
      orderNote, 
      setOrderNote,
      generateWhatsAppMessage 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);