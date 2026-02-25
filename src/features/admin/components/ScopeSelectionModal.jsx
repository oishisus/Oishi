import React from 'react';
import { X, Globe, MapPin, AlertTriangle } from 'lucide-react';

const ScopeSelectionModal = ({ isOpen, onClose, onConfirm, branchName, actionType = 'change' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-content glass animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <h3 className="fw-700">Confirmar cambio</h3>
          <button onClick={onClose} className="btn-close"><X size={24} /></button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 25 }}>
            <div style={{ 
              width: 60, height: 60, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', 
              color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' 
            }}>
              <AlertTriangle size={32} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: 8 }}>¿Dónde quieres aplicar este cambio?</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Estás a punto de <b>{actionType === 'activate' ? 'activar' : 'desactivar'}</b> un elemento.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {/* Opción Local */}
            {branchName !== 'Todas las sucursales' && (
              <button 
                className="btn-scope-option"
                onClick={() => onConfirm('local')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 15, padding: 15,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: 10, borderRadius: 8, color: '#60a5fa' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'white' }}>Solo en {branchName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No afectará a otros locales</div>
                </div>
              </button>
            )}

            {/* Opción Global */}
            <button 
              className="btn-scope-option"
              onClick={() => onConfirm('global')}
              style={{
                display: 'flex', alignItems: 'center', gap: 15, padding: 15,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: 10, borderRadius: 8, color: '#34d399' }}>
                <Globe size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'white' }}>En todos los locales</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Se aplicará a toda la cadena</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScopeSelectionModal;