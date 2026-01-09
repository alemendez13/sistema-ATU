/**
 * 🛠️ UTILERÍAS CENTRALIZADAS SANSCE v2.0
 * SSOT (Single Source of Truth) para lógica transversal.
 */

/**
 * 1. NORMALIZACIÓN DE TEXTO
 * Limpia espacios y estandariza a mayúsculas para búsquedas.
 */
export const normalizeText = (text: string | null | undefined): string => {
    if (!text) return "";
    return text.trim().toUpperCase();
};

/**
 * 2. LIMPIEZA DE PRECIOS Y MONTOS (Robustecida)
 * Maneja strings con símbolos ($ , %), números y valores nulos.
 */
export const cleanPrice = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') return value;
    if (!value || value === "") return 0;
    
    // Elimina $, comas, porcentajes y espacios
    const cleaned = value.toString().replace(/[$,%\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * 3. FORMATEO DE MONEDA PARA UI
 * Convierte un número en un string legible MXN (Ej: $1,250.00).
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
    const numericAmount = typeof amount === 'number' ? amount : cleanPrice(amount);
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(numericAmount);
};

/**
 * 4. CÁLCULO DE EDAD (Centralizado)
 * Acepta string ISO (YYYY-MM-DD) o Date object.
 */
export const calculateAge = (birthDate: string | Date | null | undefined): number | string => {
    if (!birthDate) return "?";
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    if (isNaN(birth.getTime())) return "?";

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age >= 0 ? age : "?";
};

/**
 * 5. FORMATEO DE FECHA UNIVERSAL
 * Maneja Firebase.
 */
export const formatDate = (dateInput: any, format: 'short' | 'long' | 'iso' = 'short'): string => {
    if (!dateInput) return "S/F";

    // ✅ PROTECCIÓN: Si ya viene como string YYYY-MM-DD, lo devolvemos tal cual para evitar desfases (Caso Obed)
    if (typeof dateInput === 'string' && dateInput.includes('-')) return dateInput;

    let date: Date;
    if (dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
    } else {
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return "Fecha inválida";

    // ✅ Forzamos el uso de la fecha local sin ajustes de UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (format === 'iso') return `${year}-${month}-${day}`;

    const options: Intl.DateTimeFormatOptions = format === 'long' 
        ? { day: '2-digit', month: 'short', year: 'numeric' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' };

    return date.toLocaleDateString('es-MX', options);
};

/**
 * 6. MATEMÁTICA DE TIEMPO (Agenda)
 * Suma cualquier cantidad de minutos (30, 60, 90, etc.) a un string de hora (HH:mm).
 * La duración se toma automáticamente de lo que especifiques en tu catálogo de servicios.
 */
export const addMinutesToTime = (time: string, minutes: number): string => {
    if (!time || !time.includes(':')) return time; // Protección por si la hora viene mal
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    // Devuelve la hora siempre con dos dígitos (ej: 09:05 en lugar de 9:5)
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

/**
 * 7. GENERADOR DE FOLIOS (Norma GEC-FR-02)
 */
export const generateFolio = (codigo: string, docId: string): string => {
  const cleanCode = codigo.replace(/-/g, '').toUpperCase();
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const shortId = docId ? docId.slice(-6).toUpperCase() : "TEMP";
  return `${cleanCode}-${dateStr}-${shortId}`;
};

/**
 * 8. TRADUCTOR DE PLANTILLAS WHATSAPP
 */
export const parseWhatsAppTemplate = (template: string, data: {
    pacienteNombre?: string,
    fecha?: string,
    hora?: string,
    doctorNombre?: string
}): string => {
    if (!template) return "";

    // Limpieza de caracteres extraños que vienen de Google Sheets
    const cleanTemplate = template
        .normalize("NFC")
        .replace(/\uFFFD/g, ''); // Elimina el símbolo de rombo si ya viene roto

    return cleanTemplate
        .replace(/\[Día de la semana y fecha\]/g, data.fecha || "Próximamente")
        .replace(/\[Hora\]/g, data.hora || "--:--")
        .replace(/\[Nombre\]/g, data.pacienteNombre || "Paciente")
        .replace(/\[Doctor\]/g, data.doctorNombre || "Profesional SANSCE")
        .replace(/\[nombrePaciente\]/g, data.pacienteNombre || "Paciente");
};

/**
 * 9. GENERADOR DE TAGS DE BÚSQUEDA
 * Convierte "Juan Perez Garcia" en ["JUAN", "PEREZ", "GARCIA"]
 */
// NUEVA FUNCIÓN DE NORMALIZACIÓN PROFUNDA
export const superNormalize = (text: string): string => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remueve acentos y diacríticos
        .trim()
        .toUpperCase();
};

// ACTUALIZACIÓN DEL GENERADOR DE TAGS
export const generateSearchTags = (nombre: string): string[] => {
    if (!nombre) return [];
    // Aplicamos superNormalize antes de generar el array de búsqueda
    const nombreLimpio = superNormalize(nombre);
    const palabras = nombreLimpio.split(/\s+/);
    return Array.from(new Set(palabras));
};