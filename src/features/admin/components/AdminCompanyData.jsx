import React, { useState, useEffect, useCallback } from 'react';
import { Save, Building2, Phone, MapPin, Mail, Hash, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import { useBusiness } from '../../../context/useBusiness';
import '../styles/AdminSettings.css';

/**
 * Datos de la empresa (globales, no por local).
 * Solo visible para usuarios con rol "admin" en admin_users.
 */
const AdminCompanyData = ({ showNotify, isMobile, branches, onBranchUpdate }) => {
    const { refreshBusinessInfo } = useBusiness();
    const [formData, setFormData] = useState({
        name: '',
        legal_rut: '',
        address: '',
        phone: '',
        email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyId, setCompanyId] = useState(null);
    const [expandedSection, setExpandedSection] = useState(() => (isMobile ? 'basic' : null));

    const companyIdFromBranches = branches?.length > 0 ? (branches[0].company_id || null) : null;

    const loadCompany = useCallback(async () => {
        if (!companyIdFromBranches) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.companies)
                .select('*')
                .eq('id', companyIdFromBranches)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setCompanyId(data.id);
                setFormData({
                    name: data.name || '',
                    legal_rut: data.legal_rut || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || ''
                });
            } else {
                setCompanyId(companyIdFromBranches);
            }
        } catch (error) {
            console.error('Error loading company:', error);
            showNotify('Error al cargar datos de la empresa', 'error');
        } finally {
            setLoading(false);
        }
    }, [companyIdFromBranches, showNotify]);

    useEffect(() => {
        loadCompany();
    }, [loadCompany]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!companyId && !companyIdFromBranches) {
            showNotify('No hay empresa asociada a las sucursales', 'error');
            return;
        }
        const id = companyId || companyIdFromBranches;
        setSaving(true);
        try {
            const payload = {
                name: formData.name || null,
                legal_rut: formData.legal_rut || null,
                address: formData.address || null,
                phone: formData.phone || null,
                email: formData.email || null
            };
            const { error } = await supabase
                .from(TABLES.companies)
                .update(payload)
                .eq('id', id);

            if (error) throw error;
            setCompanyId(id);

            if (onBranchUpdate) await onBranchUpdate();
            if (refreshBusinessInfo) await refreshBusinessInfo();

            showNotify('Datos de la empresa guardados correctamente', 'success');
        } catch (error) {
            console.error('Error saving company:', error);
            const msg = error?.message ? `${error.message}${error.code ? ` (${error.code})` : ''}` : 'Error al guardar';
            showNotify(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!companyIdFromBranches) {
        return (
            <div className="settings-container animate-fade">
                <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
                    <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
                        No hay sucursales con empresa asignada. Crea sucursales y asígnales una empresa para poder editar los datos aquí.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-10 text-center text-white">Cargando datos de la empresa...</div>;

    return (
        <div className="settings-container animate-fade">
            <header className="settings-header">
                <div>
                    <h1>Datos de la empresa</h1>
                    <p style={{ color: '#9ca3af', marginTop: 5 }}>Información legal y de contacto de la empresa (compartida por todos los locales).</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{ minWidth: 140 }}
                >
                    {saving ? 'Guardando...' : <><Save size={18} style={{ marginRight: 8 }} /> Guardar</>}
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
                                <Building2 size={20} className="text-secondary" /> Datos básicos
                            </span>
                            <ChevronDown size={18} style={{ transform: expandedSection === 'basic' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>
                    ) : (
                        <h3 className="section-title"><Building2 size={20} className="text-secondary" /> Datos básicos</h3>
                    )}
                    {(!isMobile || expandedSection === 'basic') && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre de la empresa</label>
                                <div className="input-icon-wrapper">
                                    <Building2 size={16} className="input-icon" />
                                    <input
                                        className="form-input with-icon"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Oishi Sushi SpA"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>RUT / Identificación legal</label>
                                <div className="input-icon-wrapper">
                                    <Hash size={16} className="input-icon" />
                                    <input
                                        className="form-input with-icon"
                                        value={formData.legal_rut}
                                        onChange={e => setFormData({ ...formData, legal_rut: e.target.value })}
                                        placeholder="Ej. 76.123.456-7"
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
                            onClick={() => setExpandedSection(prev => prev === 'contact' ? null : 'contact')}
                            className="section-title"
                            style={{ width: '100%', justifyContent: 'space-between', background: 'transparent', border: 'none', paddingBottom: 15, cursor: 'pointer' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Phone size={20} className="text-secondary" /> Contacto
                            </span>
                            <ChevronDown size={18} style={{ transform: expandedSection === 'contact' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>
                    ) : (
                        <h3 className="section-title"><Phone size={20} className="text-secondary" /> Contacto</h3>
                    )}
                    {(!isMobile || expandedSection === 'contact') && (
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Dirección fiscal / legal</label>
                                <div className="input-icon-wrapper">
                                    <MapPin size={16} className="input-icon" />
                                    <input
                                        className="form-input with-icon"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Ej. Av. Principal 123, Santiago"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <div className="input-icon-wrapper">
                                    <Phone size={16} className="input-icon" />
                                    <input
                                        className="form-input with-icon"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+56 9 ..."
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <div className="input-icon-wrapper">
                                    <Mail size={16} className="input-icon" />
                                    <input
                                        className="form-input with-icon"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="contacto@empresa.cl"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </form>
        </div>
    );
};

export default AdminCompanyData;
