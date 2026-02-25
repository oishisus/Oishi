/**
 * Saneamiento de pedidos desde la BD (items JSONB, total, client_*, status, etc.)
 * Usado en Admin y en hooks que parsean órdenes.
 */
export function sanitizeOrder(rawOrder) {
	if (!rawOrder) return null;

	let cleanItems = [];
	if (rawOrder.items) {
		if (Array.isArray(rawOrder.items)) {
			cleanItems = rawOrder.items;
		} else if (typeof rawOrder.items === 'string') {
			try {
				const parsed = JSON.parse(rawOrder.items);
				cleanItems = Array.isArray(parsed) ? parsed : [];
			} catch {
				cleanItems = [];
			}
		}
	}

	return {
		...rawOrder,
		items: cleanItems,
		total: Number(rawOrder.total) || 0,
		client_name: rawOrder.client_name || 'Cliente Desconocido',
		client_rut: rawOrder.client_rut || 'Sin RUT',
		client_phone: rawOrder.client_phone || '',
		status: rawOrder.status || 'pending',
		created_at: rawOrder.created_at || new Date().toISOString(),
		payment_type: rawOrder.payment_type || 'unknown'
	};
}
