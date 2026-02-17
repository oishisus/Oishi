import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/layout/App.jsx'
import './index.css'
import { CartProvider } from './app/providers/CartProvider'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>,
)