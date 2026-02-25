import React, { useState } from 'react';
import { X, Loader2, User, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import { formatRut, validateRut } from '../../../shared/utils/formatters';

const MAX_NAME_LENGTH = 200;
const MIN_PHONE_DIGITS = 9;

const sanitizeText = (value) => {
    if (value == null) return '';
    const raw = String(value).replace(/<[^>]*>?/gm, '').trim();
    return raw.slice(0, MAX_NAME_LENGTH);
};

const ClientFormModal = ({ isOpen, onClose, onClientCreated, showNotify }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        rut: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'rut') finalValue = formatRut(value);
        if (name === 'name') finalValue = sanitizeText(value);
        setFormData({ ...formData, [name]: finalValue });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const name = sanitizeText(formData.name);
        const phone = String(formData.phone ?? '').trim();
        const rut = String(formData.rut ?? '').trim();

        if (name.length < 2) {
            showNotify('El nombre debe tener al menos 2 caracteres', 'error');
            setLoading(false);
            return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < MIN_PHONE_DIGITS) {
            showNotify('El teléfono debe tener al menos 9 dígitos', 'error');
            setLoading(false);
            return;
        }
        if (rut && !validateRut(rut)) {
            showNotify('El RUT no es válido', 'error');
            setLoading(false);
            return;
        }

        try {
            // Validar teléfono duplicado
            const { data: existing } = await supabase
                .from(TABLES.clients)
                .select('id')
                .eq('phone', phone)
                .single();

            if (existing) {
                showNotify('Ya existe un cliente con este teléfono', 'error');
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from(TABLES.clients)
                .insert([{
                    name,
                    phone,
                    rut: rut || null,
                    total_spent: 0,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            showNotify('Cliente creado exitosamente', 'success');
            onClientCreated(data);
            onClose();
            setFormData({ name: '', phone: '', email: '', rut: '' });
        } catch (error) {
            console.error('Error creando cliente:', error);
            showNotify('Error al crear cliente', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay animate-fade">
            <div className="modal-content glass admin-modal" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Nuevo Cliente</h2>
                    <button onClick={onClose} className="btn-close"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label><User size={16} /> Nombre Completo *</label>
                        <input 
                            required
                            type="text" 
                            name="name"
                            className="form-input" 
                            placeholder="Ej: Juan Pérez"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label><Phone size={16} /> Teléfono *</label>
                        <div className="input-with-prefix">
                            <span className="prefix">+56</span>
                            <input 
                                required
                                type="tel" 
                                name="phone"
                                className="form-input" 
                                placeholder="912345678"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

<div className="form-group">
                        <label><FileText size={16} /> RUT (Opcional)</label>
                        <input 
                            type="text" 
                            name="rut"
                            className="form-input" 
                            placeholder="12.345.678-9"
                            value={formData.rut}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading || sanitizeText(formData.name).length < 2 || formData.phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientFormModal;
