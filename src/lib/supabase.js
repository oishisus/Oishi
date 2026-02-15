import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const useMcp = import.meta.env.VITE_SUPABASE_USE_MCP === 'true';
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_REF || '';

// Construir la URL del cliente: usar MCP si está habilitado y se proporcionó project ref
const clientUrl = (useMcp && projectRef)
  ? `https://mcp.supabase.com/mcp?project_ref=${projectRef}`
  : supabaseUrl;

export const supabase = createClient(clientUrl, supabaseAnonKey, {
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
