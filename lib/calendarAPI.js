import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// 1. Configuración de la "Llave Maestra" (Service Account)
export const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
    : undefined,
  scopes: ['https://www.googleapis.com/auth/calendar'], 
});

// 2. Inicializar Google Calendar
export const calendar = google.calendar({
  version: 'v3',
  auth: serviceAccountAuth
});

// 3. Mapa de Doctores (IDs de Calendario)
export const CALENDAR_IDS = {
    // TIPS: 
    // - Si es el calendario principal de una cuenta, el ID es el CORREO (ej: doctor@gmail.com)
    // - Si es un calendario secundario, el ID es largo y termina en @group.calendar.google.com
    'MED001': 'administracion@sansce.com', // <--- CAMBIA ESTO POR TU ID REAL
    'MED002': 'OTRO_ID_REAL@group.calendar.google.com',
};