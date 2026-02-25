import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, MapPin } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';

const InventoryItemModal = ({ isOpen, onClose, onItemSaved, itemToEdit = null, showNotify, branchId, branches }) => {
    const [formData, setFormData] = useState({
        name: '',
        stock: 0,
        unit: 'un', // un, kg, g, lt, ml
        min_stock: 5,
        category: '',
        cost_per_unit: 0
    });
    const [selectedBranchIds, setSelectedBranchIds] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                name: itemToEdit.name || '',
                stock: itemToEdit.stock || 0,
                unit: itemToEdit.unit || 'un',
                min_stock: itemToEdit.min_stock || 0,
                category: itemToEdit.category || '',
                cost_per_unit: itemToEdit.cost_per_unit || 0
            });
            // Al editar, marcaríamos las sucursales donde ya existe? 
            // Por ahora, para simplificar y ver el requerimiento del usuario (crear), 
            // marcamos la actual o todas.
            if (branchId === 'all') {
                const existing = Array.isArray(itemToEdit.branch_ids) ? itemToEdit.branch_ids : [];
                setSelectedBranchIds(existing.length > 0 ? existing : branches.filter(b => b.id !== 'all').map(b => b.id));
            } else {
                setSelectedBranchIds([branchId]);
            }
        } else {
            // Reset
            setFormData({
                name: '',
                stock: 0,
                unit: 'un',
                min_stock: 5,
                category: '',
                cost_per_unit: 0
            });
            
            if (branchId === 'all') {
                setSelectedBranchIds(branches.filter(b => b.id !== 'all').map(b => b.id));
            } else {
                setSelectedBranchIds([branchId]);
            }
        }
    }, [itemToEdit, isOpen, branchId, branches]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let itemId = itemToEdit?.id;

            // 1. Save/Update Item Definition (Global)
            const itemData = {
                name: formData.name,
                unit: formData.unit,
                min_stock: formData.min_stock,
                category: formData.category,
                cost_per_unit: formData.cost_per_unit
            };

            const relevantBranches = branchId === 'all'
                ? branches.filter(b => b.id !== 'all' && selectedBranchIds.includes(b.id))
                : branches.filter(b => b.id !== 'all' && b.id === branchId);

            if (branchId === 'all' && relevantBranches.length === 0) {
                showNotify('Selecciona al menos una sucursal.', 'error');
                setLoading(false);
                return;
            }
            
            if (relevantBranches.length > 0) {
                itemData.company_id = relevantBranches[0].company_id;
            }

            if (itemToEdit) {
                const { error } = await supabase.from(TABLES.inventory_items).update(itemData).eq('id', itemId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from(TABLES.inventory_items).insert([itemData]).select().single();
                if (error) throw error;
                itemId = data.id;
            }

            // 2. Update Stock for Branch (Local)
            if (itemId && relevantBranches.length > 0) {
                for (const branch of relevantBranches) {
                    const { error: stockError } = await supabase.from(TABLES.inventory_branch).upsert({
                        inventory_item_id: itemId,
                        branch_id: branch.id,
                        current_stock: formData.stock,
                        min_stock: formData.min_stock 
                    }, { onConflict: 'inventory_item_id, branch_id' });
                    
                    if (stockError) throw stockError;
                }
            }

            showNotify(itemToEdit ? 'Insumo actualizado' : 'Insumo creado', 'success');
            onItemSaved();
            onClose();
        } catch (error) {
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
                            <label>Costo por Unidad ($)</label>
                            <input 
                                type="number"
                                className="form-input"
                                value={formData.cost_per_unit}
                                onChange={e => setFormData({...formData, cost_per_unit: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
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

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
                        <div className="form-group">
                            <label>Stock Mínimo (Alerta)</label>
                            <input 
                                type="number"
                                className="form-input"
                                value={formData.min_stock}
                                onChange={e => setFormData({...formData, min_stock: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <MapPin size={16} className="text-accent" />
                            Registrar en Sucursales:
                        </label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                            gap: 10,
                            padding: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            {branches.filter(b => b.id !== 'all').map(branch => (
                                <label key={branch.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: selectedBranchIds.includes(branch.id) ? 'white' : '#9ca3af'
                                }}>
                                    <input 
                                        type="checkbox"
                                        checked={selectedBranchIds.includes(branch.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedBranchIds([...selectedBranchIds, branch.id]);
                                            } else {
                                                setSelectedBranchIds(selectedBranchIds.filter(id => id !== branch.id));
                                            }
                                        }}
                                        style={{ accentColor: 'var(--accent-color)' }}
                                    />
                                    {branch.name}
                                </label>
                            ))}
                        </div>
                        {selectedBranchIds.length === 0 && (
                            <p style={{ color: '#ff4444', fontSize: '0.75rem', marginTop: 5 }}>
                                * Debes seleccionar al menos una sucursal.
                            </p>
                        )}
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
