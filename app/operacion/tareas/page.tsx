import { getOperacionTareas, getOperacionCronograma, getMedicos } from "@/lib/googleSheets";
import { fetchOkrDataAction } from "@/lib/actions";
import TaskBoardClient from "../../../components/operacion/TaskBoardClient";

export default async function TareasPage() {
  // 1. Carga de datos desde el Servidor (Alta Velocidad)
  // Añadimos getMedicos() para que el formulario de Minuta tenga la lista de personal lista para el modal
  const [tareas, hitos, personal] = await Promise.all([
    getOperacionTareas(),
    getOperacionCronograma(),
    getMedicos()
  ]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Encabezado Estilo App Externa */}
        <header className="mb-8 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Seguimiento de Tareas</h1>
            <p className="text-slate-500">Gestión operativa y compromisos estratégicos</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
              {tareas.length} Tareas Activas
            </span>
          </div>
        </header>

        {/* El "Cerebro" del Tablero (Lógica de Filtros y Lista) */}
        <TaskBoardClient initialTasks={tareas} initialHitos={hitos} personal={personal} />
        
      </div>
    </main>
  );
}