/* app/reportes/cotizacion-lab/page.tsx */
import { Suspense } from 'react'; // 🟢 Agregamos la zona de espera
import { getLaboratorios, getMedicos } from "../../../lib/googleSheets"; 
import ProtectedRoute from "../../../components/ProtectedRoute";
import ClientCotizador from "./ClientCotizador"; 

// 🛡️ CONFIGURACIÓN VITAL PARA NETLIFY
export const revalidate = 60; 
export const dynamic = 'force-dynamic';

export default async function CotizadorPage() {
  // 👇 AQUÍ ESTÁ LA CORRECCIÓN: Agregamos el tipo ": any[]" explícito
  let catalogo: any[] = [];
  let medicos: any[] = [];

  try {
    // Intentamos cargar los catálogos en paralelo
    const [dataLab, dataMed] = await Promise.all([
      getLaboratorios(),
      getMedicos()
    ]);
    catalogo = dataLab || [];
    medicos = dataMed || [];
  } catch (error) {
    console.error("⚠️ Error conectando con Google Sheets (Build Safe Mode):", error);
    // En caso de error, enviamos arrays vacíos para NO ROMPER EL BUILD
    catalogo = [];
    medicos = [];
  }

  return (
    <ProtectedRoute>
      {/* 🟢 Creamos la sala de espera para el radar de URL y buscador */}
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500 font-medium italic">Preparando cotizador de laboratorio...</p>
        </div>
      }>
        <ClientCotizador catalogo={catalogo} medicos={medicos} />
      </Suspense>
    </ProtectedRoute>
  );
}