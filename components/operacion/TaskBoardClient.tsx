"use client";

import React, { useState } from 'react';
import { LayoutList, GanttChartSquare, Filter } from 'lucide-react';
import { updateTaskStatusAction } from '@/lib/actions';
import TaskListView from './TaskListView';
import GanttView from './GanttView';

export default function TaskBoardClient({ initialTasks, initialHitos }: { initialTasks: any[], initialHitos: any[] }) {
  const [view, setView] = useState<'lista' | 'cronograma'>('lista');
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
    </div>
  );
}