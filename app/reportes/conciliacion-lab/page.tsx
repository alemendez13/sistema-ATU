/* app/reportes/conciliacion-lab/page.tsx */
import { getLaboratorios } from "../../../lib/googleSheets"; // ⬅️ Cambio de nombre
import ProtectedRoute from "../../../components/ProtectedRoute";
import ConciliacionClient from "./ConciliacionClient"; 

export default async function ConciliacionPage() {
  // Obtenemos el catálogo maestro con los COSTOS DEL PROVEEDOR
const catalogo = await getLaboratorios(); // ⬅️ Cambio de nombre

  return (
    <ProtectedRoute>
       <ConciliacionClient catalogo={catalogo} />
    </ProtectedRoute>
  );
}