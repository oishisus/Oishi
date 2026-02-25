import { useContext } from 'react';
import { CashContext } from './CashContextInstance';

export const useCash = () => {
    const context = useContext(CashContext);
    if (!context) {
        throw new Error('useCash must be used within a CashProvider');
    }
    return context;
};
