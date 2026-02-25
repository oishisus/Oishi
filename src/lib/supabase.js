import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_PRUEBA_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_PRUEBA_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = '[Supabase] Faltan VITE_PRUEBA_SUPABASE_URL o VITE_PRUEBA_SUPABASE_ANON_KEY en .env.local';
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      Accept: 'application/json'
    }
  }
});
