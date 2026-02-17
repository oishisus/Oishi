import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import '../../../styles/Modals.css';
import '../../../styles/CategoryModal.css';

const CategoryModal = React.memo(({ isOpen, onClose, onSave, category, saving = false }) => {
  const nameInputRef = useRef();
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
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
        setIsDirty(false);
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 0);
    }
  }, [isOpen, category]);

  const handleSafeClose = useCallback(() => {
    if (isDirty && !saving) {
      if (window.confirm('Tienes cambios sin guardar. ¿Seguro quieres cerrar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, saving, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleSafeClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleSafeClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setIsDirty(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={handleSafeClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{category ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <button onClick={handleSafeClose} className="btn-close">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="form-group">
              <label>Nombre de la Categoría</label>
              <input
                ref={nameInputRef}
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
              <small className="category-hint">
                Menor número aparece primero (Ej: 1, 2, 3)
              </small>
            </div>

            <div className="category-active-section">
              <label className="text-sm fw-700" htmlFor="cat-active-switch">Categoría Activa</label>
              <label className="switch-slider-container">
                <input
                  id="cat-active-switch"
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={{ display: 'none' }}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>

          <footer className="modal-footer" style={{ borderTop: '1px solid #22304a' }}>
            <button type="button" onClick={handleSafeClose} className="btn btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
});

export default CategoryModal;