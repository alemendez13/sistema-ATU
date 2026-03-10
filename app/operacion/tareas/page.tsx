// app/operacion/tareas/page.tsx
// 🛡️ PROTOCOLO DE SINCRONIZACIÓN SANSCE OS: Forzamos datos frescos en cada carga
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { 
  getOperacionTareas, 
  getOperacionCronograma, 
  getPersonalTodo, 
  getOperacionMinutas // 👈 1. Importamos el historial
} from "@/lib/googleSheets";
import { fetchOkrDataAction } from "@/lib/actions";
import TaskBoardClient from "../../../components/operacion/TaskBoardClient";
import Link from 'next/link'; 
import { ClipboardCheck } from 'lucide-react'; 

export default async function TareasPage() {
  // 1. CARGA MULTICANAL SANSCE: Traemos la "Memoria" junto con las tareas
  const [tareas, hitos, personal, historial] = await Promise.all([
    getOperacionTareas(),
    getOperacionCronograma(),
    getPersonalTodo(),
    getOperacionMinutas() // 👈 2. Conectamos la señal del historial
  ]);

  return (
    <div className="bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Encabezado Estilo App Externa */}
        <header className="mb-8 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Seguimiento de Tareas</h1>
            <p className="text-slate-500">Gestión operativa y compromisos estratégicos</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 🆕 BOTÓN DE ACCESO AL CHECKLIST */}
            <Link 
              href="/operacion/checklist"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 hover:border-blue-300 transition-all"
            >
              <ClipboardCheck size={18} className="text-blue-600" />
              Checklist Diario
            </Link>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
              {tareas.length} Tareas Activas
            </span>
          </div>
        </header>

        {/* El "Cerebro" del Tablero (Lógica de Filtros y Lista) */}
        <TaskBoardClient 
  initialTasks={tareas} 
  initialHitos={hitos} 
  personal={personal} 
  history={historial} // 👈 3. Inyectamos la señal al cliente
/>

      </div>
    </div>
  );
}