/* app/reportes/cotizacion-lab/page.tsx */
import { getCatalogoLaboratorio, getMedicos } from "../../../lib/googleSheets"; 
import ProtectedRoute from "../../../components/ProtectedRoute";
import ClientCotizador from "./ClientCotizador"; 

export default async function CotizadorPage() {
  // Cargamos ambos catálogos en paralelo para velocidad
  const [catalogo, medicos] = await Promise.all([
    getCatalogoLaboratorio(),
    getMedicos()
  ]);

  return (
    <ProtectedRoute>
       <ClientCotizador catalogo={catalogo} medicos={medicos} />
    </ProtectedRoute>
  );
}