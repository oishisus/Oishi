import React from 'react';
import { createPortal } from 'react-dom';
import { X, Store, Loader2 } from 'lucide-react';
import '../../styles/BranchSelectorModal.css';

/**
 * Componente especializado para la Home.
 * Muestra una lista simple de sucursales para abrir WhatsApp, Instagram o Mapas.
 */
const ContactBranchModal = ({ isOpen, onClose, branches, isLoading, onSelectBranch }) => {
  if (!isOpen) return null;

  const handleBranchSelect = (branch) => {
    onSelectBranch(branch);
    if (onClose) onClose();
  };

  // Función para extraer "ABIERTO" o "CERRADO" del string
  const formatBranchName = (rawName) => {
    if (typeof rawName !== 'string') return rawName;

    let cleanName = rawName;
    let badge = null;

    if (rawName.includes('ABIERTO')) {
      cleanName = rawName.replace('ABIERTO', '').trim();
      badge = <span className="badge-open">ABIERTO</span>;
    } else if (rawName.includes('CERRADO')) {
      cleanName = rawName.replace('CERRADO', '').trim();
      badge = <span className="badge-closed">CERRADO</span>;
    }

    return (
      <>
        <Store size={18} className="branch-icon-small" />
        <span>{cleanName}</span>
        {badge}
      </>
    );
  };

  const modalContent = (
    <div className="branch-modal-overlay" onClick={onClose}>
      <div 
        className="branch-modal-wrapper" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="branch-modal-content">
          
          <header className="branch-modal-header">
            <div className="branch-modal-title-section">
              <h2 className="branch-modal-title">Elige tu Sucursal</h2>
              <p className="branch-modal-subtitle">¿De qué local quieres obtener información?</p>
            </div>
            <button 
              onClick={onClose}
              className="branch-modal-close-btn"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </header>

          <div className="branch-list">
            {isLoading ? (
              <div className="branch-empty-state">
                <Loader2 size={32} className="branch-loading-spinner" />
                <p>Cargando sucursales...</p>
              </div>
            ) : branches.length === 0 ? (
              <div className="branch-empty-state">
                <p>No hay sucursales configuradas.</p>
              </div>
            ) : (
              branches.map((branch) => (
                <button
                   key={branch.id}
                   onClick={() => handleBranchSelect(branch)}
                   className="branch-button"
                   style={{ padding: '20px' }} // Un poco más de aire al no tener detalles
                >
                  <div className="branch-item-row">
                    <div className="branch-item-name" style={{ fontSize: '1.1rem' }}>
                      {formatBranchName(branch.name)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById('modal-root') || document.body;
  return createPortal(modalContent, portalRoot);
};

export default ContactBranchModal;
