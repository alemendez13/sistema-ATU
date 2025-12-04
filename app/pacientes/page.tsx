import { getMensajesWhatsApp } from "../../lib/googleSheets";
import DirectoryClient from "../../components/pacientes/DirectoryClient";
import ProtectedRoute from "../../components/ProtectedRoute"; // Asegúrate de la ruta correcta

export const dynamic = 'force-dynamic'; // Para que no se quede pegado en caché viejo

export default async function Page() {
  // 1. Obtenemos los mensajes del Excel (Lado Servidor)
  const mensajes = await getMensajesWhatsApp();

  // 2. Se los pasamos al cliente
  return (
    <ProtectedRoute>
      <DirectoryClient mensajesPredefinidos={mensajes} />
    </ProtectedRoute>
  );
}