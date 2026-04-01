//app/operacion/v4-gestion/MainViewSwitcher.tsx
'use client';

import React, { useState } from 'react';
import { useHierarchy } from '@/components/v4/core/HierarchicalProvider';
import BubbleRenderer from '@/components/v4/core/BubbleRenderer';
import MiniGantt from '@/components/v4/core/MiniGantt'; 
import ProjectForm from '@/components/v4/forms/ProjectForm';
import ActivityForm from '@/components/v4/forms/ActivityForm';
import { TaskV4 } from '@/lib/v4/utils-hierarchy'; 
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subWeeks, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskForm from '@/components/v4/forms/TaskForm';

export default function MainViewSwitcher() {
  const { view, tasks } = useHierarchy();

  // 🧠 ESTADO ESTRATÉGICO: Gestión de Vistas y Modales de Creación
  const [showGantt, setShowGantt] = useState(false);
  const [activeModal, setActiveModal] = useState<'project' | 'activity' | 'task' | null>(null);

  // --- LÓGICA DE SEGMENTACIÓN TEMPORAL (Sincronizada con Semáforo SANSCE) ---
  const hoyObj = new Date();
  const hoyStr = hoyObj.toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
  const finSemana = endOfWeek(hoyObj, { weekStartsOn: 1 });
  const finSemanaStr = format(finSemana, 'yyyy-MM-dd');

  // 1. Tareas de esta semana (Desde hoy hasta el domingo)
  const tareasSemanaActual = tasks.filter((t: TaskV4) => {
    const fecha = (t.fechaEntrega || "").trim();
    return fecha >= hoyStr && fecha <= finSemanaStr;
  });

  // 2. Histórico de Atrasos (Cualquier pendiente cuya fecha ya pasó)
  const tareasAtrasadas = tasks.filter((t: TaskV4) => {
    const fecha = (t.fechaEntrega || "").trim();
    return fecha < hoyStr && t.estado !== 'Realizada' && fecha !== "";
  });

  // 🔍 EXTRACCIÓN DE PROYECTOS PARA VINCULACIÓN
  const proyectosExistentes = Array.from(new Set(tasks.map(t => t.proyecto))).filter(p => p && p !== 'Sin Proyecto');

  return (
    <div className="flex flex-col h-full bg-sansce-bg overflow-hidden">
      {/* 🕹️ CABECERA DE COMANDOS V4: Global y Unificada */}
      <div 
        style={{ height: 'var(--header-h)' }}
        className="flex-none sansce-glass border-b flex items-center justify-between px-6 z-50 shadow-sm"
      >
        <div className="flex items-center space-x-6">
          <span className="text-[10px] font-black text-sansce-muted uppercase tracking-[0.2em]">Comandos de Mando</span>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setActiveModal('project')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
            >
              + Nuevo Proyecto
            </button>
            <button 
              onClick={() => setActiveModal('activity')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
            >
              + Tipo Actividad
            </button>
            <button 
              onClick={() => setActiveModal('task')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
            >
              + Nueva Tarea
            </button>
          </div>
        </div>

        <button 
          onClick={() => setShowGantt(!showGantt)}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
            showGantt 
              ? 'bg-sansce-brand text-white shadow-premium scale-105' 
              : 'bg-sansce-surface text-sansce-brand border border-sansce-brand/20'
          }`}
        >
          {showGantt ? '✕ Ocultar Cronograma' : '📅 Ver Cronograma Operativo'}
        </button>
      </div>

      {/* ÁREA DE CONTENIDO DINÁMICO SEGÚN VISTA */}
      <div className="flex-1 overflow-hidden">
        {view === 'cronograma' ? (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
              <div className="flex divide-x divide-sansce-border min-h-full">
                <div className={`${showGantt ? 'w-3/4' : 'w-full'} flex-none transition-all duration-500`}>
                  <BubbleRenderer 
                    customTasks={tasks} 
                    isGanttActive={showGantt}
                    onProjectExpand={() => !showGantt && setShowGantt(true)} 
                  />
                </div>
                {showGantt && (
                  <div className="w-1/4 flex-none bg-sansce-bg/5 animate-in slide-in-from-right duration-500">
                     <MiniGantt tasks={tasks} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto p-8 space-y-12 bg-white">
            <section>
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-px flex-1 bg-blue-100"></div>
                <h2 className="text-sm font-black text-blue-600 uppercase tracking-tighter italic">
                  {view === 'minuta' ? 'TAREAS SEMANALES' : 'BLOQUE A: ESTA SEMANA'}
                </h2>
                <div className="h-px flex-1 bg-blue-100"></div>
              </div>
              <BubbleRenderer customTasks={tareasSemanaActual} />
            </section>
            <section>
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-px flex-1 bg-red-100"></div>
                <h2 className="text-sm font-black text-red-600 uppercase tracking-tighter italic">
                  BLOQUE B: HISTÓRICO DE ATRASOS
                </h2>
                <div className="h-px flex-1 bg-red-100"></div>
              </div>
              {tareasAtrasadas.length > 0 ? (
                <BubbleRenderer customTasks={tareasAtrasadas} />
              ) : (
                <div className="text-center p-10 border-2 border-dashed rounded-3xl text-slate-300 text-sm">
                  No hay tareas atrasadas de semanas anteriores.
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* 🎭 CAPA DE MODALES ESTRATÉGICOS (GOBERNANZA V4) */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sansce-text/20 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl border border-sansce-border animate-in zoom-in-95 duration-300">
            <div className="flex flex-col mb-8">
              <h2 className="text-2xl font-black text-sansce-text tracking-tighter uppercase leading-none">
                {activeModal === 'project' && 'Nuevo Proyecto Estratégico'}
                {activeModal === 'activity' && 'Nuevo Tipo de Actividad'}
                {activeModal === 'task' && 'Nueva Tarea Operativa'}
              </h2>
              <p className="text-[9px] font-bold text-sansce-muted uppercase tracking-[0.2em] mt-2">
                Inyección de datos a la Torre de Control
              </p>
            </div>

            {activeModal === 'project' && (
              <ProjectForm 
                onSuccess={() => { setActiveModal(null); window.location.reload(); }} 
                onCancel={() => setActiveModal(null)} 
              />
            )}

            {activeModal === 'activity' && (
              <ActivityForm 
                projects={proyectosExistentes}
                onSuccess={() => { setActiveModal(null); window.location.reload(); }} 
                onCancel={() => setActiveModal(null)} 
              />
            )}

            {activeModal === 'task' && (
              <TaskForm 
                tasks={tasks}
                onSuccess={() => { setActiveModal(null); window.location.reload(); }} 
                onCancel={() => setActiveModal(null)} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}