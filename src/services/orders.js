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
        const { client_rut, client_phone } = orderData;
        const hasValidRut = client_rut && client_rut.length > 7;

        if (hasValidRut) {
            // Estrategia Robusta: Buscar primero por RUT exacto
            const { data: byRut } = await supabase.from('clients').select('*').eq('rut', client_rut);
            
            if (byRut && byRut.length > 0) {
                // Existe por RUT -> Actualizar
                return await this._updateExistingClient(byRut[0], orderData);
            }

            // Si no hay RUT, buscar por teléfono
            const { data: byPhone } = await supabase.from('clients').select('*').eq('phone', client_phone);
             
            if (byPhone && byPhone.length > 0) {
                 // Existe por Teléfono -> Actualizar (y quizás asignarle el RUT nuevo)
                 return await this._updateExistingClient(byPhone[0], orderData);
            }

            // Nuevo Cliente con RUT
            return await this._createNewClient(orderData);

        } else {
            // Si no hay RUT en el pedido, solo buscar por teléfono
            const { data: byPhone } = await supabase.from('clients').select('*').eq('phone', client_phone);
            
            if (byPhone && byPhone.length > 0) {
                return await this._updateExistingClient(byPhone[0], orderData);
            }
            
            // Nuevo Cliente sin RUT (temporal)
            return await this._createNewClient(orderData);
        }
    },

    /**
     * Helper para actualizar cliente
     */
    async _updateExistingClient(existingClient, orderData) {
        const { client_rut, client_name, client_phone, total } = orderData;
        const hasValidRut = client_rut && client_rut.length > 7;

        const updateData = {
            name: client_name, // Nombre más reciente
            last_order_at: new Date().toISOString(),
            total_spent: (parseFloat(existingClient.total_spent) || 0) + parseFloat(total),
            total_orders: (existingClient.total_orders || 0) + 1,
            phone: client_phone // Actualizamos teléfono siempre al último usado
        };

        // Solo actualizamos el RUT si el cliente no tenía uno válido
        if (hasValidRut && (!existingClient.rut || existingClient.rut.startsWith('SIN-RUT'))) {
            updateData.rut = client_rut;
        }

        const { error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', existingClient.id);

        if (error) throw error;
        return existingClient.id;
    },

    /**
     * Helper para crear cliente
     */
    async _createNewClient(orderData) {
        const { client_rut, client_name, client_phone, total } = orderData;
        const hasValidRut = client_rut && client_rut.length > 7;

        const rutToSave = hasValidRut ? client_rut : `SIN-RUT-${Date.now().toString().slice(-6)}`;

        const { data: newClient, error } = await supabase
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
            .single();

        if (error) throw error;
        return newClient.id;
    }
};

// Mantener compatibilidad con exportación antigua si se requiere
export const createManualOrder = (orderData, receiptFile) => ordersService.createOrder(orderData, receiptFile);
