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
        const hasValidRut = client_rut && client_rut.length > 7;

        // 1. Intentar buscar cliente existente por Teléfono (Prioridad por ser único) o RUT
        let query = supabase.from('clients').select('*');

        if (hasValidRut) {
            // Si tenemos RUT válido, buscamos coincidencia por RUT o por Teléfono
            query = query.or(`rut.eq.${client_rut},phone.eq.${client_phone}`);
        } else {
            // Si no hay RUT, buscamos por Teléfono
            query = query.eq('phone', client_phone);
        }

        const { data: foundClients, error: searchError } = await query;
        
        if (searchError) {
            console.error("Error buscando cliente:", searchError);
            throw searchError;
        }

        // Tomamos el primer match (dado que teléfono es único, debería ser uno solo)
        const existingClient = foundClients?.[0];

        if (existingClient) {
            // 2. Actualizar cliente existente
            const updateData = {
                name: client_name, // Actualizamos nombre reciente
                last_order_at: new Date().toISOString(),
                total_spent: (existingClient.total_spent || 0) + total,
                total_orders: (existingClient.total_orders || 0) + 1
            };

            // Si el cliente ya existe pero tenía un RUT temporal, y ahora traemos uno real, lo actualizamos
            if (hasValidRut && (!existingClient.rut || existingClient.rut.startsWith('SIN-RUT'))) {
                updateData.rut = client_rut;
            }
            // Si el cliente tiene un RUT real en BD, NO lo sobreescribimos con uno temporal,
            // pero sí actualizamos el teléfono si por alguna razón coinciden por RUT y no por teléfono.
            updateData.phone = client_phone;

            const { error: updateError } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', existingClient.id);

            if (updateError) throw updateError;
            return existingClient.id;
        } else {
            // 3. Crear nuevo cliente
            // Si no exite, usamos el RUT válido o generamos uno temporal
            const rutToSave = hasValidRut ? client_rut : `SIN-RUT-${Date.now().toString().slice(-6)}`;

            const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert({
                    name: client_name,
                    phone: client_phone,
                    rut: rutToSave,
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
