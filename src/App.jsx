import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { BusinessProvider } from "./context/BusinessContext";

// Páginas
import Home from "./shared/components/Home";
import Menu from "./features/products/pages/Menu";
import Admin from "./features/admin/pages/Admin";
import Login from "./features/auth/pages/Login";

// Assets
import menuPattern from "./assets/menu-pattern.webp";

// Componentes Globales
import ProtectedRoute from "./shared/components/ProtectedRoute";
import CartFloat from "./features/cart/components/CartFloat";
import CartModal from "./features/cart/components/CartModal";

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
      // [FIX] Simplificado: Si NO es móvil (touch), aplicamos el bloqueo FUERTE
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
    // Re-aplicar al cambiar de ruta para asegurar consistencia
    return () => window.removeEventListener('resize', handleVisualLock);
  }, [location.pathname]); // [FIX] Seguir cambios de ruta

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%', background: '#0a0a0a' }}>
      {/* CAPA DE FONDO MAESTRA (Dinámica según ruta) */}
      <div 
        className="app-bg-layer" 
        style={
          location.pathname === '/' 
            ? {
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                backgroundImage: 'url("https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 1,
                filter: 'none', // Sin blur en Home para nitidez
                transform: 'none', // Sin parallax en Home para estabilidad
                pointerEvents: 'none'
              }
            : { 
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
              }
        }
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/login" element={<Login />} />

          {/* Ruta Protegida para Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
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
      <CartProvider>
        <Router>
          <InnerApp />
        </Router>
      </CartProvider>
    </BusinessProvider>
  );
}

export default App;
