import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, MessageCircle, Instagram, MapPin, Settings } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const buttons = [
    {
      label: "Ver Menú Digital",
      icon: <Utensils size={24} />,
      onClick: () => navigate("/menu"),
      primary: true,
    },
    {
      label: "Escríbeme por WhatsApp",
      icon: <MessageCircle size={24} />,
      onClick: () => window.open("https://wa.me/yournumber", "_blank"),
      primary: false,
    },
    {
      label: "Sígueme en Instagram",
      icon: <Instagram size={24} />,
      onClick: () => window.open("https://instagram.com/yourprofile", "_blank"),
      primary: false,
    },
    {
      label: "Cómo llegar",
      icon: <MapPin size={24} />,
      onClick: () => window.open("https://maps.google.com", "_blank"),
      primary: false,
    },
  ];

  return (
    <div className="home-container animate-fade">
      <div className="home-overlay"></div>

      <main className="home-content container">
        <header className="home-header">
          <div className="logo-placeholder">
            <h1>OISHI</h1>
            <span>SUSHI & COCKTAIL</span>
          </div>
          <p className="home-tagline">Sabor auténtico en cada pieza</p>
        </header>

        <nav className="home-nav">
          {buttons.map((btn, index) => (
            <button
              key={index}
              onClick={btn.onClick}
              className={`btn ${btn.primary ? "btn-primary" : "btn-secondary glass"} w-full`}
              style={{ width: "100%", marginBottom: "15px" }}
            >
              <span className="btn-icon">{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => navigate('/admin')}
          className="admin-access-btn"
          title="Configuración"
        >
          <Settings size={14} />
        </button>
      </main>

      <style jsx>{`
        .home-container {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: url("https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000");
          background-size: cover;
          background-position: center;
        }

        .home-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.6),
            rgba(0, 0, 0, 0.9)
          );
          z-index: 1;
        }

        .home-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding-bottom: 50px;
        }

        .home-header {
          margin-bottom: 40px;
        }

        .logo-placeholder {
          margin-bottom: 10px;
        }

        .logo-placeholder h1 {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -2px;
          margin: 0;
          color: var(--text-primary);
        }

        .logo-placeholder span {
          color: var(--accent-primary);
          font-weight: 600;
          letter-spacing: 4px;
          font-size: 0.9rem;
        }

        .home-tagline {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin-top: 10px;
        }

        .home-nav {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .admin-access-btn {
          position: fixed;
          bottom: 15px;
          right: 15px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: var(--text-muted);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
          z-index: 100;
        }

        .admin-access-btn:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-secondary);
          transform: rotate(30deg);
        }

        .btn-icon {
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default Home;
