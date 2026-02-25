import React, { useState, useEffect, useCallback } from 'react';
import { Save, Building, Phone, MapPin, Instagram, Clock, CreditCard, User, Mail, Hash, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import "../styles/AdminSettings.css";

const AdminSettings = ({ showNotify, isMobile, selectedBranch, onBranchUpdate }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        instagram: '',
        schedule: '',
        bank_name: '',
        account_type: '',
        account_number: '',
        account_rut: '',
        account_email: '',
        account_holder: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSection, setExpandedSection] = useState(() => (isMobile ? 'basic' : null));

    const loadSettings = useCallback(async () => {
        if (!selectedBranch || !selectedBranch.id || selectedBranch.id === 'all') {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.branches)
                .select('*')
                .eq('id', selectedBranch.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setFormData({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    instagram: data.instagram_url || '',
                    schedule: data.schedule || '',
                    bank_name: data.bank_name || '',
                    account_type: data.account_type || '',
                    account_number: data.account_number || '',
                    account_rut: data.account_rut || '',
                    account_email: data.account_email || '',
                    account_holder: data.account_holder || ''
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showNotify('Error al cargar configuración', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotify, selectedBranch?.id]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBranch || !selectedBranch.id || selectedBranch.id === 'all') {
            showNotify('Selecciona una sucursal para guardar', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: formData.name || null,
                phone: formData.phone || null,
                address: formData.address || null,
                instagram_url: formData.instagram || null,
                schedule: formData.schedule || null,
                bank_name: formData.bank_name || null,
                account_type: formData.account_type || null,
                account_number: formData.account_number || null,
                account_rut: formData.account_rut || null,
                account_email: formData.account_email || null,
                account_holder: formData.account_holder || null
            };
            const { error } = await supabase
                .from(TABLES.branches)
                .update(payload)
                .eq('id', selectedBranch.id);

            if (error) throw error;
            
            // Actualizar datos globales
            if (onBranchUpdate) await onBranchUpdate();
            
            showNotify(`Configuración de "${selectedBranch.name}" guardada correctamente`, 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            const msg = (error && typeof error === 'object' && error.message)
                ? `${error.message}${error.code ? ` (${error.code})` : ''}`
                : String(error || 'Error al guardar configuración');
            showNotify(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const canEdit = selectedBranch && selectedBranch.id && selectedBranch.id !== 'all';

    if (!canEdit) {
        return (
            <div className="settings-container animate-fade">
                <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
                    <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
                        Selecciona una <strong style={{ color: 'white' }}>sucursal</strong> en el selector del encabezado para editar su información (nombre, teléfono, dirección, horario y datos de transferencia).
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: 12 }}>
                        Cada local tiene su propia configuración en la tabla <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>branches</code>.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-10 text-center text-white">Cargando configuración...</div>;

    return (
        <div className="settings-container animate-fade">
            <header className="settings-header">
                <div>
                    <h1>Configuración del local</h1>
                    <p style={{ color: '#9ca3af', marginTop: 5 }}>Información pública de <strong style={{ color: 'white' }}>{selectedBranch.name}</strong></p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={handleSubmit} 
                    disabled={saving}
                    style={{ minWidth: 140 }}
                >
                    {saving ? 'Guardando...' : <><Save size={18} style={{ marginRight: 8 }} /> Guardar Cambios</>}
                </button>
            </header>

            <form className="settings-form glass" onSubmit={handleSubmit}>
                
                <section className="settings-section">
                    {isMobile ? (
                        <button
                            type="button"
                            onClick={() => setExpandedSection(prev => prev === 'basic' ? null : 'basic')}
                            className="section-title"
                            style={{ width: '100%', justifyContent: 'space-between', background: 'transparent', border: 'none', paddingBottom: 15, cursor: 'pointer' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Building size={20} className="text-secondary" /> Información Básica
                            </span>
                            <ChevronDown size={18} style={{ transform: expandedSection === 'basic' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>
                    ) : (
                        <h3 className="section-title"><Building size={20} className="text-secondary" /> Información Básica</h3>
                    )}
                    {(!isMobile || expandedSection === 'basic') && (
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nombre de esta sucursal</label>
                            <div className="input-icon-wrapper">
                                <Building size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej. Oishi Sushi - Centro"
                                />
                            </div>
                            <p className="form-hint">Nombre de este local. El nombre de la empresa (portada Home) se edita en <strong>Datos de la empresa</strong>.</p>
                        </div>
                        <div className="form-group">
                            <label>Teléfono / WhatsApp (para botón)</label>
                            <div className="input-icon-wrapper">
                                <Phone size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    placeholder="+569..."
                                />
                            </div>
                        </div>
                    </div>
                    )}
                </section>

                <section className="settings-section">
                    {isMobile ? (
                        <button
                            type="button"
                            onClick={() => setExpandedSection(prev => prev === 'location' ? null : 'location')}
                            className="section-title"
                            style={{ width: '100%', justifyContent: 'space-between', background: 'transparent', border: 'none', paddingBottom: 15, cursor: 'pointer' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <MapPin size={20} className="text-secondary" /> Ubicación y Redes
                            </span>
                            <ChevronDown size={18} style={{ transform: expandedSection === 'location' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>
                    ) : (
                        <h3 className="section-title"><MapPin size={20} className="text-secondary" /> Ubicación y Redes</h3>
                    )}
                    {(!isMobile || expandedSection === 'location') && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Dirección Completa</label>
                            <div className="input-icon-wrapper">
                                <MapPin size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    placeholder="Ej. Av. Siempre Viva 123, Santiago"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Instagram (URL o @usuario)</label>
                            <div className="input-icon-wrapper">
                                <Instagram size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.instagram}
                                    onChange={e => setFormData({...formData, instagram: e.target.value})}
                                    placeholder="@usuario o https://..."
                                />
                            </div>
                        </div>
                    </div>
                    )}
                </section>

                <section className="settings-section">
                    {isMobile ? (
                        <button
                            type="button"
                            onClick={() => setExpandedSection(prev => prev === 'schedule' ? null : 'schedule')}
                            className="section-title"
                            style={{ width: '100%', justifyContent: 'space-between', background: 'transparent', border: 'none', paddingBottom: 15, cursor: 'pointer' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Clock size={20} className="text-secondary" /> Horarios y Pagos
                            </span>
                            <ChevronDown size={18} style={{ transform: expandedSection === 'schedule' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>
                    ) : (
                        <h3 className="section-title"><Clock size={20} className="text-secondary" /> Horarios y Pagos</h3>
                    )}
                    {(!isMobile || expandedSection === 'schedule') && (
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Horarios de Atención</label>
                            <textarea 
                                className="form-textarea"
                                value={formData.schedule}
                                onChange={e => setFormData({...formData, schedule: e.target.value})}
                                placeholder="Ej. Lunes a Viernes: 12:00 - 22:00"
                                rows={3}
                            />
                        </div>
                    </div>
                    )}
                </section>

                <section className="settings-section">
                    {isMobile ? (
                        <button
                            type="button"
                            onClick={() => setExpandedSection(prev => prev === 'bank' ? null : 'bank')}
                            className="section-title"
                            style={{ width: '100%', justifyContent: 'space-between', background: 'transparent', border: 'none', paddingBottom: 15, cursor: 'pointer' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <CreditCard size={20} className="text-secondary" /> Datos de Transferencia
                            </span>
                            <ChevronDown size={18} style={{ transform: expandedSection === 'bank' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>
                    ) : (
                        <h3 className="section-title"><CreditCard size={20} className="text-secondary" /> Datos de Transferencia</h3>
                    )}
                    {(!isMobile || expandedSection === 'bank') && (
                    <>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: 20 }}>
                        Estos datos se mostrarán cuando el cliente elija "Pagar con Transferencia" en este local.
                    </p>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Banco</label>
                            <div className="input-icon-wrapper">
                                <CreditCard size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.bank_name}
                                    onChange={e => setFormData({...formData, bank_name: e.target.value})}
                                    placeholder="Ej. Banco Estado"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Tipo de Cuenta</label>
                            <div className="input-icon-wrapper">
                                <CreditCard size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.account_type}
                                    onChange={e => setFormData({...formData, account_type: e.target.value})}
                                    placeholder="Ej. Cuenta RUT, Cuenta Vista"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Número de Cuenta</label>
                            <div className="input-icon-wrapper">
                                <Hash size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.account_number}
                                    onChange={e => setFormData({...formData, account_number: e.target.value})}
                                    placeholder="Ej. 12345678-9"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>RUT Titular</label>
                            <div className="input-icon-wrapper">
                                <User size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.account_rut}
                                    onChange={e => setFormData({...formData, account_rut: e.target.value})}
                                    placeholder="Ej. 12.345.678-9"
                                />
                            </div>
                        </div>
                        <div className="form-group full-width">
                            <label>Correo Electrónico</label>
                            <div className="input-icon-wrapper">
                                <Mail size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.account_email}
                                    onChange={e => setFormData({...formData, account_email: e.target.value})}
                                    placeholder="Ej. contacto@negocio.cl"
                                    type="email"
                                />
                            </div>
                        </div>
                        <div className="form-group full-width">
                            <label>Nombre del Titular</label>
                            <div className="input-icon-wrapper">
                                <User size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.account_holder}
                                    onChange={e => setFormData({...formData, account_holder: e.target.value})}
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                        </div>
                    </div>
                    </>
                    )}
                </section>

            </form>
        </div>
    );
};

export default AdminSettings;
