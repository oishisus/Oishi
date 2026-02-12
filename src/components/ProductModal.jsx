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
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation evita que el modal se cierre si clickeas dentro de él */}
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="btn-close"><X size={24} /></button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="form-group">
              <label>Nombre del Plato</label>
              <input 
                className="form-input"
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
                  className="form-input"
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
                <select 
                  className="form-input" 
                  name="category_id" 
                  value={formData.category_id} 
                  onChange={handleChange}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea 
                className="form-input"
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows="3"
                placeholder="Ingredientes, detalles..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Imagen (URL)</label>
              <div className="input-group">
                <input 
                  className="form-input"
                  type="text" 
                  name="image_url" 
                  value={formData.image_url} 
                  onChange={handleChange} 
                  placeholder="https://..."
                />
                <button type="button" className="btn btn-secondary">
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="switch-container">
                <input 
                  type="checkbox" 
                  name="is_special" 
                  checked={formData.is_special} 
                  onChange={handleChange} 
                  hidden // Ocultamos el checkbox nativo
                />
                <div className="switch"></div>
                <span className="label-text">Marcar como "Solo por hoy" (Especial)</span>
              </label>
            </div>
          </div>

          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} />
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;