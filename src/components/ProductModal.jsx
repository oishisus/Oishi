import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const ProductModal = React.memo(({ isOpen, onClose, onSave, product, categories, saving = false }) => {
    // Permitir cerrar modal con Esc
    useEffect(() => {
      if (!isOpen) return;
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);
  const fileInputRef = useRef();
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
  }, [product, categories]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLocalFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!formData.price || isNaN(formData.price) || formData.price <= 0) newErrors.price = 'Precio inválido';
    if (!formData.category_id) newErrors.category_id = 'Selecciona una categoría';
    if (!formData.description.trim()) newErrors.description = 'La descripción es obligatoria';
    // Imagen ya no es obligatoria
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData, localFile);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{background: 'rgba(16,24,40,0.92)', zIndex: 1000}} role="dialog" aria-modal="true" aria-label={product ? 'Editar producto' : 'Nuevo producto'}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'var(--background-dark, #101828)', color: '#fff', borderRadius: 18, minWidth: 370, maxWidth: 420, boxShadow: '0 8px 32px #0008'}}>
        <header className="modal-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #22304a', paddingBottom: 8, marginBottom: 18}}>
          <h3 style={{fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: 0.5}}>{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose} className="btn-close" aria-label="Cerrar modal" style={{background: 'none', border: 'none', color: '#fff'}}><X size={24} /></button>
        </header>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-form" style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            {/* Imagen preview */}
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
              <div style={{width: 90, height: 90, borderRadius: 12, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #334155'}}>
                {previewUrl && previewUrl !== '' ? (
                  <img src={previewUrl} alt="preview" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <ImageIcon size={38} color="#334155" />
                )}
              </div>
              <button type="button" className="btn btn-xs btn-secondary" style={{marginTop: 2}} onClick={handleUploadClick}>
                <Upload size={16} style={{marginRight: 4}} /> Subir imagen
              </button>
              {previewUrl && previewUrl !== '' && (
                <button 
                  type="button" 
                  className="btn btn-xs btn-danger" 
                  style={{marginTop: 2}} 
                  onClick={() => {
                    setPreviewUrl('');
                    setFormData(prev => ({ ...prev, image_url: '' }));
                    setLocalFile(null);
                  }}
                >
                  <Trash2 size={16} style={{marginRight: 4}} /> Eliminar imagen
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              {localFile && (
                <span style={{ fontSize: 12, color: '#cbd5e1' }}>Seleccionada: {localFile.name} <button type="button" className="btn btn-xs btn-danger" style={{marginLeft: 6}} onClick={() => { setLocalFile(null); setPreviewUrl(formData.image_url); }}>Quitar</button></span>
              )}
            </div>
            {/* Nombre */}
            <div className="form-group">
              <label>Nombre del Plato</label>
              <input 
                className="form-input"
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Ej: Roll Acevichado"
                style={{background: '#1e293b', color: '#fff', border: errors.name ? '2px solid #e53e3e' : '#38bdf8'}}
                autoFocus
                aria-label="Nombre del plato"
                required
              />
              {errors.name && <span style={{color:'#e53e3e', fontSize:13, display:'flex',alignItems:'center',gap:4}}><AlertCircle size={14}/> {errors.name}</span>}
            </div>
            {/* Precio y Categoría */}
            <div className="form-row" style={{display:'flex', gap:12}}>
              <div className="form-group" style={{flex:1}}>
                <label>Precio ($)</label>
                <input 
                  className="form-input"
                  type="number" 
                  name="price" 
                  value={formData.price} 
                  onChange={handleChange} 
                  placeholder="6000"
                  style={{background: '#1e293b', color: '#fff', border: errors.price ? '2px solid #e53e3e' : '#38bdf8'}}
                  aria-label="Precio"
                  required
                />
                {errors.price && <span style={{color:'#e53e3e', fontSize:13, display:'flex',alignItems:'center',gap:4}}><AlertCircle size={14}/> {errors.price}</span>}
              </div>
              <div className="form-group" style={{flex:1}}>
                <label>Categoría</label>
                <select 
                  className="form-input" 
                  name="category_id" 
                  value={formData.category_id} 
                  onChange={handleChange}
                  style={{background: '#1e293b', color: '#fff', border: errors.category_id ? '2px solid #e53e3e' : '#38bdf8'}}
                  aria-label="Categoría"
                  required
                >
                  <option value="">Selecciona...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <span style={{color:'#e53e3e', fontSize:13, display:'flex',alignItems:'center',gap:4}}><AlertCircle size={14}/> {errors.category_id}</span>}
              </div>
            </div>
            {/* Descripción */}
            <div className="form-group">
              <label>Descripción</label>
              <textarea 
                className="form-input"
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows="3"
                placeholder="Ingredientes, detalles..."
                style={{background: '#1e293b', color: '#fff', border: errors.description ? '2px solid #e53e3e' : '#38bdf8'}}
                aria-label="Descripción"
                required
              ></textarea>
              {errors.description && <span style={{color:'#e53e3e', fontSize:13, display:'flex',alignItems:'center',gap:4}}><AlertCircle size={14}/> {errors.description}</span>}
            </div>
            {/* Imagen URL */}
            <div className="form-group">
              <label>URL de Imagen (opcional)</label>
              <input 
                className="form-input"
                type="text" 
                name="image_url" 
                value={formData.image_url} 
                onChange={handleChange} 
                placeholder="https://..."
                style={{background: '#1e293b', color: '#fff', border: errors.image_url ? '1.5px solid #e53e3e' : '#334155'}}
                disabled={!!localFile}
              />
              {errors.image_url && <span style={{color:'#e53e3e', fontSize:13, display:'flex',alignItems:'center',gap:4}}><AlertCircle size={14}/> {errors.image_url}</span>}
            </div>
            {/* Switch especial */}
            <div className="form-group" style={{marginTop: 2, display:'flex', alignItems:'center', gap:12}}>
              <label htmlFor="is_special_switch" style={{display:'flex',alignItems:'center',gap:10, cursor:'pointer'}}>
                <input 
                  id="is_special_switch"
                  type="checkbox" 
                  name="is_special" 
                  checked={formData.is_special} 
                  onChange={handleChange} 
                  style={{display:'none'}}
                />
                <span style={{
                  width: 38,
                  height: 22,
                  background: formData.is_special ? '#38bdf8' : '#334155',
                  borderRadius: 12,
                  position: 'relative',
                  display: 'inline-block',
                  transition: 'background 0.2s',
                  verticalAlign: 'middle',
                }}>
                  <span style={{
                    position: 'absolute',
                    left: formData.is_special ? 18 : 2,
                    top: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 4px #0002',
                    transition: 'left 0.2s',
                  }}></span>
                </span>
                <span className="label-text" style={{color: formData.is_special ? '#38bdf8' : '#fff', fontWeight: 500}}>
                  Solo por hoy (Especial)
                </span>
              </label>
            </div>
          </div>
          <footer className="modal-footer" style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancelar</button>
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