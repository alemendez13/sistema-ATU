/* app/reportes/conciliacion-lab/page.tsx */
import { Suspense } from 'react'; // 🟢 Importación vital
import { getLaboratorios } from "../../../lib/googleSheets";
import ProtectedRoute from "../../../components/ProtectedRoute";
import ConciliacionClient from "./ConciliacionClient"; 

export default async function ConciliacionPage() {
  const catalogo = await getLaboratorios();

  return (
    <ProtectedRoute>
      {/* 🟢 Creamos la sala de espera para el radar de URL */}
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500 font-medium italic">Sincronizando costos de laboratorio...</p>
        </div>
      }>
        <ConciliacionClient catalogo={catalogo} />
      </Suspense>
    </ProtectedRoute>
  );
}