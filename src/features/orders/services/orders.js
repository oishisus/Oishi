import { supabase } from '../../../lib/supabase';
import { uploadImage } from '../../../shared/utils/cloudinary';

/**
 * Servicio Senior de Órdenes
 * Encapsula la lógica de negocio de creación de pedidos tanto para 
 * clientes (Web) como para administración (Manual).
 */
export const ordersService = {
    /**
     * Crea un pedido completo vinculándolo a un cliente (o creando uno nuevo)
     */
    async createOrder(orderData, receiptFile = null) {
        try {
            // 0. VALIDACIÓN DE CAJA (REGLA DE NEGOCIO GLOBAL)
            if (!orderData.branch_id) {
                throw new Error("El ID de sucursal es obligatorio para crear un pedido.");
            }

            if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error("El pedido debe contener al menos un producto.");
            }

            const { data: openShift } = await supabase
                .from('cash_shifts')
                .select('id')
                .eq('status', 'open')
                .eq('branch_id', orderData.branch_id)
                .maybeSingle();

            if (!openShift) {
                throw new Error("El local no está recibiendo pedidos en este momento (Caja Cerrada). Por favor verifique el horario de atención.");
            }

            // [MEJORA DE SEGURIDAD] Recalcular total para evitar manipulación de precios
            const calculatedTotal = orderData.items.reduce((sum, item) => {
                // Priorizar precio de descuento si existe y es válido
                const price = (item.has_discount && item.discount_price && Number(item.discount_price) > 0) 
                    ? Number(item.discount_price) 
                    : Number(item.price || 0);
                
                const qty = Math.max(1, Number(item.quantity) || 1); // Asegurar cantidad positiva
                
                return sum + (price * qty);
            }, 0);

            const totalToUse = Math.abs(calculatedTotal - orderData.total) > 50
                ? calculatedTotal
                : orderData.total;

            // 1. Subida de comprobante (si aplica). Si falla, guardamos el pedido igual.
            let receiptUrl = null;
            let receiptUploadFailed = false;
            if (orderData.payment_type === 'online' && receiptFile) {
                try {
                    receiptUrl = await uploadImage(receiptFile, 'receipts');
                } catch (uploadErr) {
                    receiptUploadFailed = true;
                }
            }

            // 2. Preparar datos para la transacción
            const paymentRef = receiptUrl
                || orderData.payment_ref
                || (orderData.payment_type === 'online' ? 'Comprobante pendiente por WhatsApp' : 'Pago Presencial');

            // Agregar info de sucursal a la nota para que el admin sepa
            let finalNote = orderData.note || '';
            if (orderData.branch_name) {
                finalNote = `[Sucursal: ${orderData.branch_name}] \n${finalNote}`.trim();
            }

            // 3. EJECUTAR TRANSACCIÓN ATÓMICA (RPC)
            // Esto crea el cliente (o lo actualiza), crea el pedido y suma estadísticas en UN solo paso.
            const { data: newOrder, error: orderError } = await supabase.rpc('create_order_transaction', {
                p_client_name: orderData.client_name,
                p_client_phone: orderData.client_phone,
                p_client_rut: orderData.client_rut || '',
                p_items: orderData.items,
                p_total: totalToUse,
                p_payment_type: orderData.payment_type,
                p_payment_ref: paymentRef,
                p_note: finalNote,
                p_branch_id: orderData.branch_id,
                p_company_id: orderData.company_id || null, // [FIX] Enviar null explícito si es undefined
                p_status: orderData.status || 'pending'
            });

            if (orderError) throw orderError;

            return { order: newOrder, receiptUploadFailed };
        } catch (error) {
            throw error;
        }
    }
};

// Mantener compatibilidad con exportación antigua si se requiere
export const createManualOrder = (orderData, receiptFile) => ordersService.createOrder(orderData, receiptFile);
