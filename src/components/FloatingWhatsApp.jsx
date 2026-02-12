import React from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const FloatingWhatsApp = ({ phoneNumber = '56976645547' }) => {
  const { total, totalItems, generateWhatsAppMessage } = useCart();

  const handleClick = () => {
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <button 
      onClick={handleClick} 
      className={`whatsapp-float glass ${totalItems > 0 ? 'has-items' : ''}`}
      aria-label="Hacer pedido por WhatsApp"
    >
      {totalItems > 0 ? (
        <ShoppingBag size={24} color="white" />
      ) : (
        <MessageCircle size={28} color="white" fill="white" />
      )}
      
      {totalItems > 0 && (
        <span className="badge-count animate-bounce">{totalItems}</span>
      )}

      <span className="tooltip">
        {totalItems > 0 ? `Pedir: $${total.toLocaleString('es-CL')}` : 'Hacer Pedido'}
      </span>
    </button>
  );
};

export default FloatingWhatsApp;