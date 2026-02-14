import React from 'react';
import { Eye, EyeOff, Trash } from 'lucide-react';
import logo from '../../assets/logo.png';
import '../../styles/InventoryCard.css';

const InventoryCard = ({ product, toggleProductActive, setEditingProduct, setIsModalOpen, deleteProduct }) => (
    <div className={`inventory-card glass ${!product.is_active ? 'inactive' : ''}`} onClick={() => { setEditingProduct(product); setIsModalOpen(true) }}>
        <div className="inv-img-wrapper">
            <img src={product.image_url || logo} alt={product.name} onError={(e) => e.target.src = logo} />
            <div className="inv-status-toggle" onClick={(e) => toggleProductActive(product, e)}>
                {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
            </div>
        </div>
        <div className="inv-info">
            <div className="inv-header">
                <h4>{product.name}</h4>
                <span className="inv-price">${product.price.toLocaleString('es-CL')}</span>
            </div>
            <div className="inv-actions">
                <span className={`status-badge ${product.is_active ? 'active' : 'paused'}`}>
                    {product.is_active ? 'En Venta' : 'Pausado'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }} className="btn-trash-sm"><Trash size={14} /></button>
            </div>
        </div>
    </div>
);

export default InventoryCard;
