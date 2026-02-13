export const formatRut = (rut) => {
    if (!rut) return '';
    let value = rut.replace(/[^0-9kK]/g, '');
    if (value.length > 1) {
        const dv = value.slice(-1);
        const cuerpo = value.slice(0, -1);
        let cuerpoFormateado = "";
        for (let i = cuerpo.length - 1, j = 1; i >= 0; i--, j++) {
            cuerpoFormateado = cuerpo.charAt(i) + cuerpoFormateado;
            if (j % 3 === 0 && i !== 0) {
                cuerpoFormateado = "." + cuerpoFormateado;
            }
        }
        return `${cuerpoFormateado}-${dv}`;
    }
    return value;
};

export const validateRut = (rut) => {
    if (!rut) return false;
    const clean = rut.replace(/[^0-9kK]/g, '');
    return clean.length >= 8;
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
    }).format(amount);
};

export const formatTimeElapsed = (dateString) => {
    const diff = new Date() - new Date(dateString);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
};
