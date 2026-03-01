import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import { Loader2, AlertCircle, XCircle, FileText, Trash2, Users, ChevronDown } from 'lucide-react';
import { downloadExcel } from '../../../shared/utils/exportUtils';

const AdminDangerZone = ({ orders, showNotify, loadData, isMobile, selectedBranch }) => {
  const [analyticsDate, setAnalyticsDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [expandedCard, setExpandedCard] = useState(() => (isMobile ? 'report' : null));

  const [isDangerModalOpen, setIsDangerModalOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState(null);
  const [dangerUserName, setDangerUserName] = useState('');
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerError, setDangerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getMonthRangeUtc = (yyyyMm) => {
    const [yearStr, monthStr] = String(yyyyMm).split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    return {
      startIso: start.toISOString(),
      endIso: nextMonth.toISOString(),
    };
  };

  useEffect(() => {
    if (!isDangerModalOpen) return;

    const scrollY = window.scrollY;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isDangerModalOpen]);

  const handleExportMonthlyCsv = async () => {
    if (loading) return;
    // 1. Calcular rango de fechas
    const range = getMonthRangeUtc(analyticsDate);
    if (!range) {
      showNotify('Mes inválido', 'error');
      return;
    }

    setLoading(true);
    try {
      // 2. [FIX] Consultar BD directamente para obtener TODOS los datos del mes
      // (Evita el límite de 100 pedidos de la vista principal)
      let query = supabase
        .from(TABLES.orders)
        .select('*')
        .gte('created_at', range.startIso)
        .lt('created_at', range.endIso)
        .order('created_at', { ascending: true });

      // Filtrar por sucursal si corresponde
      if (selectedBranch && selectedBranch.id && selectedBranch.id !== 'all') {
        query = query.eq('branch_id', selectedBranch.id);
      }

      const { data: fullMonthOrders, error } = await query;

      if (error) throw error;

      if (!fullMonthOrders || fullMonthOrders.length === 0) {
        showNotify("No hay datos para exportar en este período", 'info');
        return;
      }

      // 3. Formatear datos para Excel
      const dataToExport = fullMonthOrders.map(order => {
        const d = new Date(order.created_at);
        // Parseo seguro de items (por si viene como string o json)
        let items = Array.isArray(order.items) ? order.items : [];
        if (typeof order.items === 'string') {
            try { items = JSON.parse(order.items); } catch {}
        }
        
        const itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
        return {
          Fecha: d.toLocaleDateString('es-CL'),
          Hora: d.toLocaleTimeString('es-CL'),
          Cliente: order.client_name,
          RUT: order.client_rut,
          Teléfono: order.client_phone,
          Items: itemsText,
          Total: order.total,
          'Método Pago': order.payment_type || '',
          'Ref. Pago': order.payment_ref || ''
        };
      });

      const [year, month] = String(analyticsDate).split('-');
      downloadExcel(dataToExport, `Cierre_${year || '0000'}_${month || '00'}.xls`);
      showNotify('Reporte Excel generado', 'success');
    } catch (err) {
      showNotify('Error al generar reporte: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeDangerAction = async () => {
    if (loading) return;
    const trimmedEmail = dangerUserName.trim();
    if (!dangerAction) {
      setDangerError('Selecciona una acción válida');
      return;
    }

    if (!trimmedEmail || !dangerPassword) {
      setDangerError('Ingresa credenciales de administrador');
      return;
    }

    setDangerError(null);
    setLoading(true);

    try {
      // Guardar sesión actual antes de re-autenticar
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      // Validar con Supabase Auth (re-autenticación)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: dangerPassword
      });

      if (authError) {
        setDangerError('Credenciales de administrador inválidas');
        setLoading(false);
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
      if (adminError || !isAdmin) {
        setDangerError('Solo administradores pueden ejecutar esta acción');
        if (currentSession && currentSession.user?.email !== trimmedEmail) {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token
          });
        }
        setLoading(false);
        return;
      }

      if (dangerAction === 'monthlyOrders') {
        const range = getMonthRangeUtc(analyticsDate);
        if (!range) {
          throw new Error('Mes inválido');
        }

        const isSingleBranch = selectedBranch && selectedBranch.id && selectedBranch.id !== 'all';

        const { data, error } = await supabase.rpc('admin_delete_monthly_data', {
          p_start: range.startIso,
          p_end: range.endIso,
          p_branch_id: isSingleBranch ? selectedBranch.id : null
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        const count = result?.deleted_orders ?? 0;
        showNotify(isSingleBranch
          ? `${count} registros del mes eliminados (sucursal ${selectedBranch.name})`
          : `${count} registros del mes eliminados (todas las sucursales)`,
        'success');

      } else if (dangerAction === 'allClients') {
        // [MEJORA] Manejo de error de llave foránea (FK)
        const { data, error } = await supabase.rpc('admin_purge_clients');
        if (error) {
          if (error.code === '23503') throw new Error('No se pueden borrar clientes con pedidos asociados.');
          throw error;
        }
        const result = Array.isArray(data) ? data[0] : data;
        showNotify(`Base de clientes purgada (${result?.deleted_clients || 0} registros)`, 'success');
      }

      // Cerrar modal solo después de éxito
      setIsDangerModalOpen(false);
      loadData(true);

      // Restaurar sesión original si el email era diferente
      if (currentSession && currentSession.user?.email !== trimmedEmail) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token
        });
      }
    } catch (e) {
      showNotify(`Error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openDangerModal = (action) => {
    setDangerAction(action);
    setDangerUserName('');
    setDangerPassword('');
    setDangerError(null);
    setIsDangerModalOpen(true);
  };

  return (
    <>
      <div style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
        <h3 style={{ color: '#ef4444', marginBottom: 20, borderBottom: '1px solid #ef4444', paddingBottom: 10 }}>Zona de Peligro Administrativa</h3>
        
        {/* Selector de mes compartido — visible para Export y Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.9rem', whiteSpace: 'nowrap', flex: '0 0 auto' }}>Mes seleccionado:</label>
          <input 
            type="month" 
            className="form-input" 
            style={{ width: 190, maxWidth: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} 
            value={analyticsDate} 
            onChange={e => setAnalyticsDate(e.target.value)} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

            {/* Cierre Mensual */}
            <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid var(--accent-success)' }}>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setExpandedCard(prev => prev === 'report' ? null : 'report')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileText size={28} color="#25d366" />
                    <h3 style={{ margin: 0 }}>Reporte Cierre Mensual</h3>
                  </div>
                  <ChevronDown size={18} style={{ transform: expandedCard === 'report' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                  <FileText size={28} color="#25d366" />
                  <h3 style={{ margin: 0 }}>Reporte Cierre Mensual</h3>
                </div>
              )}

              {(!isMobile || expandedCard === 'report') && (
                <>
                  <div style={{ height: isMobile ? 12 : 0 }} />
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                    Genera y descarga un Excel con todas las ventas de <b style={{ color: 'white' }}>{analyticsDate}</b>.
                  </p>
                  <button onClick={handleExportMonthlyCsv} disabled={loading} className="btn-table-action" style={{ width: '100%', padding: 12, background: 'rgba(37, 211, 102, 0.2)', color: '#25d366', border: '1px solid #25d366', opacity: loading ? 0.7 : 1 }}>
                    {loading ? <><Loader2 size={16} className="animate-spin" style={{marginRight: 8}}/> Generando...</> : 'Descargar Reporte Mes'}
                  </button>
                </>
              )}
            </div>

            {/* Eliminar Mes */}
            <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid #ef4444' }}>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setExpandedCard(prev => prev === 'deleteMonth' ? null : 'deleteMonth')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Trash2 size={28} color="#ef4444" />
                    <h3 style={{ margin: 0 }}>Eliminar Ventas Mes</h3>
                  </div>
                  <ChevronDown size={18} style={{ transform: expandedCard === 'deleteMonth' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                  <Trash2 size={28} color="#ef4444" />
                  <h3 style={{ margin: 0 }}>Eliminar Ventas Mes</h3>
                </div>
              )}

              {(!isMobile || expandedCard === 'deleteMonth') && (
                <>
                  <div style={{ height: isMobile ? 12 : 0 }} />
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                    Borra las órdenes y movimientos de caja de <b style={{ color: 'white' }}>{analyticsDate}</b>
                    {selectedBranch && selectedBranch.id && selectedBranch.id !== 'all' ? (
                      <> para la sucursal <b style={{ color: 'white' }}>{selectedBranch.name}</b></>
                    ) : (
                      <> de <b style={{ color: 'white' }}>todas las sucursales</b></>
                    )}.
                    <br/><b style={{color: '#ef4444'}}>Acción irreversible.</b>
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDangerModal('monthlyOrders');
                    }}
                    className="btn-table-action"
                    style={{ width: '100%', padding: 12, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}
                  >
                    Eliminar Datos Mes
                  </button>
                </>
              )}
            </div>

             {/* Eliminar Clientes */}
             <div className="glass" style={{ padding: 25, borderRadius: 16, border: '1px solid #ef4444' }}>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setExpandedCard(prev => prev === 'deleteClients' ? null : 'deleteClients')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Users size={28} color="#ef4444" />
                    <h3 style={{ margin: 0 }}>Purgar Clientes</h3>
                  </div>
                  <ChevronDown size={18} style={{ transform: expandedCard === 'deleteClients' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                  <Users size={28} color="#ef4444" />
                  <h3 style={{ margin: 0 }}>Purgar Clientes</h3>
                </div>
              )}

              {(!isMobile || expandedCard === 'deleteClients') && (
                <>
                  <div style={{ height: isMobile ? 12 : 0 }} />
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 20 }}>
                    Elimina todos los clientes de la base de datos excepto el genérico.
                    <br/><b style={{color: '#ef4444'}}>Solo usar en desarrollo.</b>
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDangerModal('allClients');
                    }}
                    className="btn-table-action"
                    style={{ width: '100%', padding: 12, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}
                  >
                    Borrar Todos los Clientes
                  </button>
                </>
              )}
            </div>
        </div>
      </div>

      {isDangerModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="admin-danger-overlay" onClick={() => setIsDangerModalOpen(false)}>
          <div className="admin-danger-modal glass" onClick={e => e.stopPropagation()}>
            <div className="admin-danger-header">
              <div className="admin-danger-title">
                <AlertCircle size={22} className="text-accent" />
                <h3>Confirmar</h3>
              </div>
              <button onClick={() => setIsDangerModalOpen(false)} className="admin-danger-close"><XCircle size={24} /></button>
            </div>

            <div className="admin-danger-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 20 }}>Acción irreversible. Ingresa credenciales.</p>
              <div className="form-group">
                <label>Email Admin</label>
                <input 
                  className="form-input" 
                  placeholder="admin@ejemplo.com" 
                  value={dangerUserName} 
                  onChange={e => setDangerUserName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && executeDangerAction()}
                />
              </div>
              <div className="form-group">
                <label>Clave</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={dangerPassword} 
                  onChange={e => setDangerPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && executeDangerAction()}
                />
              </div>
              {dangerError && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: 10 }}>{dangerError}</div>}
            </div>

            <div className="admin-danger-footer">
              <button 
                className="btn btn-primary btn-block" 
                onClick={executeDangerAction}
                disabled={loading}
                style={{ background: '#ff4444', color: 'white', border: 'none' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar y Borrar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AdminDangerZone;
