/* app/reportes/cotizacion-lab/page.tsx */
// ✅ MODIFICACIÓN: Cambiamos getCatalogoLaboratorio por getLaboratorios
import { getLaboratorios, getMedicos } from "../../../lib/googleSheets"; 
import ProtectedRoute from "../../../components/ProtectedRoute";
import ClientCotizador from "./ClientCotizador"; 

export default async function CotizadorPage() {
  // Cargamos ambos catálogos en paralelo para velocidad
  const [catalogo, medicos] = await Promise.all([
    // ✅ MODIFICACIÓN: Usamos la función correcta
    getLaboratorios(),
    getMedicos()
  ]);

  return (
    <ProtectedRoute>
       <ClientCotizador catalogo={catalogo} medicos={medicos} />
    </ProtectedRoute>
  );
}