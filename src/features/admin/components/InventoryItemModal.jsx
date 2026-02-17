import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const InventoryItemModal = ({ isOpen, onClose, onItemSaved, itemToEdit = null, showNotify }) => {
    const [formData, setFormData] = useState({
        name: '',
        stock: 0,
        unit: 'un', // un, kg, g, lt, ml
        min_stock: 5,
        category: '',
        cost_price: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                name: itemToEdit.name || '',
                stock: itemToEdit.stock || 0,
                unit: itemToEdit.unit || 'un',
                min_stock: itemToEdit.min_stock || 0,
                category: itemToEdit.category || '',
                cost_price: itemToEdit.cost_price || 0
            });
        } else {
            // Reset
            setFormData({
                name: '',
                stock: 0,
                unit: 'un',
                min_stock: 5,
                category: '',
                cost_price: 0
            });
        }
    }, [itemToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (itemToEdit) {
                // Update
                const { error } = await supabase
                    .from('inventory_items')
                    .update(formData)
                    .eq('id', itemToEdit.id);
                if (error) throw error;
                showNotify('Insumo actualizado', 'success');
            } else {
                // Create
                const { error } = await supabase
                    .from('inventory_items')
                    .insert([formData]);
                if (error) throw error;
                showNotify('Insumo creado', 'success');
            }
            onItemSaved();
            onClose();
        } catch (error) {
            console.error('Error saving inventory item:', error);
            showNotify('Error al guardar insumo', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content glass animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2>{itemToEdit ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Nombre del insumo</label>
                        <input 
                            required
                            className="form-input"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="Ej. Arroz Grano Corto"
                        />
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="form-group">
                            <label>Stock Actual</label>
                            <input 
                                type="number"
                                className="form-input"
                                value={formData.stock}
                                onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Unidad</label>
                            <select 
                                className="form-select"
                                value={formData.unit}
                                onChange={e => setFormData({...formData, unit: e.target.value})}
                            >
                                <option value="un">Unidades (un)</option>
                                <option value="kg">Kilos (kg)</option>
                                <option value="g">Gramos (g)</option>
                                <option value="lt">Litros (lt)</option>
                                <option value="ml">Mililitros (ml)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                         <div className="form-group">
                            <label>Stock Mínimo (Alerta)</label>
                            <input 
                                type="number"
                                className="form-input"
                                value={formData.min_stock}
                                onChange={e => setFormData({...formData, min_stock: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Categoría</label>
                            <input 
                                className="form-input"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                placeholder="Ej. Abarrotes"
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Guardando...' : <><Save size={18} /> Guardar Insumo</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryItemModal;
