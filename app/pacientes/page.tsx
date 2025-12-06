import { getMensajesWhatsApp } from "../../lib/googleSheets";
import DirectoryClient from "../../components/pacientes/DirectoryClient";
import ProtectedRoute from "../../components/ProtectedRoute"; 

// Esto fuerza a que la página se regenere en cada visita (no caché vieja)
export const dynamic = 'force-dynamic'; 

export default async function Page() {
  // 1. Obtenemos los mensajes del Excel (Lado Servidor)
  // Como esto viene de Google Sheets, ya son objetos simples (strings), no hay riesgo de Timestamp
  const mensajes = await getMensajesWhatsApp();

  // 2. Se los pasamos al cliente
  return (
    <ProtectedRoute>
      <DirectoryClient mensajesPredefinidos={mensajes} />
    </ProtectedRoute>
  );
}