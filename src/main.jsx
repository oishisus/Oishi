import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// 1. IMPORTANTE: Importamos el proveedor del carrito
import { CartProvider } from './context/CartContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Envolvemos toda la App con el CartProvider */}
    {/* Así, cualquier componente dentro de App podrá leer y escribir en el carrito */}
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
)