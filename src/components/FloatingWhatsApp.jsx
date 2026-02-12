import React from 'react';
import { MessageCircle } from 'lucide-react';

const FloatingWhatsApp = ({ phoneNumber = '56912345678', message = 'Hola! Me gustaría hacer un pedido.' }) => {
  const handleClick = () => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <button onClick={handleClick} className="whatsapp-float glass">
      <MessageCircle size={28} color="white" fill="white" />
      <span className="tooltip">Hacer Pedido</span>
      
      <style jsx>{`
        .whatsapp-float {
          position: fixed;
          bottom: 25px;
          right: 25px;
          width: 60px;
          height: 60px;
          background-color: #25d366;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
          border: none;
          cursor: pointer;
          z-index: 1000;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .whatsapp-float:hover {
          transform: scale(1.1) rotate(5deg);
        }

        .whatsapp-float:active {
          transform: scale(0.9);
        }

        .tooltip {
          position: absolute;
          right: 75px;
          background: var(--bg-tertiary);
          color: white;
          padding: 8px 15px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          box-shadow: var(--shadow-md);
        }

        .whatsapp-float:hover .tooltip {
          opacity: 1;
        }

        .whatsapp-float::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: #25d366;
          opacity: 0.4;
          z-index: -1;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.4; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </button>
  );
};

export default FloatingWhatsApp;
