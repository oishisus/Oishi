import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="app-wrapper">
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

          {/* Elementos Flotantes Globales */}
          <CartFloat />
          <CartModal />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
