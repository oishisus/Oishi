/**
 * Validación de IDs antes de usarlos en consultas (evita inyección y valores malformados).
 * Acepta UUID v4 o IDs numéricos string (compatibilidad con distintos esquemas).
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d+$/;

export function isValidProductId(id) {
	if (id == null || typeof id !== 'string') return false;
	const s = String(id).trim();
	if (s.length === 0 || s.length > 64) return false;
	return UUID_REGEX.test(s) || NUMERIC_ID_REGEX.test(s);
}

export function filterValidProductIds(ids) {
	if (!Array.isArray(ids)) return [];
	return ids.filter(Boolean).filter(isValidProductId);
}

/** branch_id en Supabase suele ser UUID; slugs como "san-joaquin" provocan 400. */
export function isValidBranchId(id) {
	if (id == null || typeof id !== 'string') return false;
	const s = String(id).trim();
	if (s.length === 0 || s.length > 64) return false;
	return UUID_REGEX.test(s) || NUMERIC_ID_REGEX.test(s);
}
