import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { routes } from "../router";
import { BusinessProvider } from "../../context/BusinessContext";

// Assets
import menuPattern from "../../assets/menu-pattern.webp";

// Cart Components
import CartFloat from "../../features/cart/components/CartFloat";
import CartModal from "../../features/cart/components/CartModal";

// Componente Interno que maneja la lógica Anti-Zoom y UI Global con contexto de Router
function InnerApp() {
  const location = useLocation();
  const showCartUI = location.pathname === '/menu';
  const [scrollY, setScrollY] = useState(0);

  // Efecto Parallax Suave para el fondo
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Efecto "Anti-Zoom" Robusto (RESTAURADO A ESTADO ESTABLE)
  useEffect(() => {
    const handleVisualLock = () => {
      const contentLayer = document.getElementById('app-content-layer');
      const uiLayer = document.getElementById('app-ui-layer');

      if (!contentLayer || !uiLayer) return;

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && isTouchDevice;

      // RESTAURAMOS LA GUARDIA: No aplicar zoom forzado en Móviles ni iPads
      // Estos dispositivos ya manejan su propio escalado de forma óptima
      if (!isIPad && !isTouchDevice) { 
        const dpr = window.devicePixelRatio || 1;
        const inverseScale = 1 / dpr;

        document.body.style.zoom = inverseScale;

        if (typeof document.body.style.zoom === 'undefined' || document.body.style.zoom === '') {
          const transformProps = `scale(${inverseScale})`;
          const originProps = 'top left';
          const widthProps = `${dpr * 100}vw`;
          const heightProps = `${dpr * 100}vh`;

          contentLayer.style.transform = transformProps;
          contentLayer.style.transformOrigin = originProps;
          contentLayer.style.width = widthProps;
          contentLayer.style.minHeight = heightProps;

          uiLayer.style.transform = transformProps;
          uiLayer.style.transformOrigin = originProps;
          uiLayer.style.width = widthProps;
          uiLayer.style.height = heightProps;
        } else {
          contentLayer.style.transform = '';
          contentLayer.style.width = '100%';
          contentLayer.style.height = '';
          contentLayer.style.overflowY = '';

          uiLayer.style.transform = '';
          uiLayer.style.width = '100%';
          uiLayer.style.height = '100%';
        }

        uiLayer.style.position = 'fixed';
        uiLayer.style.top = '0';
        uiLayer.style.left = '0';
        uiLayer.style.pointerEvents = 'none';
        uiLayer.style.zIndex = '9999';

        document.body.style.overflowX = 'hidden';
      } else {
        // RESET TOTAL PARA MÓVILES (IPHONE/ANDROID)
        document.body.style.zoom = '';
        document.body.style.overflowX = '';

        if (contentLayer) {
          contentLayer.style.transform = '';
          contentLayer.style.transformOrigin = '';
          contentLayer.style.width = '';
          contentLayer.style.height = '';
          contentLayer.style.minHeight = '';
        }

        if (uiLayer) {
          uiLayer.style.transform = '';
          uiLayer.style.transformOrigin = '';
          uiLayer.style.position = 'fixed';
          uiLayer.style.width = '100%';
          uiLayer.style.height = '100%';
          uiLayer.style.pointerEvents = 'none';
          uiLayer.style.zIndex = '9999';
        }
      }
    };

    window.addEventListener('resize', handleVisualLock);
    handleVisualLock();

    return () => window.removeEventListener('resize', handleVisualLock);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* CAPA DE FONDO MAESTRA CON PARALLAX */}
      <div 
        className="app-bg-layer" 
        style={{ 
          position: 'fixed',
          inset: '-50% -20%', 
          zIndex: 0,
          backgroundImage: `url(${menuPattern})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '1200px', 
          opacity: 0.5,
          filter: 'brightness(0.18) blur(3px)',
          transform: `translateY(${-scrollY * 0.1}px)`,
          transition: 'transform 0.1s ease-out',
          pointerEvents: 'none',
          willChange: 'transform'
        }}
      ></div>

      {/* Capa de Contenido Principal (Scrollable) */}
      <div 
        id="app-content-layer" 
        className="app-wrapper" 
        style={{ 
          position: 'relative',
          zIndex: 1,
          background: 'transparent' 
        }}
      >
        <Routes>{routes}</Routes>
      </div>

      {/* Capa de UI Flotante */}
      <div id="app-ui-layer" style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }}>
        <div id="navbar-portal-root" style={{ pointerEvents: 'auto', width: '100%' }}></div>
        {showCartUI && (
          <div style={{ pointerEvents: 'auto' }}>
            <CartFloat />
            <CartModal />
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BusinessProvider>
      <Router>
        <InnerApp />
      </Router>
    </BusinessProvider>
  );
}

export default App;
