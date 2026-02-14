import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import '../styles/Modals.css';
import '../styles/ProductModal.css';

const ProductModal = React.memo(({ isOpen, onClose, onSave, product, categories, saving = false }) => {
  const fileInputRef = useRef();
  const nameInputRef = useRef();

  const [isDirty, setIsDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category_id: '',
    is_special: false,
    image_url: ''
  });
  const [localFile, setLocalFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || '',
          price: product.price || '',
          description: product.description || '',
          category_id: product.category_id || categories[0]?.id || '',
          is_special: product.is_special || false,
          image_url: product.image_url || ''
        });
        setPreviewUrl(product.image_url || '');
      } else {
        setFormData({
          name: '',
          price: '',
          description: '',
          category_id: categories[0]?.id || '',
          is_special: false,
          image_url: ''
        });
        setPreviewUrl('');
      }
      setLocalFile(null);
      setErrors({});
      setIsDirty(false);

      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [isOpen, product, categories]);

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

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setLocalFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); };
  const handleUploadClick = () => fileInputRef.current.click();

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!formData.price || isNaN(formData.price) || formData.price <= 0) newErrors.price = 'Precio inválido';
    if (!formData.category_id) newErrors.category_id = 'Selecciona una categoría';
    if (!formData.description.trim()) newErrors.description = 'La descripción es obligatoria';
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
        <header className="modal-header">
          <h3 className="fw-700">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={handleSafeClose} className="btn-close" aria-label="Cerrar modal">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-form">

            {/* ZONA DE DRAG & DROP PARA IMAGEN */}
            <div
              className="product-image-section"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                onClick={handleUploadClick}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" />
                ) : (
                  <div className="dropzone-hint">
                    <ImageIcon size={32} />
                    <span>Arrastra aquí</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={handleUploadClick}
              >
                <Upload size={14} style={{ marginRight: 4 }} /> Seleccionar foto
              </button>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {localFile && (
                <div className="file-info">
                  <span>Listo para subir: {localFile.name}</span>
                  <button
                    type="button"
                    className="btn-danger-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalFile(null);
                      setPreviewUrl(formData.image_url);
                      setIsDirty(true);
                    }}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            {/* Nombre */}
            <div className="form-group">
              <label>Nombre del Plato</label>
              <input
                ref={nameInputRef}
                className={`form-input ${errors.name ? 'error' : ''}`}
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Roll Acevichado"
                required
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            {/* Precio y Categoría */}
            <div className="form-row">
              <div className="form-group">
                <label>Precio ($)</label>
                <input
                  className={`form-input ${errors.price ? 'error' : ''}`}
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="6000"
                  required
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select
                  className={`form-input ${errors.category_id ? 'error' : ''}`}
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                className={`form-input ${errors.description ? 'error' : ''}`}
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Ingredientes, detalles..."
                required
              ></textarea>
            </div>

            {/* Switch especial */}
            <div className="special-switch-container">
              <label className="special-switch" htmlFor="is_special_switch">
                <input
                  id="is_special_switch"
                  type="checkbox"
                  name="is_special"
                  checked={formData.is_special}
                  onChange={handleChange}
                  className="hidden"
                  style={{ display: 'none' }}
                />
                <div className="switch-toggle"></div>
                <span className="switch-label">
                  Destacar como Especial
                </span>
              </label>
            </div>
          </div>

          <footer className="modal-footer">
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

export default ProductModal;