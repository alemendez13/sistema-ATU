/* app/reportes/conciliacion-lab/page.tsx */
import { getCatalogoLaboratorio } from "../../../lib/googleSheets"; 
import ProtectedRoute from "../../../components/ProtectedRoute";
import ConciliacionClient from "./ConciliacionClient"; 

export default async function ConciliacionPage() {
  // Obtenemos el catálogo maestro con los COSTOS DEL PROVEEDOR
  const catalogo = await getCatalogoLaboratorio();

  return (
    <ProtectedRoute>
       <ConciliacionClient catalogo={catalogo} />
    </ProtectedRoute>
  );
}