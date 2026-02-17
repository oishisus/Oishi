import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';

const ReceiptModal = ({ 
  order, 
  onClose, 
  onSave, 
  isUploading 
}) => {
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (order) {
      setPreview(null);
      setSelectedFile(null);
    }
  }, [order]);

  if (!order) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validación básica visual (la lógica real está en el padre)
      if (!file.type.startsWith('image/')) return;
      
      setPreview(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleSave = () => {
    if (selectedFile) {
      onSave(selectedFile);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-side-panel glass animate-slide-in" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
        <div className="admin-side-header">
          <h3>Comprobante de Pago</h3>
          <button onClick={onClose} className="btn-close-sidepanel"><X size={24} /></button>
        </div>
        
        <div className="admin-side-body">
          {/* Mostrar comprobante existente si hay */}
          {order.payment_ref && order.payment_ref.startsWith('http') && !preview && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Comprobante actual:</p>
              <a href={order.payment_ref} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 15 }}>
                <img src={order.payment_ref} alt="Comprobante" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--card-border)' }} />
              </a>
            </div>
          )}

          <div className="form-group">
            <label>Subir nuevo comprobante (Máx 5MB)</label>
            <div 
              className="upload-box" 
              onClick={() => document.getElementById('receipt-upload-modal').click()} 
              style={{ borderColor: preview ? '#25d366' : 'var(--card-border)' }}
            >
              <input type="file" id="receipt-upload-modal" accept="image/*" hidden onChange={handleFileChange} />
              
              {preview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, justifyContent: 'center', position: 'relative' }}>
                  <img src={preview} alt="Preview" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid white' }} />
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Imagen Lista</span>
                    <span style={{ fontSize: '0.75rem', color: '#25d366' }}>Click para cambiar</span>
                    <button 
                      type="button" 
                      className="btn-text" 
                      style={{ color: '#ff4444', fontSize: '0.75rem', padding: 0, marginTop: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview(null);
                        setSelectedFile(null);
                        document.getElementById('receipt-upload-modal').value = '';
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <Upload size={24} />
                  <span>Subir imagen</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="admin-side-footer">
          <button
            className="btn btn-primary btn-block"
            onClick={handleSave}
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? 'Subiendo...' : 'Guardar Comprobante'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
