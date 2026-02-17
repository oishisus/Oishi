import { useContext } from 'react';
import { BusinessContext } from './BusinessContext';

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider. Make sure App.jsx wraps components with <BusinessProvider>');
    }
    return context;
};
