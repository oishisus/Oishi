import React from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Phone, X, Store, AlertCircle, Loader2 } from 'lucide-react';
import '../../styles/BranchSelectorModal.css';

const BranchSelectorModal = ({ isOpen, onClose, branches, allBranches, isLoadingCaja, onSelectBranch, allowClose = true, schedule }) => {
  if (!isOpen) return null;

  const handleBranchSelect = (branch) => {
    onSelectBranch(branch);
    if (onClose) onClose();
  };

  const hasBranchesWithCaja = branches && branches.length > 0;
  const hasOtherBranches = allBranches && allBranches.length > 0;

  // Función para extraer "ABIERTO" o "CERRADO" del string y darle formato de Badge Neón
  const formatBranchName = (rawName) => {
    if (typeof rawName !== 'string') return rawName; // Fallback por si acaso

    let cleanName = rawName;
    let badge = null;

    // Detectamos qué estado tiene y lo separamos del nombre
    if (rawName.includes('ABIERTO')) {
      cleanName = rawName.replace('ABIERTO', '').trim();
      badge = <span className="badge-open">ABIERTO</span>;
    } else if (rawName.includes('CERRADO')) {
      cleanName = rawName.replace('CERRADO', '').trim();
      badge = <span className="badge-closed">CERRADO</span>;
    }

    return (
      <>
        {/* Icono de la sucursal junto al nombre */}
        <Store size={18} className="branch-icon-small" />
        <span>{cleanName}</span>
        {badge}
      </>
    );
  };

  const modalContent = (
    <div className="branch-modal-overlay" onClick={allowClose ? onClose : undefined}>
      <div 
        className="branch-modal-wrapper" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="branch-modal-content">
          
          {/* Header Limpio y Minimalista */}
          <header className="branch-modal-header">
            <div className="branch-modal-title-section">
              <h2 className="branch-modal-title">Elige tu Sucursal</h2>
              <p className="branch-modal-subtitle">Selecciona la ubicación más cercana</p>
            </div>
            {allowClose && (
              <button 
                onClick={onClose}
                className="branch-modal-close-btn"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            )}
          </header>

          {/* Lista de Sucursales */}
          <div className="branch-list">
            {isLoadingCaja ? (
              <div className="branch-empty-state">
                <Loader2 size={32} className="branch-loading-spinner" />
                <p>Verificando sucursales disponibles...</p>
              </div>
            ) : !hasBranchesWithCaja ? (
              <div className="branch-empty-state">
                <AlertCircle size={40} style={{ color: '#ff4b63', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>
                  No hay sucursales recibiendo pedidos
                </p>
                <p>
                  {schedule ? `Horario de atención: ${schedule}` : (hasOtherBranches
                    ? 'Abre la caja en el panel de administración de alguna sucursal para habilitar compras.'
                    : 'Abre la caja en el panel de administración para habilitar compras.')}
                </p>
              </div>
            ) : (
              branches.map((branch) => (
                <button
                   key={branch.id}
                   onClick={() => handleBranchSelect(branch)}
                   className="branch-button"
                >
                  {/* Cabecera del botón procesada por nuestra función */}
                  <div className="branch-item-row">
                    <div className="branch-item-name">
                      {formatBranchName(branch.name)}
                    </div>
                  </div>

                  {/* Detalles de la sucursal */}
                  <div className="branch-details">
                    <div className="branch-address-row">
                      <MapPin className="branch-icon-small" />
                      <span>{branch.address}</span>
                    </div>
                    {branch.phone && (
                      <div className="branch-phone-row">
                        <Phone className="branch-icon-small" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
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

export default BranchSelectorModal;