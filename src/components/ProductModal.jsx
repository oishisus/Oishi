import React, { useState, useEffect } from 'react';
import { X, Save, Upload } from 'lucide-react';

const ProductModal = ({ isOpen, onClose, onSave, product, categories, saving = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category_id: '',
    is_special: false,
    image_url: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        description: product.description || '',
        category_id: product.category_id || '',
        is_special: product.is_special || false,
        image_url: product.image_url || ''
      });
    } else {
      setFormData({
        name: '',
        price: '',
        description: '',
        category_id: categories[0]?.id || '',
        is_special: false,
        image_url: ''
      });
    }
  }, [product, categories]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade">
        <header className="modal-header">
          <h3>{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="btn-close"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre del Plato</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="Ej: Roll Acevichado"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio ($)</label>
              <input 
                type="number" 
                name="price" 
                value={formData.price} 
                onChange={handleChange} 
                required 
                placeholder="6000"
              />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange}>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows="3"
              placeholder="Ingredientes, detalles..."
            ></textarea>
          </div>

          <div className="form-group">
            <label>Imagen (URL)</label>
            <div className="image-input-wrapper">
              <input 
                type="text" 
                name="image_url" 
                value={formData.image_url} 
                onChange={handleChange} 
                placeholder="https://oishi.com/img.jpg"
              />
              <button type="button" className="btn-upload"><Upload size={18} /></button>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="switch">
              <input 
                type="checkbox" 
                name="is_special" 
                checked={formData.is_special} 
                onChange={handleChange} 
              />
              <span className="slider"></span>
            </label>
            <span className="label-text">Marcar como "Solo por hoy" (Especial)</span>
          </div>

          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </footer>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid var(--card-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .modal-form {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        input, select, textarea {
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          color: white;
          font-family: inherit;
        }

        .image-input-wrapper {
          display: flex;
          gap: 10px;
        }

        .btn-upload {
          background: var(--bg-tertiary);
          border: 1px solid var(--card-border);
          color: white;
          padding: 0 15px;
          border-radius: 10px;
          cursor: pointer;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .label-text {
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        /* Switch Toggle */
        .switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 24px;
        }

        .switch input { opacity: 0; width: 0; height: 0; }

        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: var(--bg-tertiary);
          transition: .4s;
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider { background-color: var(--accent-primary); }
        input:checked + .slider:before { transform: translateX(22px); }

        .modal-footer {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
      `}</style>
    </div>
  );
};

export default ProductModal;
