import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
	const [session, setSession] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		const checkAdminAccess = async (nextSession) => {
			if (cancelled) return;
			if (!nextSession?.user?.email) {
				setSession(nextSession ?? null);
				setIsAdmin(false);
				setLoading(false);
				return;
			}

			const { data: isAdmin, error } = await supabase.rpc('is_admin');

			if (cancelled) return;
			if (error) {
				setIsAdmin(false);
			} else {
				setIsAdmin(!!isAdmin);
			}
			setSession(nextSession);
			setLoading(false);
		};

		// Primera vez: getSession (lee de storage). Si viene null, dar una oportunidad a que
		// Supabase restaure la sesión antes de redirigir (evita "se queda pegado" al recargar).
		supabase.auth.getSession()
			.then(async ({ data: { session: nextSession } }) => {
				if (cancelled) return;
				if (nextSession) {
					await checkAdminAccess(nextSession);
					return;
				}
				// Sesión null: esperar un instante por si el storage aún no estaba listo al recargar
				await new Promise(r => setTimeout(r, 200));
				if (cancelled) return;
				const { data: { session: retrySession } } = await supabase.auth.getSession();
				if (retrySession) {
					await checkAdminAccess(retrySession);
				} else {
					setSession(null);
					setIsAdmin(false);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setSession(null);
					setIsAdmin(false);
					setLoading(false);
				}
			});

		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
			if (cancelled) return;
			// Cuando la sesión se restaura (ej. al recargar), actualizar estado
			if (nextSession) checkAdminAccess(nextSession);
		});

		return () => {
			cancelled = true;
			subscription?.unsubscribe();
		};
	}, []);

	if (loading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#050505' }}>
				<Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
			</div>
		);
	}

	if (!session || !isAdmin) {
		return <Navigate to="/login" replace />;
	}

	return children;
};

export default ProtectedRoute;
