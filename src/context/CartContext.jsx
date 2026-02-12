import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Crear el contexto
const CartContext = createContext();

// 2. Crear el proveedor (la "nube" que envuelve la app)
export const CartProvider = ({ children }) => {
  // Intentamos leer del localStorage para no perder el pedido si recargan la página
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('sushi_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      return [];
    }
  });

  // Cada vez que el carrito cambie, lo guardamos en localStorage
  useEffect(() => {
    localStorage.setItem('sushi_cart', JSON.stringify(cart));
  }, [cart]);

  // Función para agregar producto
  const addToCart = (product) => {
    setCart(prevCart => {
      // ¿Ya existe este producto en el carrito?
      const existingItem = prevCart.find(item => item.id === product.id);

      if (existingItem) {
        // Si existe, sumamos 1 a la cantidad
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Si no existe, lo agregamos con cantidad 1
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Función para quitar producto (o restar cantidad)
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  
  // Limpiar carrito
  const clearCart = () => setCart([]);

  // Calcular total (para mostrarlo en el botón de WhatsApp)
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Generar mensaje para WhatsApp
  const generateWhatsAppMessage = () => {
    if (cart.length === 0) return "Hola! Me gustaría ver el menú.";
    
    let message = "Hola! Me gustaría pedir lo siguiente:%0A"; // %0A es salto de línea
    cart.forEach(item => {
      message += `- ${item.quantity}x ${item.name} ($${item.price * item.quantity})%0A`;
    });
    message += `%0A*Total: $${total.toLocaleString('es-CL')}*`;
    message += "%0A%0A¿Cuánto demora el delivery?";
    
    return message;
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      clearCart, 
      total,
      generateWhatsAppMessage 
    }}>
      {children}
    </CartContext.Provider>
  );
};

// 3. Hook personalizado para usar el carrito fácil
export const useCart = () => useContext(CartContext);