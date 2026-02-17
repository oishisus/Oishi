import React, { useState, useEffect } from 'react';
import { Save, Building, Phone, MapPin, Instagram, Clock, CreditCard, CheckCircle2, AlertCircle, User, Mail, Hash } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import "../styles/AdminSettings.css";

const AdminSettings = ({ showNotify }) => {
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
        account_email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dataId, setDataId] = useState(null); // ID de la fila para update

    const loadSettings = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('business_info')
                .select('*')
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows found

            if (data) {
                setFormData({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    instagram: data.instagram || '',
                    schedule: data.schedule || '',
                    bank_name: data.bank_name || '',
                    account_type: data.account_type || '',
                    account_number: data.account_number || '',
                    account_rut: data.account_rut || '',
                    account_email: data.account_email || ''
                });
                setDataId(data.id);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showNotify('Error al cargar configuración', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotify]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (dataId) {
                // Update
                const { error } = await supabase
                    .from('business_info')
                    .update(formData)
                    .eq('id', dataId);
                if (error) throw error;
                showNotify('Configuración actualizada', 'success');
            } else {
                // Insert (si la tabla estaba vacía)
                const { error } = await supabase
                    .from('business_info')
                    .insert([formData]);
                if (error) throw error;
                showNotify('Configuración creada', 'success');
                loadSettings(); // Recargar para obtener ID
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotify('Error al guardar configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-white">Cargando configuración...</div>;

    return (
        <div className="settings-container animate-fade">
            <header className="settings-header">
                <div>
                    <h1>Configuración del Negocio</h1>
                    <p style={{ color: '#9ca3af', marginTop: 5 }}>Gestiona la información pública de tu local.</p>
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
                
                {/* Info Básica */}
                <section className="settings-section">
                    <h3 className="section-title"><Building size={20} className="text-secondary" /> Información Básica</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nombre del Negocio</label>
                            <div className="input-icon-wrapper">
                                <Building size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej. Oishi Sushi"
                                />
                            </div>
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
                </section>

                {/* Ubicación y Redes */}
                <section className="settings-section">
                    <h3 className="section-title"><MapPin size={20} className="text-secondary" /> Ubicación y Redes</h3>
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
                            <label>Instagram</label>
                            <div className="input-icon-wrapper">
                                <Instagram size={16} className="input-icon" />
                                <input 
                                    className="form-input with-icon"
                                    value={formData.instagram}
                                    onChange={e => setFormData({...formData, instagram: e.target.value})}
                                    placeholder="@usuario"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Horarios y Pagos */}
                <section className="settings-section">
                    <h3 className="section-title"><Clock size={20} className="text-secondary" /> Horarios y Pagos</h3>
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
                </section>

                {/* Datos Bancarios */}
                <section className="settings-section">
                    <h3 className="section-title"><CreditCard size={20} className="text-secondary" /> Datos de Transferencia</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: 20 }}>
                        Estos datos se mostrarán cuando el cliente elija "Pagar con Transferencia"
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
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                        </div>
                    </div>
                </section>

            </form>
        </div>
    );
};

export default AdminSettings;
