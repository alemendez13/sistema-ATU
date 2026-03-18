/* lib/googleDrive.ts */
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// 🛡️ AUTENTICACIÓN SANSCE (Reutiliza tus credenciales de Sheets)
const driveAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth: driveAuth });

/**
 * 🚀 MOTOR SANSCE: Crear Carpeta de Expediente
 * Crea una carpeta privada en Drive y devuelve el ID para vincularlo al empleado.
 */
export async function createEmployeeFolder(nombreEmpleado: string) {
  try {
    // 🛡️ VALIDACIÓN SANSCE: Aseguramos que el ID de la carpeta raíz exista
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    if (!parentId) throw new Error("ID de carpeta raíz de Drive no configurado en Netlify/ENV");

    const fileMetadata = {
      name: `EXP-${nombreEmpleado.toUpperCase()}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId], 
    };

    // ⚡ EJECUCIÓN QUIRÚRGICA: Forzamos el tipo de respuesta para que VS Code no dude
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    } as any);

    return { success: true, folderId: (response as any).data.id };
  } catch (error: any) {
    console.error("❌ Error creando carpeta en Drive:", error);
    return { success: false, error: error.message || "Error desconocido" };
  }
}

/**
 * 🚀 MOTOR SANSCE: Listar Documentos
 * Obtiene los enlaces de los archivos dentro de la carpeta del empleado.
 */
export async function getEmployeeFiles(folderId: string) {
    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink, iconLink)',
      });
      return response.data.files || [];
    } catch (error) {
      console.error("❌ Error listando archivos de Drive:", error);
      return [];
    }
}