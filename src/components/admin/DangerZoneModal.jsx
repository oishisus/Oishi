import React, { useState, useEffect } from 'react';
import { AlertCircle, XCircle, Loader2 } from 'lucide-react';

const DangerZoneModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isSubmitting, 
  errorMessage 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Limpiar inputs al abrir
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirm(email, password);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="admin-side-panel glass animate-slide-in" 
        style={{ maxWidth: 350, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="admin-side-header">
          <div className="flex-center">
            <AlertCircle size={22} className="text-accent" />
            <h3>Confirmar</h3>
          </div>
          <button onClick={onClose} className="btn-close-sidepanel">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="admin-side-body" style={{ overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '0.9rem', marginBottom: 20 }}>
            Acción irreversible. Ingresa credenciales de administrador para confirmar.
          </p>
          
          <div className="form-group">
            <label>Email Admin</label>
            <input 
              className="form-input" 
              placeholder="admin@ejemplo.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          
          <div className="form-group">
            <label>Clave</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {errorMessage && (
            <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: 10 }}>
              {errorMessage}
            </div>
          )}
        </div>
        
        <div className="admin-side-footer" style={{ marginTop: 'auto' }}>
          <button 
            className="btn btn-primary btn-block" 
            onClick={handleSubmit}
            disabled={isSubmitting || !email || !password}
            style={{ background: '#ff4444', color: 'white', border: 'none' }}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar y Borrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DangerZoneModal;
