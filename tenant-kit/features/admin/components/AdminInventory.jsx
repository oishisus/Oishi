import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, Plus, Trash2, Edit, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TABLES } from '../../../lib/supabaseTables';
import InventoryItemModal from './InventoryItemModal';
import '../styles/AdminInventory.css';
import { downloadExcel } from '../../../shared/utils/exportUtils';

const AdminInventory = ({ showNotify, branchId, branches }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const loadItems = useCallback(async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            // 1. Fetch all item definitions
            const { data: allItems, error: itemsError } = await supabase
                .from(TABLES.inventory_items)
                .select('*')
                .order('name');
            
            if (itemsError) throw itemsError;

            // 2. Fetch stock for current branch (or all branches for global view)
            let branchStock = [];
            
            let query = supabase.from(TABLES.inventory_branch).select('*');

            if (branchId !== 'all') {
                query = query.eq('branch_id', branchId);
            } else {
                // [FIX] Filtrar por los IDs de las sucursales disponibles
                const validBranchIds = branches.filter(b => b.id !== 'all').map(b => b.id);
                if (validBranchIds.length > 0) query = query.in('branch_id', validBranchIds);
            }

            const { data, error: stockError } = await query;
            
            if (stockError) throw stockError;
            branchStock = data || [];

            // 3. Merge data and Filter
            let mergedItems = (allItems || []).map(item => {
                const itemStocks = branchStock?.filter(s => s.inventory_item_id === item.id);
                
                // If specific branch, find that entry. If "all", sum them up.
                const stockEntry = branchId !== 'all' 
                    ? itemStocks.find(s => s.branch_id === branchId)
                    : null;
                
                const totalStock = branchId === 'all'
                    ? itemStocks.reduce((sum, s) => sum + (parseFloat(s.current_stock) || 0), 0)
                    : (parseFloat(stockEntry?.current_stock) || 0);

                const totalMinStock = branchId === 'all'
                    ? itemStocks.reduce((sum, s) => sum + (parseFloat(s.min_stock) || 0), 0)
                    : (parseFloat(stockEntry?.min_stock) || parseFloat(item.min_stock) || 0);

                return { 
                    ...item, 
                    stock: totalStock, 
                    min_stock: totalMinStock,
                    branch_relation_id: stockEntry?.id,
                    existsInBranch: !!stockEntry || branchId === 'all',
                    branch_ids: itemStocks.map(s => s.branch_id)
                };
            });

            // CRITICAL: Filter out items that don't belong to this branch
            if (branchId !== 'all') {
                mergedItems = mergedItems.filter(item => item.existsInBranch);
            }

            setItems(mergedItems);
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
    }, [showNotify, branchId]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este insumo?')) return;
        try {
            const { error } = await supabase
                .from(TABLES.inventory_items)
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

    const handleExport = () => {
        const dataToExport = filteredItems.map(item => ({
            Insumo: item.name,
            Categoria: item.category || 'Sin categoría',
            Stock: item.stock,
            Unidad: item.unit || '',
            Estado: item.stock <= 0 ? 'Agotado' : (item.stock <= item.min_stock ? 'Bajo' : 'OK')
        }));
        downloadExcel(dataToExport, `Inventario_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.xls`);
    };

    return (
        <div className="inventory-view animate-fade">
            <div className="inventory-header">
                <div>
                    <h1>Inventario de Insumos</h1>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: 5 }}>Gestiona tus materias primas y stock crítico.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-icon-text" style={{ background: 'white', color: '#333' }} onClick={handleExport}>
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
                branchId={branchId}
                branches={branches}
            />
        </div>
    );
};

export default AdminInventory;
