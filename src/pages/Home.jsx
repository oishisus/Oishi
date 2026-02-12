import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, MessageCircle, Instagram, MapPin, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; 
import logo from '../assets/logo.png'; 

const Home = () => {
  const navigate = useNavigate();
  
  // Genera automáticamente la URL del menú basada en donde estés alojado
  const menuUrl = `${window.location.origin}/menu`;

  const buttons = [
    { label: "Ver Menú Digital", icon: <Utensils size={20} />, onClick: () => navigate("/menu"), primary: true },
    { label: "WhatsApp", icon: <MessageCircle size={20} />, onClick: () => window.open("https://wa.me/56976645547", "_blank") },
    { label: "Instagram", icon: <Instagram size={20} />, onClick: () => window.open("https://instagram.com/oishi.sushi.stg", "_blank") },
    { label: "Ubicación", icon: <MapPin size={20} />, onClick: () => window.open("https://maps.google.com/?q=Oishi+Sushi+Santiago", "_blank") },
  ];

  return (
    <div className="home-container animate-fade">
      {/* Botón de Login/Admin con alta prioridad de click */}
        <button 
          onClick={() => navigate('/login')} 
          className="settings-btn" 
          title="Admin Login"
        >
          <Settings size={20} />
        </button>

      {/* Capa de fondo para contraste */}
      <div className="home-overlay"></div>

      <main className="home-content container">
        <div className="ticket-wrapper">
          
          {/* LADO IZQUIERDO: Branding y Botones (Simetría Total) */}
          <div className="ticket-main">
            <header className="home-header-centered">
              <div className="brand-container-centered">
                <img src={logo} alt="Oishi Sushi Logo" className="home-logo-centered" />
                <div className="brand-text-centered">
                  <h1 className="text-gradient">OISHI</h1>
                  <span className="brand-subtitle">SUSHI & COCKTAIL</span>
                </div>
              </div>
              <p className="home-tagline">Sabor auténtico en cada pieza</p>
            </header>

            <nav className="home-nav-grid">
              {buttons.map((btn, index) => (
                <button
                  key={index}
                  onClick={btn.onClick}
                  className={`btn ${btn.primary ? "btn-primary" : "btn-secondary glass"}`}
                >
                  <span className="btn-icon">{btn.icon}</span>
                  <span className="btn-label">{btn.label}</span>
                </button>
              ))}
            </nav>
            
            <div className="ticket-stub-line"></div>
          </div>

          {/* LADO DERECHO: QR Stub (Boleto) */}
          <div className="ticket-stub">
            <div className="stub-content">
              <div className="stub-badge">ACCESO DIGITAL</div>
              
              <div className="qr-box">
                <QRCodeSVG 
                  value={menuUrl} 
                  size={130} 
                  level={"H"} 
                  includeMargin={false}
                />
              </div>

              <div className="stub-footer">
                <p className="stub-scan-text">ESCANEAME</p>
                <span className="stub-info">PASAPORTE AL SABOR</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;