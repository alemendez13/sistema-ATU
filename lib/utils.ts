/**
 * 🛠️ UTILERÍAS CENTRALIZADAS SANSCE
 * Este archivo unifica la lógica de negocio para evitar errores 
 * de discrepancia entre módulos.
 */

/**
 * 1. NORMALIZACIÓN DE TEXTO
 * Limpia espacios y convierte a mayúsculas para asegurar
 * búsquedas consistentes en la base de datos.
 */
export const normalizeText = (text: string | null | undefined): string => {
    if (!text) return "";
    return text.trim().toUpperCase();
};

/**
 * 2. LIMPIEZA DE PRECIOS Y MONTOS
 * Convierte strings con formato moneda ($1,200.00) en números puros
 * para realizar cálculos matemáticos seguros.
 */
export const cleanPrice = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value || value === "") return 0;
    
    // Elimina $, comas y espacios
    const cleaned = value.toString().replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * 3. CÁLCULO DE EDAD EXACTA
 * Calcula la edad basándose en la fecha de nacimiento (YYYY-MM-DD)
 * comparándola con la fecha actual del servidor.
 */
export const calculateAge = (birthDate: string | null | undefined): number => {
    if (!birthDate) return 0;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    // Verificación de fecha válida
    if (isNaN(birth.getTime())) return 0;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Ajuste si aún no ha cumplido años en el mes actual
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age >= 0 ? age : 0;
};

/**
 * 4. FORMATEO DE MONEDA PARA UI
 * Convierte un número en un string legible para el usuario (Ej: $1,250.00)
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
};