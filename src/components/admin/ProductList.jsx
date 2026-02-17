import React, { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import InventoryCard from './InventoryCard';

const ProductList = ({ 
  products, 
  categories, 
  toggleProductActive, 
  setEditingProduct, 
  setIsModalOpen, 
  deleteProduct 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => filterCategory === 'all' || p.category_id === filterCategory);

  return (
    <div className="products-view animate-fade">
      <div className="admin-toolbar glass">
        <div className="search-box">
          <Search size={18} />
          <input 
            placeholder="Buscar plato..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="filter-box">
          <Filter size={18} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="inventory-grid">
        {filteredProducts.map(p => (
          <InventoryCard
            key={p.id}
            product={p}
            toggleProductActive={toggleProductActive}
            setEditingProduct={setEditingProduct}
            setIsModalOpen={setIsModalOpen}
            deleteProduct={deleteProduct}
          />
        ))}
        {filteredProducts.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
