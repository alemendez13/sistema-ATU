import { getOperacionChecklist } from "@/lib/googleSheets";
import { getDateId } from "@/lib/utils";
import ChecklistDaily from "../../../components/operacion/ChecklistDaily";
import Link from 'next/link'; // 🆕 Importado para navegación
import { ArrowLeft } from 'lucide-react'; // 🆕 Icono de regreso

export default async function ChecklistPage() {
  // 1. Obtenemos la fecha de hoy para filtrar los registros
  const today = getDateId();
  
  // 2. Cargamos la configuración (qué hay que hacer) y el log (qué se ha hecho)
  const { config, log } = await getOperacionChecklist();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/operacion/tareas" 
              className="p-2 bg-white border border-slate-200 rounded-full shadow-sm text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"
              title="Volver al Tablero"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Checklist de Cumplimiento</h1>
              <p className="text-slate-500 italic text-sm">Control de actividades de apertura, operación y cierre</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase block">Fecha de Registro</span>
            <span className="text-lg font-mono font-bold text-blue-600">{today}</span>
          </div>
        </header>

        {/* El Componente Interactivo que maneja los clics */}
        <ChecklistDaily 
          activities={config} 
          savedProgress={log} 
          currentDate={today} 
        />
      </div>
    </main>
  );
}