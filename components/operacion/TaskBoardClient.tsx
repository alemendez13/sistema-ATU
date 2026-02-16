"use client";

import React, { useState } from 'react';
import { LayoutList, GanttChartSquare, Filter, Plus, X } from 'lucide-react'; // 🆕 Añadimos Plus y X
import { updateTaskStatusAction } from '@/lib/actions';
import TaskListView from './TaskListView';
import GanttView from './GanttView';
import MinutaForm from './MinutaForm'; // 🆕 Importamos el formulario

export default function TaskBoardClient({ 
  initialTasks, 
  initialHitos, 
  personal // 🆕 Recibimos la lista de personal
}: { 
  initialTasks: any[], 
  initialHitos: any[],
  personal: any[] 
}) {
  const [view, setView] = useState<'lista' | 'cronograma'>('lista');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // 🆕 Interruptor para la ventana

  const handleToggleStatus = async (id: string, nextStatus: string) => {
    setLoadingId(id);
    // Ahora enviamos el nuevo estado exacto (Pendiente, En Proceso o Cumplida)
    const result = await updateTaskStatusAction(id, nextStatus);
    if (result.success) {
      window.location.reload(); 
    } else {
      alert("No pudimos actualizar la tarea: " + result.error);
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* SECTOR DE PESTAÑAS */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-200">
        <div className="flex p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setView('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              view === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutList size={18} /> Vista de Lista
          </button>
          <button
            onClick={() => setView('cronograma')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              view === 'cronograma' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <GanttChartSquare size={18} /> Cronograma (Gantt)
          </button>

          </div>

        {/* 🆕 BOTÓN LLAMATIVO: NUEVA MINUTA */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Nueva Minuta / Acuerdos
        </button>

        <div className="hidden sm:flex items-center gap-2 text-slate-400 px-4">
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-400 px-4">
          <Filter size={16} /> <span className="text-xs uppercase tracking-wider font-semibold">SANSCE OS v2.0</span>
        </div>
      </div>

      {/* ÁREA DE CONTENIDO MODULAR */}
      <div className="min-h-[400px]">
        {view === 'lista' ? (
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500">
            <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">Tareas Operativas</h2>
            <TaskListView 
              tasks={initialTasks} 
              loadingId={loadingId} 
              onToggleStatus={handleToggleStatus} 
            />
          </div>
        ) : (
          <GanttView hitos={initialHitos} />
        )}
      </div>
      {/* 🆕 VENTANA EMERGENTE (MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto overflow-x-hidden">
            {/* Botón para cerrar */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
            >
              <X size={24} />
            </button>
            
            <div className="p-2">
               <h2 className="text-2xl font-bold text-slate-800 p-8 pb-0">Registrar Nuevos Acuerdos</h2>
               {/* 🔗 Pasamos la lista de hitos que cargamos desde el servidor */}
               <MinutaForm personal={personal} hitos={initialHitos} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}