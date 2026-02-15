import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';

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
            // 1. Subida de comprobante (si aplica)
            let receiptUrl = null;
            if (orderData.payment_type === 'online' && receiptFile) {
                receiptUrl = await uploadImage(receiptFile, 'receipts');
            }

            // 2. Lógica de Cliente (Upsert)
            const clientId = await this._ensureClient(orderData);

            // 3. Inserción del Pedido
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert({
                    client_id: clientId,
                    client_name: orderData.client_name,
                    client_rut: orderData.client_rut || '',
                    client_phone: orderData.client_phone,
                    items: orderData.items,
                    total: orderData.total,
                    payment_type: orderData.payment_type,
                    payment_ref: receiptUrl || orderData.payment_ref || (orderData.payment_type === 'online' ? '' : 'Pago Presencial'),
                    note: orderData.note,
                    status: orderData.status || 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();

            if (orderError) throw orderError;
            return newOrder;
        } catch (error) {
            console.error('Error in ordersService.createOrder:', error);
            throw error;
        }
    },

    /**
     * Asegura que el cliente exista y actualiza sus estadísticas
     * @private
     */
    async _ensureClient(orderData) {
        const { client_rut, client_name, client_phone, total } = orderData;

        // Determinar un RUT único si no viene
        const rutToUse = client_rut && client_rut.length > 7
            ? client_rut
            : `SIN-RUT-${Date.now().toString().slice(-6)}`;

        // 1. Buscar cliente
        const { data: clients, error: searchError } = await supabase
            .from('clients')
            .select('id, total_spent, total_orders')
            .eq('rut', rutToUse);

        if (searchError) throw searchError;

        const existingClient = clients?.[0];

        if (existingClient) {
            // 2. Actualizar existente
            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    name: client_name,
                    phone: client_phone,
                    total_spent: (existingClient.total_spent || 0) + total,
                    total_orders: (existingClient.total_orders || 0) + 1,
                    last_order_at: new Date().toISOString(),
                })
                .eq('id', existingClient.id);

            if (updateError) throw updateError;
            return existingClient.id;
        } else {
            // 3. Crear nuevo
            const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert({
                    name: client_name,
                    phone: client_phone,
                    rut: rutToUse,
                    total_spent: total,
                    total_orders: 1,
                    last_order_at: new Date().toISOString()
                })
                .select('id')
                .maybeSingle();

            if (createError) throw createError;
            return newClient.id;
        }
    }
};

// Mantener compatibilidad con exportación antigua si se requiere
export const createManualOrder = (orderData, receiptFile) => ordersService.createOrder(orderData, receiptFile);
