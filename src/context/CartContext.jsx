import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('sushi_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    localStorage.setItem('sushi_cart', JSON.stringify(cart));
  }, [cart]);

  const getPrice = (product) => {
    if (product.discount_price && product.discount_price > 0) {
      return parseInt(product.discount_price);
    }
    return parseInt(product.price);
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

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

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
  
  const clearCart = () => {
    setCart([]);
    setOrderNote('');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (getPrice(item) * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // --- GENERADOR DE MENSAJE TIPO TICKET ---
  const generateWhatsAppMessage = () => {
    if (cart.length === 0) return;

    // Emojis iOS/Unicode estándar para WhatsApp
    const sushi = '\uD83C\uDF63'; // 🍣
    const box = '\uD83D\uDCE6'; // 📦
    const tag = '\uD83C\uDFF7️'; // 🏷️
    const money = '\uD83D\uDCB0'; // 💰
    const note = '\uD83D\uDCDD'; // 📝
    const pin = '\uD83D\uDCCD'; // 📍

    let message = `${sushi} *NUEVO PEDIDO WEB OISHI* ${sushi}\n`;
    message += `───────────────\n`;

    cart.forEach(item => {
      const price = getPrice(item);
      const subtotal = price * item.quantity;
      message += `${box} *${item.quantity}x ${item.name}*\n`;
      if (item.discount_price && item.discount_price < item.price) {
        message += `   ${tag} _(Oferta: $${price.toLocaleString('es-CL')})_\n`;
      }
      message += `   💲 Subtotal: $${subtotal.toLocaleString('es-CL')}\n\n`;
    });

    message += `───────────────\n`;

    if (orderNote.trim()) {
      message += `${note} *Nota:* ${orderNote}\n`;
      message += `───────────────\n`;
    }

    message += `${money} *TOTAL: $${cartTotal.toLocaleString('es-CL')}*\n`;
    message += `───────────────\n\n`;
    message += `${pin} *Mis datos de envío:*\n(Escribe aquí tu dirección)`;

    return encodeURIComponent(message);
  };

  return (
    <CartContext.Provider value={{ 
      cart, isCartOpen, toggleCart, 
      addToCart, decreaseQuantity, removeFromCart, clearCart,
      cartTotal, totalItems, getPrice,
      orderNote, setOrderNote,
      generateWhatsAppMessage 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);