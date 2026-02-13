import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const ProductModal = React.memo(({ isOpen, onClose, onSave, product, categories, saving = false }) => {
  const fileInputRef = useRef();
  const nameInputRef = useRef(); // Para el Auto-Focus

  // Estado para detectar cambios (Dirty State)
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

  // Resetear formulario al abrir
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
      setIsDirty(false); // Reseteamos el "sucio"
      
      // Auto-Focus al campo nombre con un pequeño delay para asegurar renderizado
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [isOpen, product, categories]);

  // Manejo seguro del cierre (Confirmación)
  const handleSafeClose = () => {
    if (isDirty && !saving) {
      if (window.confirm('Tienes cambios sin guardar. ¿Seguro quieres cerrar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Manejar tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleSafeClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isDirty]); // Dependencia isDirty es clave aquí

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setIsDirty(true); // Marcamos que hubo cambios
  };

  // --- LÓGICA DE IMAGEN (CLICK Y DRAG & DROP) ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setLocalFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData, localFile);
    // No reseteamos isDirty aquí porque el componente padre cerrará el modal
  };

  return (
    <div className="modal-overlay" onClick={handleSafeClose} style={{background: 'rgba(16,24,40,0.92)', zIndex: 1000}} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'var(--background-dark, #101828)', color: '#fff', borderRadius: 18, minWidth: 370, maxWidth: 420, boxShadow: '0 8px 32px #0008'}}>
        <header className="modal-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #22304a', paddingBottom: 8, marginBottom: 18}}>
          <h3 style={{fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: 0.5}}>{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={handleSafeClose} className="btn-close" aria-label="Cerrar modal" style={{background: 'none', border: 'none', color: '#fff'}}><X size={24} /></button>
        </header>
        
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-form" style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            
            {/* ZONA DE DRAG & DROP PARA IMAGEN */}
            <div 
              style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div style={{
                width: 100, 
                height: 100, 
                borderRadius: 16, 
                background: isDragging ? 'rgba(56, 189, 248, 0.1)' : '#1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                overflow: 'hidden', 
                border: isDragging ? '2px dashed #38bdf8' : '2px solid #334155',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }} onClick={handleUploadClick}>
                {previewUrl && previewUrl !== '' ? (
                  <img src={previewUrl} alt="preview" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <div style={{textAlign:'center', color: isDragging ? '#38bdf8' : '#64748b'}}>
                    <ImageIcon size={32} style={{margin:'0 auto'}} />
                    <span style={{fontSize: 10, display:'block', marginTop:4}}>Arrastra aquí</span>
                  </div>
                )}
              </div>
              
              <button type="button" className="btn btn-xs btn-secondary" style={{marginTop: 2, fontSize:'0.75rem', padding:'4px 10px'}} onClick={handleUploadClick}>
                <Upload size={14} style={{marginRight: 4}} /> Seleccionar foto
              </button>
              
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
              
              {localFile && (
                <span style={{ fontSize: 11, color: '#cbd5e1' }}>
                  Listo para subir: {localFile.name} 
                  <button type="button" className="btn btn-xs btn-danger" style={{marginLeft: 6, padding:'2px 6px', fontSize:10, background:'#ef4444', border:'none', borderRadius:4, color:'white'}} onClick={(e) => { e.stopPropagation(); setLocalFile(null); setPreviewUrl(formData.image_url); setIsDirty(true); }}>Quitar</button>
                </span>
              )}
            </div>

            {/* Nombre con Auto-Focus */}
            <div className="form-group">
              <label>Nombre del Plato</label>
              <input 
                ref={nameInputRef}
                className="form-input"
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Ej: Roll Acevichado"
                style={{background: '#1e293b', color: '#fff', border: errors.name ? '2px solid #e53e3e' : '1px solid #38bdf8'}}
                required
              />
              {errors.name && <span style={{color:'#e53e3e', fontSize:12, marginTop:4}}>{errors.name}</span>}
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
                  style={{background: '#1e293b', color: '#fff', border: errors.price ? '2px solid #e53e3e' : '1px solid #334155'}}
                  required
                />
              </div>
              <div className="form-group" style={{flex:1}}>
                <label>Categoría</label>
                <select 
                  className="form-input" 
                  name="category_id" 
                  value={formData.category_id} 
                  onChange={handleChange}
                  style={{background: '#1e293b', color: '#fff', border: errors.category_id ? '2px solid #e53e3e' : '1px solid #334155'}}
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
                className="form-input"
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows="3"
                placeholder="Ingredientes, detalles..."
                style={{background: '#1e293b', color: '#fff', border: errors.description ? '2px solid #e53e3e' : '1px solid #334155'}}
                required
              ></textarea>
            </div>

            {/* Switch especial */}
            <div className="form-group" style={{marginTop: 2}}>
              <label htmlFor="is_special_switch" style={{display:'flex',alignItems:'center',gap:10, cursor:'pointer'}}>
                <input 
                  id="is_special_switch"
                  type="checkbox" 
                  name="is_special" 
                  checked={formData.is_special} 
                  onChange={handleChange} 
                  style={{display:'none'}}
                />
                <div style={{
                  width: 40,
                  height: 22,
                  background: formData.is_special ? '#38bdf8' : '#334155',
                  borderRadius: 12,
                  position: 'relative',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: formData.is_special ? 20 : 2,
                    top: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                  }}></div>
                </div>
                <span className="label-text" style={{color: formData.is_special ? '#38bdf8' : '#94a3b8', fontWeight: 500, fontSize:'0.9rem'}}>
                  Destacar como Especial
                </span>
              </label>
            </div>
          </div>

          <footer className="modal-footer" style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}>
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