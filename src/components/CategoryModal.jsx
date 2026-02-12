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
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade">
        <header className="modal-header">
          <h3>{category ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <button onClick={onClose} className="btn-close"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre de la Categoría</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="Ej: Rolls Tradicionales"
            />
          </div>

          <div className="form-group">
            <label>Orden de visualización (Más bajo primero)</label>
            <input 
              type="number" 
              name="order" 
              value={formData.order} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="switch">
              <input 
                type="checkbox" 
                name="is_active" 
                checked={formData.is_active} 
                onChange={handleChange} 
              />
              <span className="slider"></span>
            </label>
            <span className="label-text">Categoría Activa</span>
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
          max-width: 400px;
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

        label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        input {
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          color: white;
          font-family: inherit;
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

export default CategoryModal;
