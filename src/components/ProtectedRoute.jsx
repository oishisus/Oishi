import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Escuchar cambios PRIMERO (Fuente de verdad)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    // 2. Verificar estado inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session) {
          setSession(session); // Solo actualizar si hay sesión para evitar flash
          setLoading(false);
        } else {
          // Si no hay sesión inicial, dejamos que onAuthStateChange decida, 
          // O si ya pasó un tiempo prudente, asumimos logout.
          // Pero generalmente getSession es definitivo si no hay nada en storage.
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#050505' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
