import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';

export const createManualOrder = async (orderData, receiptFile) => {
    // 1. Upload Recibo (si aplica)
    let receiptUrl = null;
    if (orderData.payment_type === 'online' && receiptFile) {
        receiptUrl = await uploadImage(receiptFile, 'receipts');
    }

    // 2. Client Logic (Upsert)
    let clientId = null;

    // Buscar por RUT
    if (orderData.client_rut && orderData.client_rut.length > 7) {
        const { data: existingClient } = await supabase
            .from('clients')
            .select('id, total_spent, total_orders')
            .eq('rut', orderData.client_rut)
            .single();

        if (existingClient) {
            clientId = existingClient.id;
            await supabase.from('clients').update({
                name: orderData.client_name,
                phone: orderData.client_phone,
                total_spent: (existingClient.total_spent || 0) + orderData.total,
                total_orders: (existingClient.total_orders || 0) + 1,
                last_order_at: new Date().toISOString(),
            }).eq('id', clientId);
        } else {
            // Nuevo con RUT
            const { data: newClient } = await supabase.from('clients').insert({
                name: orderData.client_name,
                phone: orderData.client_phone,
                rut: orderData.client_rut,
                total_spent: orderData.total,
                total_orders: 1,
                last_order_at: new Date().toISOString()
            }).select('id').single();
            clientId = newClient.id;
        }
    } else {
        // Cliente sin RUT
        const { data: newClient } = await supabase.from('clients').insert({
            name: orderData.client_name,
            phone: orderData.client_phone,
            rut: 'SIN-RUT-' + Date.now().toString().slice(-4),
            total_spent: orderData.total,
            total_orders: 1,
            last_order_at: new Date().toISOString()
        }).select('id').single();
        clientId = newClient.id;
    }

    // 3. Crear Pedido
    const { error } = await supabase.from('orders').insert({
        client_id: clientId,
        client_name: orderData.client_name,
        client_rut: orderData.client_rut || '',
        client_phone: orderData.client_phone,
        items: orderData.items,
        total: orderData.total,
        payment_type: orderData.payment_type,
        payment_ref: receiptUrl ? receiptUrl : (orderData.payment_type === 'online' ? '' : 'Pago Presencial'),
        note: orderData.note,
        status: 'pending',
        created_at: new Date().toISOString()
    });

    if (error) throw error;
    return true;
};
