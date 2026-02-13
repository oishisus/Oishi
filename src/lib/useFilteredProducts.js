import { useMemo } from 'react';

/**
 * Hook para filtrar y ordenar productos.
 * @param {Array} products - Lista de productos.
 * @param {string} searchQuery - Texto de búsqueda.
 * @param {string} filterCategory - ID de categoría o 'all'.
 * @param {Function} [sortFn] - Función de ordenamiento opcional.
 * @returns {Array} Productos filtrados y ordenados.
 */
export function useFilteredProducts(products, searchQuery, filterCategory, sortFn) {
  return useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = filterCategory === 'all' || p.category_id === filterCategory;
      return matchesSearch && matchesCat;
    });
    if (sortFn) {
      filtered = [...filtered].sort(sortFn);
    }
    return filtered;
  }, [products, searchQuery, filterCategory, sortFn]);
}
