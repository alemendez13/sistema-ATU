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