import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_PRUEBA_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_PRUEBA_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
	const msg = '[Supabase] Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (o VITE_PRUEBA_*) en .env / .env.local';
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
