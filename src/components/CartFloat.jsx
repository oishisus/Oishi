import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CartFloat = () => {
  const { totalItems, cartTotal, toggleCart } = useCart();
  const hasItems = totalItems > 0;

  // Opcional: Si quieres que el botón desaparezca cuando está vacío, descomenta la siguiente línea:
  // if (!hasItems) return null; 

  return (
    <button 
      onClick={toggleCart} 
      // IMPORTANTE: Aquí usamos 'cart-float' para que tome el CSS rojo nuevo
      className={`cart-float ${hasItems ? 'has-items animate-bounce-in' : ''}`}
    >
      <ShoppingBag size={24} strokeWidth={2.5} />
      
      {/* El contador solo se muestra si hay items */}
      {hasItems && (
        <span className="cart-float-badge">{totalItems}</span>
      )}

      {/* Tooltip con el precio */}
      <div className="cart-float-tooltip">
        {hasItems ? `Total: $${cartTotal.toLocaleString('es-CL')}` : 'Ver Bandeja'}
      </div>
    </button>
  );
};

export default CartFloat;