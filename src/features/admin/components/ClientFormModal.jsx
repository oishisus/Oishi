import React, { useState } from 'react';
import { X, Loader2, User, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validar teléfono duplicado
            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('phone', formData.phone)
                .single();

            if (existing) {
                showNotify('Ya existe un cliente con este teléfono', 'error');
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('clients')
                .insert([{
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email, // Si existe columna email
                    rut: formData.rut,
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
                        <label><Mail size={16} /> Email (Opcional)</label>
                        <input 
                            type="email" 
                            name="email"
                            className="form-input" 
                            placeholder="cliente@ejemplo.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
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
                            disabled={loading || !formData.name || !formData.phone}
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
