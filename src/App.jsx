import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";

// Páginas
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

// Componentes Globales
import ProtectedRoute from "./components/ProtectedRoute";
import CartFloat from "./components/CartFloat";
import CartModal from "./components/CartModal";

// Componente Interno que maneja la lógica Anti-Zoom y UI Global con contexto de Router
function InnerApp() {
  const location = useLocation();
  const showCartUI = location.pathname === '/menu';

  // Efecto "Anti-Zoom" Robusto (RESTAURADO)
  React.useEffect(() => {
    const handleVisualLock = () => {
      const contentLayer = document.getElementById('app-content-layer');
      const uiLayer = document.getElementById('app-ui-layer');

      if (!contentLayer || !uiLayer) return;

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      // Detección específica para iPad que reporta ser Mac
      const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && isTouchDevice;

      // Bajamos el umbral a 100px para que aguante cualquier nivel de zoom sin desactivarse explorando
      if (window.screen.width >= 100 && !isIPad && !isTouchDevice) {
        const dpr = window.devicePixelRatio || 1;
        const inverseScale = 1 / dpr;

        // ESTRATEGIA: ZOOM NATIVO (Chrome/Edge/Safari Desktop)
        document.body.style.zoom = inverseScale;

        // Fallback para Firefox (Tu lógica original con transform)
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
          // Limpieza y ajuste de dimensiones para Zoom Nativo
          // A 500% zoom, 100% de ancho es insuficiente o errático. Ajustamos al ancho virtual.
          const widthProps = `${dpr * 100}vw`;
          const heightProps = `${dpr * 100}vh`;

          contentLayer.style.transform = '';
          contentLayer.style.width = widthProps;
          contentLayer.style.height = '';
          contentLayer.style.overflowY = '';

          uiLayer.style.transform = '';
          uiLayer.style.width = widthProps;
          uiLayer.style.height = heightProps;
        }

        // Ajustes de capa UI
        uiLayer.style.position = 'fixed';
        uiLayer.style.top = '0';
        uiLayer.style.left = '0';
        // width/height ya definidos arriba para mayor precisión
        uiLayer.style.pointerEvents = 'none';
        uiLayer.style.zIndex = '9999';

        document.body.style.overflowX = 'hidden';
      } else {
        // Reset para Móviles e iPads
        document.body.style.zoom = '';
        document.body.style.overflowX = '';

        if (contentLayer) {
          contentLayer.style.transform = '';
          contentLayer.style.transformOrigin = '';
          contentLayer.style.width = '';
          contentLayer.style.height = '';
          contentLayer.style.minHeight = '';
          contentLayer.style.overflowY = '';
        }

        if (uiLayer) {
          uiLayer.style.transform = '';
          uiLayer.style.transformOrigin = '';
          uiLayer.style.position = 'fixed';
          uiLayer.style.top = '0';
          uiLayer.style.left = '0';
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
    <>
      {/* Capa de Contenido Principal (Scrollable) */}
      <div id="app-content-layer" className="app-wrapper">
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

      {/* Capa de UI Flotante (Fuera del flujo del contenido) */}
      <div id="app-ui-layer">
        {/* Portal para Navbar (Siempre disponible por si el Menu lo requiere) */}
        <div id="navbar-portal-root" style={{ pointerEvents: 'auto', width: '100%' }}></div>

        {/* Elementos del Carrito (Render condicional solo en /menu) */}
        {showCartUI && (
          <div style={{ pointerEvents: 'auto' }}>
            <CartFloat />
            <CartModal />
          </div>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <CartProvider>
      <Router>
        <InnerApp />
      </Router>
    </CartProvider>
  );
}

export default App;
