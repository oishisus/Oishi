import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. IMPORTANTE: Importar el proveedor del carrito
import { CartProvider } from './context/CartContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. IMPORTANTE: El CartProvider debe abrazar a la App */}
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>,
)