import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Upload, Image as ImageIcon, AlertCircle, Loader2, Trash2, DollarSign } from 'lucide-react';
import '../../../styles/Modals.css';
import '../../../styles/ProductModal.css';

const INITIAL_STATE = {
  name: '',
  price: '',
  description: '',
  category_id: '',
  is_special: false,
  has_discount: false,
  discount_price: '',
  image_url: ''
};

const ProductModal = React.memo(({ onClose, onSave, product, categories, saving = false }) => {
  const fileInputRef = useRef();
  const nameInputRef = useRef();

  // Al renderizarse condicionalmente en el padre, esto corre solo una vez al abrir.
  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        name: product.name || '',
        price: product.price || '',
        description: product.description || '',
        category_id: product.category_id || (categories?.[0]?.id || ''),
        is_special: product.is_special || false,
        has_discount: product.has_discount || false,
        discount_price: product.discount_price || '',
        image_url: product.image_url || ''
      };
    }
    return { ...INITIAL_STATE, category_id: categories?.[0]?.id || '' };
  });

  const [localFile, setLocalFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(() => product?.image_url || '');
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState({});

  // Auto-foco al montar
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const handleSafeClose = useCallback(() => {
    if (isDirty && !saving) {
      if (window.confirm('Tienes cambios sin guardar. ¿Seguro quieres cerrar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, saving, onClose]);

  // --- 2. MANEJADORES DE FORMULARIO ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setIsDirty(true);
  };

  // --- 3. GESTIÓN DE ARCHIVOS ---
  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      // Validar tamaño (opcional, ej: 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es muy pesada (Máx 5MB)");
        return;
      }
      setLocalFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);
  
  const handleDragEvents = (e, dragging) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = (e) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar la imagen actual?')) {
      setLocalFile(null);
      setPreviewUrl('');
      setFormData(prev => ({ ...prev, image_url: '' }));
      setIsDirty(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- 4. VALIDACIÓN Y ENVÍO ---
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
    if (!formData.price || Number(formData.price) <= 0) newErrors.price = 'Precio inválido';
    if (!formData.category_id) newErrors.category_id = 'Categoría requerida';
    
    if (formData.has_discount) {
      if (!formData.discount_price || Number(formData.discount_price) <= 0) {
        newErrors.discount_price = 'Precio oferta inválido';
      } else if (Number(formData.discount_price) >= Number(formData.price)) {
        newErrors.discount_price = 'Debe ser menor al precio normal';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData, localFile);
  };

  return (
    <div className="modal-overlay" onClick={handleSafeClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <header className="modal-header">
          <div>
            <h3 className="fw-700">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <p className="modal-subtitle">{product ? 'Modifica los detalles del plato' : 'Agrega un nuevo plato al menú'}</p>
          </div>
          <button onClick={handleSafeClose} className="btn-close" aria-label="Cerrar">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-form-scroll">
            
            {/* SECCIÓN IMAGEN (DRAG & DROP MEJORADO) */}
            <div 
              className={`product-image-section ${isDragging ? 'dragging' : ''} ${errors.image ? 'error-border' : ''}`}
              onDragOver={e => handleDragEvents(e, true)}
              onDragLeave={e => handleDragEvents(e, false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
                style={{display:'none'}} 
              />
              
              {previewUrl ? (
                <div className="image-preview-container">
                  <img src={previewUrl} alt="Preview" className="image-preview" />
                  <div className="image-overlay">
                    <button type="button" className="btn-icon-overlay" onClick={clearImage} title="Eliminar imagen">
                      <Trash2 size={18} />
                    </button>
                    <span className="overlay-text">Click para cambiar</span>
                  </div>
                </div>
              ) : (
                <div className="dropzone-placeholder">
                  <div className="icon-circle">
                    <ImageIcon size={28} />
                  </div>
                  <p className="drop-text">Arrastra una imagen o <span>haz click aquí</span></p>
                  <p className="drop-hint">JPG, PNG, WEBP (Máx 5MB)</p>
                </div>
              )}
            </div>

            {/* CAMPOS PRINCIPALES */}
            <div className="form-group">
              <label>Nombre del Plato <span className="req">*</span></label>
              <input
                ref={nameInputRef}
                className={`form-input ${errors.name ? 'error' : ''}`}
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Roll Acevichado Premium"
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Precio Normal ($) <span className="req">*</span></label>
                <input
                  type="number"
                  className={`form-input ${errors.price ? 'error' : ''}`}
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>

              <div className="form-group">
                <label>Categoría <span className="req">*</span></label>
                <select
                  className={`form-input ${errors.category_id ? 'error' : ''}`}
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                >
                  <option value="" disabled>Selecciona...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <span className="error-text">{errors.category_id}</span>}
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
                placeholder="Ingredientes, alérgenos, detalles..."
              />
            </div>

            {/* SWITCHES MODERNOS */}
            <div className="switches-container">
              
              {/* Switch Especial */}
              <label className={`custom-switch ${formData.is_special ? 'active' : ''}`}>
                <input 
                  type="checkbox" 
                  name="is_special" 
                  checked={formData.is_special} 
                  onChange={handleChange} 
                />
                <div className="switch-content">
                  <span className="switch-title">Destacar como Especial</span>
                  <span className="switch-desc">Aparecerá con una estrella en el menú</span>
                </div>
              </label>

              {/* Switch Descuento */}
              <label className={`custom-switch ${formData.has_discount ? 'active-green' : ''}`}>
                <input 
                  type="checkbox" 
                  name="has_discount" 
                  checked={formData.has_discount} 
                  onChange={handleChange} 
                />
                <div className="switch-content">
                  <span className="switch-title">Activar Oferta</span>
                  <span className="switch-desc">Mostrará un precio rebajado</span>
                </div>
              </label>
            </div>

            {/* INPUT CONDICIONAL DE DESCUENTO CON ANIMACIÓN */}
            {formData.has_discount && (
              <div className="form-group animate-slide-down">
                <label className="text-success">Precio Oferta ($) <span className="req">*</span></label>
                <div className="input-with-icon">
                  <DollarSign size={16} className="input-icon" />
                  <input
                    type="number"
                    className={`form-input ${errors.discount_price ? 'error' : ''}`}
                    name="discount_price"
                    value={formData.discount_price}
                    onChange={handleChange}
                    placeholder="Debe ser menor al precio normal"
                  />
                </div>
                {errors.discount_price && <span className="error-text">{errors.discount_price}</span>}
              </div>
            )}

          </div>

          {/* FOOTER */}
          <footer className="modal-footer">
            <button type="button" onClick={handleSafeClose} className="btn btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Guardando...' : 'Guardar Producto'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
});

export default ProductModal;