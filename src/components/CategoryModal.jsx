import React, { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const CategoryModal = React.memo(({ isOpen, onClose, onSave, category, saving = false }) => {
  const nameInputRef = useRef();
  const [isDirty, setIsDirty] = useState(false); // Dirty State

  const [formData, setFormData] = useState({
    name: '',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
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

      // Auto-Focus
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [isOpen, category]);

  // Manejo seguro del cierre
  const handleSafeClose = () => {
    if (isDirty && !saving) {
      if (window.confirm('Tienes cambios sin guardar. ¿Seguro quieres cerrar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleSafeClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isDirty]);

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
    <div className="modal-overlay" onClick={handleSafeClose} role="dialog" aria-modal="true" style={{background: 'rgba(16,24,40,0.92)'}}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'var(--background-dark, #101828)', color: '#fff', borderRadius: 18, border: '1px solid #334155'}}>
        <header className="modal-header" style={{borderBottom: '1px solid #334155'}}>
          <h3>{category ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <button onClick={handleSafeClose} className="btn-close" style={{color:'#fff'}}><X size={24} /></button>
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
                style={{background: '#1e293b', color: '#fff', border: '1px solid #334155'}}
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
                style={{background: '#1e293b', color: '#fff', border: '1px solid #334155'}}
              />
              <small style={{ color: '#94a3b8', marginTop: '5px', display: 'block' }}>
                Menor número aparece primero (Ej: 1, 2, 3)
              </small>
            </div>

            <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 16}}>
              <label className="label-text" htmlFor="cat-active-switch" style={{color:'#fff'}}>Categoría Activa</label>
              <label className="switch" style={{marginBottom: 0, cursor: 'pointer'}}>
                <input
                  id="cat-active-switch"
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={{display: 'none'}}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <footer className="modal-footer" style={{borderTop: '1px solid #334155'}}>
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