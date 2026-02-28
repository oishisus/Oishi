/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const LocationContext = createContext();

function getInitialBranch() {
  try {
    const saved = localStorage.getItem('selectedBranch');
    if (!saved) return { branch: null, hasValidBranch: false };
    const parsed = JSON.parse(saved);
    const hasValid = !!(parsed && parsed.id && typeof parsed.id === 'string' && parsed.id.length > 0);
    return { branch: hasValid ? parsed : null, hasValidBranch: hasValid };
  } catch (e) {
    return { branch: null, hasValidBranch: false };
  }
}

export const LocationProvider = ({ children }) => {
  const initial = getInitialBranch();
  const [selectedBranch, setSelectedBranch] = useState(initial.branch);
  const [allBranches, setAllBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(!initial.hasValidBranch);
  const publicCompanySlug = (import.meta.env.VITE_PUBLIC_COMPANY_SLUG || import.meta.env.VITE_COMPANY_SLUG || '').trim();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        if (!publicCompanySlug) {
          setAllBranches([]);
          setLoadingBranches(false);
          return;
        }

        const { data, error } = await supabase.rpc('get_public_branches', {
          p_company_slug: publicCompanySlug
        });

        if (error) throw error;

        const mappedBranches = (data || []).map(b => ({
          ...b,
          whatsappUrl: b.whatsapp_url,
          instagramUrl: b.instagram_url,
          mapUrl: b.map_url
        }));

        setAllBranches(mappedBranches);

        // Si la sucursal guardada tiene id inválido (ej. slug "san-joaquin") o ya no existe, limpiar
        setSelectedBranch(prev => {
          if (!prev?.id) return prev;
          const valid = mappedBranches.some(b => b.id === prev.id);
          if (!valid) {
            try { localStorage.removeItem('selectedBranch'); } catch (_) {}
            return null;
          }
          return prev;
        });
      } catch (err) {
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [publicCompanySlug]);

  // Efecto de seguridad: Si no hay branch, ABRIR SIEMPRE el modal
  React.useEffect(() => {
    if (!selectedBranch) {
      setIsLocationModalOpen(true);
    }
  }, [selectedBranch]);

  const selectBranch = (branch) => {
    setSelectedBranch(branch);
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
    setIsLocationModalOpen(false);
  };

  const clearBranch = () => {
    setSelectedBranch(null);
    localStorage.removeItem('selectedBranch');
    setIsLocationModalOpen(true);
  };

  return (
    <LocationContext.Provider value={{ 
      selectedBranch, 
      selectBranch, 
      clearBranch,
      isLocationModalOpen,
      setIsLocationModalOpen,
      allBranches,
      loadingBranches
    }}>
      {children}
    </LocationContext.Provider>
  );
};

// Note: `useLocation` hook is provided in `src/context/useLocation.js` to
// satisfy fast-refresh linting rules (files that export hooks should be
// separate from files that export components).
