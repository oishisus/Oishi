import { useEffect } from 'react';

/**
 * Bloquea zoom por Ctrl+Scroll y atajos Ctrl/Cmd + + - = 0.
 * Usar una sola vez a nivel app (p. ej. en App.jsx) para evitar listeners duplicados.
 */
export function useAntiZoom() {
	useEffect(() => {
		const handleGestureStart = (e) => e.preventDefault();
		const handleWheel = (e) => {
			if (e.ctrlKey || e.metaKey) e.preventDefault();
		};
		const handleKeydown = (e) => {
			if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
				e.preventDefault();
			}
		};
		document.addEventListener('gesturestart', handleGestureStart);
		document.addEventListener('wheel', handleWheel, { passive: false });
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('gesturestart', handleGestureStart);
			document.removeEventListener('wheel', handleWheel);
			document.removeEventListener('keydown', handleKeydown);
		};
	}, []);
}
