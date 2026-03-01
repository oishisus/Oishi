import React, { memo } from 'react';
import { Eye, EyeOff, Trash, Edit3 } from 'lucide-react';
import logo from '../../../assets/logo.png';
import '../../../styles/InventoryCard.css';

// Usamos memo para que SOLO se re-renderice si cambian las props de ESTE producto
const InventoryCard = memo(({ product, toggleProductActive, setEditingProduct, setIsModalOpen, deleteProduct, viewMode = 'grid' }) => {

    // Manejadores de eventos limpios para evitar lógica en el JSX
    const handleEditClick = () => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleToggleClick = (e) => {
        e.stopPropagation(); // Detener burbujeo crítico
        toggleProductActive(product, e);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation(); // Detener burbujeo crítico
        deleteProduct(product.id);
    };

    // Manejo seguro de imagen rota (evita bucles infinitos)
    const handleImageError = (e) => {
        e.target.onerror = null; // Previene bucle si el logo también falla
        e.target.src = logo;
    };

    // Manejo de teclado para accesibilidad (Enter para editar)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleEditClick();
        }
    };

    return (
        <div 
            className={`inventory-card glass ${!product.is_active ? 'inactive' : ''} ${viewMode === 'list' ? 'list-view' : ''}`}
            onClick={handleEditClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0} // Hace que el div sea "enfocable" con Tab
            aria-label={`Editar producto ${product.name}`}
        >
            {/* --- IMAGEN --- */}
            <div className="inv-img-wrapper">
                <img 
                    src={product.image_url || logo} 
                    alt={product.name} 
                    onError={handleImageError} 
                    loading="lazy" // Mejora rendimiento en listas largas
                />
                
                {/* Botón Flotante de Estado (Solo en Grid) */}
                {viewMode === 'grid' && (
                    <button 
                        className={`inv-status-toggle ${product.is_active ? 'on' : 'off'}`} 
                        onClick={handleToggleClick}
                        title={product.is_active ? "Pausar venta" : "Activar venta"}
                    >
                        {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                )}
            </div>

            <div className="inv-info">
                <div className="inv-header">
                    <div className="inv-title-row">
                        <h4>{product.name}</h4>
                        {product.is_special && <span className="badge-special">⭐ Especial</span>}
                    </div>
                    
                    <div className="price-container">
                        {product.has_discount && product.discount_price ? (
                            <>
                                <span className="inv-price-original">${(product.price || 0).toLocaleString('es-CL')}</span>
                                <span className="inv-price discount">${(product.discount_price || 0).toLocaleString('es-CL')}</span>
                            </>
                        ) : (
                            <span className="inv-price">${(product.price || 0).toLocaleString('es-CL')}</span>
                        )}
                    </div>
                </div>

                {product.description && (
                    <p className="inv-description" title={product.description}>
                        {product.description}
                    </p>
                )}

                <div className="inv-actions">
                    {/* En modo lista, el toggle está aquí abajo */}
                    {viewMode === 'list' && (
                         <button 
                            className={`btn-icon-sm ${product.is_active ? 'text-success' : 'text-muted'}`} 
                            onClick={handleToggleClick}
                            title={product.is_active ? "Pausar" : "Activar"}
                            style={{ marginRight: 8 }}
                        >
                            {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                    )}

                    {viewMode === 'grid' && (
                        <span className={`status-badge ${product.is_active ? 'active' : 'paused'}`}>
                            {product.is_active ? 'Disponible' : 'Pausado'}
                        </span>
                    )}
                    
                    <div className="action-buttons">
                        {/* Botón visual de editar (ayuda UX) */}
                        <button className="btn-icon-sm" title="Editar">
                            <Edit3 size={14} />
                        </button>
                        
                        <button 
                            onClick={handleDeleteClick} 
                            className="btn-trash-sm"
                            title="Eliminar producto"
                        >
                            <Trash size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default InventoryCard;