# Tenant Kit (UI modular)

Este kit contiene los componentes y estilos del template base, listos para ser adaptados por cliente.

Estructura
- components/shared: Home, Navbar, BranchSelectorModal, ContactBranchModal
- features: admin, auth, cart, orders, products
- styles: CSS de cada modulo (home, menu, admin, cart, modales)
- assets: logo-placeholder.svg

Puntos de edicion por cliente
- Nombre del local: `businessInfo.name`
- Logo: `assets/logo-placeholder.svg` (reemplazar por logo real)
- Colores: variables `--tenant-primary` y `--tenant-secondary` (ver `src/index.css`)
- Textos de WhatsApp/recibos: `features/cart` y `features/admin/utils/receiptPrinting.js`

Nota
- Este kit es una copia para organizacion. No altera el runtime actual.
