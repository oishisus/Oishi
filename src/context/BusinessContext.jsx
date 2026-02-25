import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES } from '../lib/supabaseTables';
import { BusinessContext } from './BusinessContextInstance';
import { useLocation } from './useLocation';

/**
 * Mapea branch + empresa al formato businessInfo.
 * El nombre que se muestra (Home, título) es el de la EMPRESA (restaurante).
 * Teléfono, dirección, horario y datos bancarios son de la SUCURSAL seleccionada.
 */
function mapToBusinessInfo(branch, companyName) {
    if (!branch) {
        return {
            name: companyName || '',
            phone: '',
            instagram: '',
            address: '',
            schedule: '',
            bank_name: '',
            account_type: '',
            account_number: '',
            account_rut: '',
            account_email: '',
            account_holder: ''
        };
    }
    return {
        name: companyName || branch.name || '',
        phone: branch.phone || '',
        instagram: branch.instagram_url || branch.instagram || '',
        address: branch.address || '',
        schedule: branch.schedule || '',
        bank_name: branch.bank_name || '',
        account_type: branch.account_type || '',
        account_number: branch.account_number || '',
        account_rut: branch.account_rut || '',
        account_email: branch.account_email || '',
        account_holder: branch.account_holder || ''
    };
}

export const BusinessProvider = ({ children }) => {
    const { selectedBranch, allBranches, loadingBranches } = useLocation();
    const [companyName, setCompanyName] = useState('');

    const branch = selectedBranch || (allBranches && allBranches[0]) || null;
    const companyId = branch?.company_id || null;

    const fetchCompanyName = useCallback(async () => {
        if (!companyId) {
            setCompanyName('');
            return;
        }
        try {
            const { data } = await supabase
                .from(TABLES.companies)
                .select('name')
                .eq('id', companyId)
                .maybeSingle();
            setCompanyName(data?.name || '');
        } catch {
            setCompanyName('');
        }
    }, [companyId]);

    useEffect(() => {
        void Promise.resolve().then(fetchCompanyName);
    }, [fetchCompanyName]);

    const businessInfo = useMemo(
        () => mapToBusinessInfo(branch, companyName),
        [branch, companyName]
    );

    const loading = loadingBranches;

    useEffect(() => {
        if (businessInfo.name) document.title = businessInfo.name;
    }, [businessInfo.name]);

    const value = useMemo(() => ({
        businessInfo,
        loading,
        refreshBusinessInfo: fetchCompanyName
    }), [businessInfo, loading, fetchCompanyName]);

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};
