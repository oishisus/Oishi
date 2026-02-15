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

  // Efecto "Anti-Zoom" Robusto
  React.useEffect(() => {
    const handleVisualLock = () => {
      const contentLayer = document.getElementById('app-content-layer');
      const uiLayer = document.getElementById('app-ui-layer');

      if (!contentLayer || !uiLayer) return;

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (window.screen.width >= 1024 && !isTouchDevice) {
        const dpr = window.devicePixelRatio || 1;
        const inverseScale = 1 / dpr;

        // ESTRATEGIA: ZOOM NATIVO (Chrome/Edge/Safari)
        // Esto evita que la barra de scroll se escale monstruosamente con transform.
        document.body.style.zoom = inverseScale;

        // Fallback para Firefox (No soporta zoom)
        if (typeof document.body.style.zoom === 'undefined' || document.body.style.zoom === '') {
          // Solo en Firefox usamos transform, aceptando que la scrollbar podría verse rara
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
          // Limpieza si usamos zoom
          contentLayer.style.transform = '';
          contentLayer.style.width = '';
          contentLayer.style.height = '';
          contentLayer.style.overflowY = '';

          uiLayer.style.transform = '';
          uiLayer.style.width = '';
          uiLayer.style.height = '';
        }

        // Ajustes UI Layer fijos
        uiLayer.style.position = 'fixed';
        uiLayer.style.top = '0';
        uiLayer.style.left = '0';
        uiLayer.style.width = '100%';
        uiLayer.style.height = '100%';
        uiLayer.style.pointerEvents = 'none';
        uiLayer.style.zIndex = '9999';

        document.body.style.overflowX = 'hidden';
      } else {
        // Reset Mobile (Pero manteniendo UI Layer fija para Navbar/Cart)
        document.body.style.zoom = '';
        document.body.style.overflowX = '';

        // Reset Contenido (Flujo normal)
        if (contentLayer) {
          contentLayer.style.transform = '';
          contentLayer.style.transformOrigin = '';
          contentLayer.style.width = '';
          contentLayer.style.height = '';
          contentLayer.style.minHeight = '';
          contentLayer.style.overflowY = '';
        }

        // Reset UI Layer (Sin transform, pero SIGUE SIENDO OVERLAY)
        if (uiLayer) {
          uiLayer.style.transform = '';
          uiLayer.style.transformOrigin = '';
          // Aseguramos que siga cubriendo la pantalla para los portales
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
