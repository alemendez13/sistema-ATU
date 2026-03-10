// app/operacion/minutas/page.tsx

// 🛡️ PROTOCOLO DE SINCRONIZACIÓN SANSCE OS: Forzamos datos frescos en cada carga
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getMedicos, getOperacionTareas, getOperacionCronograma, getOperacionMinutas } from "@/lib/googleSheets";
import MinutaForm from "@/components/operacion/MinutaForm";

export default async function MinutasPage() {
  // 🛡️ CARGA MULTICANAL SANSCE: Traemos el historial completo para el Motor de Memoria
  const [personal, tareas, hitos, historial] = await Promise.all([
    getMedicos(),
    getOperacionTareas(),
    getOperacionCronograma(),
    getOperacionMinutas() // 📜 Historial de acuerdos previos desde Sheets
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Orden del Día</h1>
          <p className="text-slate-500">Gestión de acuerdos, hitos y compromisos estratégicos</p>
        </header>

        {/* Inyectamos tareas e historial para habilitar el Radar Dinámico y la Burbuja de Memoria */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <MinutaForm 
            personal={personal} 
            tasks={tareas} 
            hitos={hitos} 
            history={historial} 
          />
        </div>
      </div>
    </main>
  );
}