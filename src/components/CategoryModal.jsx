import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const CategoryModal = ({ isOpen, onClose, onSave, category }) => {
  const [formData, setFormData] = useState({
    name: '',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        order: category.order || 0,
        is_active: category.is_active !== undefined ? category.is_active : true
      });
    } else {
      setFormData({
        name: '',
        order: 0,
        is_active: true
      });
    }
  }, [category]);

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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{category ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <button onClick={onClose} className="btn-close"><X size={24} /></button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="form-group">
              <label>Nombre de la Categoría</label>
              <input 
                className="form-input"
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder="Ej: Rolls Tradicionales"
              />
            </div>

            <div className="form-group">
              <label>Orden de visualización</label>
              <input 
                className="form-input"
                type="number" 
                name="order" 
                value={formData.order} 
                onChange={handleChange} 
                required 
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '5px', display: 'block' }}>
                Menor número aparece primero (Ej: 1, 2, 3)
              </small>
            </div>

            <div className="form-group">
              <label className="switch-container">
                <input 
                  type="checkbox" 
                  name="is_active" 
                  checked={formData.is_active} 
                  onChange={handleChange} 
                  hidden
                />
                <div className="switch"></div>
                <span className="label-text">Categoría Activa (Visible)</span>
              </label>
            </div>
          </div>

          <footer className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} />
              <span>Guardar</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;