//app/operacion/v4-gestion/MainViewSwitcher.tsx
'use client';

import React, { useState } from 'react';
import { useHierarchy } from '@/components/v4/core/HierarchicalProvider';
import BubbleRenderer from '@/components/v4/core/BubbleRenderer';
import MiniGantt from '@/components/v4/core/MiniGantt'; 
import { TaskV4 } from '@/lib/v4/utils-hierarchy'; // 🛡️ Importamos la identidad de la tarea
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subWeeks, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MainViewSwitcher() {
  const { view, tasks } = useHierarchy();

  // 🧠 ESTADO ESTRATÉGICO: El cronograma inicia oculto (false) por defecto
  const [showGantt, setShowGantt] = useState(false);

  // --- LÓGICA DE SEGMENTACIÓN TEMPORAL (Sincronizada con Semáforo SANSCE) ---
  const hoyObj = new Date();
  const hoyStr = hoyObj.toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
  const finSemana = endOfWeek(hoyObj, { weekStartsOn: 1 });
  const finSemanaStr = format(finSemana, 'yyyy-MM-dd');

  // 1. Tareas de esta semana (Desde hoy hasta el domingo)
  const tareasSemanaActual = tasks.filter((t: TaskV4) => {
    const fecha = (t.fechaEntrega || "").trim();
    // Se muestran si vencen hoy o en lo que queda de la semana
    return fecha >= hoyStr && fecha <= finSemanaStr;
  });

  // 2. Histórico de Atrasos (Cualquier pendiente cuya fecha ya pasó)
  const tareasAtrasadas = tasks.filter((t: TaskV4) => {
    const fecha = (t.fechaEntrega || "").trim();
    // Si la fecha es menor a hoy y no está realizada, es un atraso oficial
    return fecha < hoyStr && t.estado !== 'Realizada' && fecha !== "";
  });

  // Renderizado según la vista seleccionada
  return (
    <div className="h-full w-full overflow-hidden">
      {view === 'cronograma' ? (
        /* 🏛️ MATRIZ DE GOBERNANZA SANSCE: Estructura de Scroll Sincronizado Global */
        <div className="h-full flex flex-col bg-white overflow-hidden">
          
          {/* CABECERA MAESTRA (Fija) */}
          <div className="flex-none bg-sansce-surface border-b flex items-center justify-between px-6 h-[69px] z-50 shadow-sm">
            <span className="text-[10px] font-black text-sansce-muted uppercase tracking-[0.2em]">Torre de Control de Proyectos</span>
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

          {/* CONTENEDOR DE SCROLL ÚNICO PARA COLUMNAS 1, 2, 3 Y 4 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="flex divide-x divide-sansce-border min-h-full">
              {/* BLOQUE A: JERARQUÍA (Columnas 1, 2 y 3) */}
              <div className={`${showGantt ? 'w-3/4' : 'w-full'} flex-none transition-all duration-500 ease-in-out`}>
                <BubbleRenderer 
                  customTasks={tasks} 
                  isGanttActive={showGantt}
                  onProjectExpand={() => !showGantt && setShowGantt(true)} 
                />
              </div>

              {/* BLOQUE B: CRONOGRAMA (Columna 4) */}
              {showGantt && (
                <div className="w-1/4 flex-none bg-sansce-bg/5 animate-in slide-in-from-right duration-500 ease-out">
                   <MiniGantt tasks={tasks} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. VISTAS LISTA Y MINUTA: BLOQUES VERTICALES (Punto 6 de Lista / Punto 3 de Minuta) */
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
  );
}