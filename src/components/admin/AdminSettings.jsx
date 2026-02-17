import React from 'react';
import { FileText, Trash2 } from 'lucide-react';

const AdminSettings = ({ 
  isMobile, 
  analyticsDate, 
  setAnalyticsDate, 
  handleExportMonthlyCsv, 
  openDangerModal 
}) => {
  return (
    <div className="settings-view animate-fade" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
      {/* TARJETA CIERRE MENSUAL */}
      <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid var(--accent-success)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <FileText size={28} color="#25d366" />
          <h3 style={{ margin: 0 }}>Cierre Mensual</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          Descargar Excel completo del mes seleccionado.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input 
            type="month" 
            className="form-input" 
            style={{ width: 'auto' }} 
            value={analyticsDate} 
            onChange={e => setAnalyticsDate(e.target.value)} 
          />
          <button 
            onClick={handleExportMonthlyCsv} 
            className="btn btn-primary" 
            style={{ background: '#25d366', color: 'black', flex: 1 }}
          >
            Descargar
          </button>
        </div>
      </div>

      {/* TARJETA ZONA DE PELIGRO */}
      <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid #ff4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <Trash2 size={28} color="#ff4444" />
          <h3 style={{ margin: 0 }}>Zona de Peligro</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          Acciones irreversibles. Requiere re-autenticación.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button 
            onClick={() => openDangerModal('monthlyOrders')} 
            className="btn btn-secondary" 
            style={{ borderColor: '#ff4444', color: '#ff4444', justifyContent: 'flex-start' }}
          >
            Borrar Ventas del Mes
          </button>
          <button 
            onClick={() => openDangerModal('allClients')} 
            className="btn btn-secondary" 
            style={{ borderColor: '#ff4444', color: '#ff4444', justifyContent: 'flex-start' }}
          >
            Borrar Clientes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
