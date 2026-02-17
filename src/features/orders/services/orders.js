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
            // 1. Subida de comprobante (si aplica). Si falla, guardamos el pedido igual.
            let receiptUrl = null;
            let receiptUploadFailed = false;
            if (orderData.payment_type === 'online' && receiptFile) {
                try {
                    receiptUrl = await uploadImage(receiptFile, 'receipts');
                } catch (uploadErr) {
                    console.warn('No se pudo subir comprobante, se guarda el pedido sin URL:', uploadErr);
                    receiptUploadFailed = true;
                }
            }

            // 2. Lógica de Cliente (Upsert)
            const clientId = await this._ensureClient(orderData);

            // 3. Inserción del Pedido
            const paymentRef = receiptUrl
                || orderData.payment_ref
                || (orderData.payment_type === 'online' ? 'Comprobante pendiente por WhatsApp' : 'Pago Presencial');

            // Agregar info de sucursal a la nota para que el admin sepa
            let finalNote = orderData.note || '';
            if (orderData.branch_name) {
                finalNote = `[Sucursal: ${orderData.branch_name}] \n${finalNote}`.trim();
            }

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
                    payment_ref: paymentRef,
                    note: finalNote,
                    status: orderData.status || 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();

            if (orderError) throw orderError;
            return { order: newOrder, receiptUploadFailed };
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

        // Escapar comillas dobles para filtros PostgREST (valores con puntos, espacios, etc.)
        const escape = (v) => (v ?? '').replace(/"/g, '""');
        const quoted = (v) => `"${escape(v)}"`;

        // 1. Intentar buscar cliente existente por Teléfono (Prioridad) o RUT
        let query = supabase.from('clients').select('*');

        if (hasValidRut) {
            query = query.or(`rut.eq.${quoted(client_rut)},phone.eq.${quoted(client_phone)}`);
        } else {
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
