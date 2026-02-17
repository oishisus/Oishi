import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, Plus, Trash2, Edit, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import InventoryItemModal from './InventoryItemModal';
import '../styles/AdminInventory.css';

const AdminInventory = ({ showNotify }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name');
            
            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error loading inventory:', error);
            if (error.code === '42P01') {
                showNotify('Tabla inventory_items no existe. Ejecuta el script SQL.', 'error');
            } else {
                showNotify('Error al cargar inventario', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [showNotify]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este insumo?')) return;
        try {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            showNotify('Insumo eliminado', 'success');
            loadItems();
        } catch (error) {
            console.error(error);
            showNotify('Error al eliminar', 'error');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    // Resumen
    const summary = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;

        items.forEach(item => {
            if (item.stock <= 0) outOfStock++;
            else if (item.stock <= item.min_stock) lowStock++;
        });

        return { lowStock, outOfStock, total: items.length };
    }, [items]);

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="inventory-view animate-fade">
            <div className="inventory-header">
                <div>
                    <h1>Inventario de Insumos</h1>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: 5 }}>Gestiona tus materias primas y stock crítico.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-icon-text" style={{ background: 'white', color: '#333' }}>
                        <Download size={18} /> Exportar
                    </button>
                    <button className="btn btn-primary btn-icon-text" onClick={handleCreate}>
                        <Plus size={18} /> Nuevo Insumo
                    </button>
                </div>
            </div>

            <div className="inventory-summary glass">
                <div className="summary-item">
                    <Package size={20} className="text-secondary" style={{ marginRight: 8 }} />
                    {summary.total} Items Total
                </div>
                <div className="summary-item text-warning">
                    <AlertTriangle size={20} style={{ marginRight: 8 }} />
                    {summary.lowStock} Stock Bajo
                </div>
                <div className="summary-item text-danger">
                    <AlertTriangle size={20} style={{ marginRight: 8 }} />
                    {summary.outOfStock} Agotados
                </div>
                
                <div className="search-inventory">
                    <Search size={18} color="#9ca3af" />
                    <input 
                        type="text" 
                        placeholder="Buscar insumo..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'white' }}>Cargando inventario...</div>
            ) : filteredItems.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                    <p>No hay insumos registrados o no coinciden con la búsqueda.</p>
                    {items.length === 0 && (
                        <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: 15 }}>
                            Crear primer insumo
                        </button>
                    )}
                </div>
            ) : (
                <div className="inventory-table-container">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>INSUMO</th>
                                <th>CATEGORÍA</th>
                                <th>STOCK ACTUAL</th>
                                <th>UNIDAD</th>
                                <th>ESTADO</th>
                                <th style={{ textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => {
                                let statusBadge;
                                if (item.stock <= 0) statusBadge = <span className="stock-badge out">Agotado</span>;
                                else if (item.stock <= item.min_stock) statusBadge = <span className="stock-badge low">Bajo</span>;
                                else statusBadge = <span className="stock-badge available">OK</span>;

                                return (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td>{item.category || '-'}</td>
                                        <td style={{ fontWeight: 700, fontSize: '1rem' }}>
                                            {item.stock}
                                        </td>
                                        <td style={{ color: '#9ca3af' }}>{item.unit}</td>
                                        <td>{statusBadge}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="btn-icon-sm" 
                                                onClick={() => handleEdit(item)}
                                                style={{ marginRight: 8 }}
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-trash-sm" 
                                                onClick={() => handleDelete(item.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <InventoryItemModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onItemSaved={loadItems}
                itemToEdit={editingItem}
                showNotify={showNotify}
            />
        </div>
    );
};

export default AdminInventory;
