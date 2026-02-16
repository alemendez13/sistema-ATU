"use client";

import React from 'react';

interface TaskListViewProps {
  tasks: any[];
  loadingId: string | null;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export default function TaskListView({ tasks, loadingId, onToggleStatus }: TaskListViewProps) {
  if (tasks.length === 0) {
    return <div className="text-center py-12 text-slate-400 font-medium">No hay tareas pendientes para mostrar.</div>;
  }

  return (
    <div className="grid gap-4">
      {tasks.map((tarea) => (
        <div 
          key={tarea.ID_Tarea}
          className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition-all border-l-8 ${
            tarea.Estado === 'Cumplida' ? 'opacity-60 border-slate-300 bg-slate-50' : 'border-blue-500'
          }`}
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {tarea.Area || 'General'}
              </span>
              <span className="text-xs text-slate-400 font-mono">#{tarea.ID_Tarea?.split('-')[1]}</span>
            </div>
            <p className={`text-slate-800 font-medium ${tarea.Estado === 'Cumplida' ? 'line-through' : ''}`}>
              {tarea.Descripcion}
            </p>
            {/* TRAZABILIDAD DE FECHAS */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 italic">
              <span className="flex items-center gap-1">
                📅 Inicio: <b className="text-slate-700">{tarea.FechaInicio || 'N/A'}</b>
              </span>
              <span className="flex items-center gap-1">
                🏁 Entrega: <b className="text-blue-700">{tarea.FechaEntrega || 'N/A'}</b>
              </span>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 sm:ml-6 flex items-center gap-3 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase text-slate-400 font-bold">Responsable</p>
              <p className="text-xs font-semibold text-slate-700">{tarea.EmailAsignado?.split('@')[0]}</p>
            </div>
            <button 
              onClick={() => {
                // Definimos el orden lógico: Pendiente -> En Proceso -> Cumplida
                const siguienteEstado = 
                  tarea.Estado === 'Pendiente' ? 'En Proceso' : 'Cumplida';
                onToggleStatus(tarea.ID_Tarea, siguienteEstado);
              }}
              disabled={loadingId === tarea.ID_Tarea || tarea.Estado === 'Cumplida'}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                tarea.Estado === 'Cumplida' 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 disabled:opacity-50'
              }`}
            >
              {loadingId === tarea.ID_Tarea ? '...' : (tarea.Estado === 'Cumplida' ? '✓ Hecha' : 'Marcar')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}