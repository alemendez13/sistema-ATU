//components/v4/core/MiniGantt.tsx
'use client';

import React from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
// 🛠️ IMPORTACIONES DE JERARQUÍA SANSCE:
import { TaskV4, buildHierarchicalTree, FASES_SANSCE } from '@/lib/v4/utils-hierarchy';
// 🛠️ CONEXIÓN AL CEREBRO MAESTRO:
import { useHierarchy } from './HierarchicalProvider';

export default function MiniGantt({ tasks }: { tasks: TaskV4[] }) {
  const { expanded } = useHierarchy(); // 📡 Escuchando señales de expansión global
  // 1. Generamos los próximos 4 meses para la visualización
  const hoy = new Date();
  const meses = [0, 1, 2, 3].map(i => {
    const d = addMonths(hoy, i);
    return {
      nombre: format(d, 'MMMM yyyy', { locale: es }),
      inicio: startOfMonth(d),
      fin: endOfMonth(d),
      dias: eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) })
    };
  });

  // 🚥 SEMÁFORO DE ALTA INTENSIDAD SANSCE (Gantt Edition)
  const getBarColor = (task: TaskV4) => {
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
    const fechaEntrega = (task.fechaEntrega || "").trim();

    // 🟢 REALIZADA: Verde Esmeralda 600 (Sólido para máxima visibilidad)
    if (task.estado === 'Realizada') {
      return 'bg-emerald-600 border-emerald-700 shadow-[0_0_8px_rgba(5,150,105,0.3)] text-white';
    }

    // 🔴 ATRASADA: Carmesí Rose 600 (Alerta visual crítica)
    if (fechaEntrega < hoy) {
      return 'bg-rose-600 border-rose-700 shadow-[0_0_10px_rgba(225,29,72,0.4)] text-white';
    }

    // 🟡 EN PROCESO: Ámbar 500 (Operación activa)
    return 'bg-amber-500 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.3)] text-white';
  };

  return (
    <div className="flex-1 overflow-x-auto custom-scrollbar bg-white/50">
      <div className="inline-flex min-w-full flex-col">
        {/* 📅 CABECERA DE MESES (Sincronizada a 48px y Sticky en 80px) */}
        <div className="flex border-b sticky top-[56px] bg-white z-40 h-12 shadow-sm">
          {meses.map(mes => (
            <div key={mes.nombre} className="border-r last:border-0 flex items-center justify-center min-w-[200px] flex-1 bg-white">
              <span className="text-[9px] font-black uppercase text-sansce-brand tracking-widest italic">
                {mes.nombre}
              </span>
            </div>
          ))}
        </div>

        {/* 🛤️ MATRIZ DE TIEMPO SINCRONIZADA (Reflejo de Jerarquía SANSCE) */}
        <div className="bg-white/30">
          {Object.keys(buildHierarchicalTree(tasks)).map((proyecto) => (
            <div key={proyecto + 'gantt'}>
              {/* ESPACIADOR DE PROYECTO (Fijo 56px) */}
              <div className="h-14 border-b border-sansce-border/20 bg-sansce-surface/30" />
              
              {expanded.includes(proyecto) && (
                <div className="animate-in fade-in duration-500">
                  {/* ESPACIADOR DE CABECERAS DE COLUMNA (Fijo 48px) */}
                  <div className="h-12 border-b border-sansce-border/10 bg-white/50" />

                  {/* 🚀 COMPENSADOR DE PADDING: Sincroniza el inicio con el p-4 del explorador */}
                  <div className="h-4" />

                  {FASES_SANSCE.map((fase: string) => 
                    Object.keys(buildHierarchicalTree(tasks)[proyecto][fase]).map((actividad: string) => {
                      const isActivityExpanded = expanded.includes(proyecto + fase + actividad);
                      if (!isActivityExpanded) return null;

                      return (
                        <div key={actividad + 'gantt-group'} className="animate-in zoom-in-95 duration-200">
                          {/* 🏷️ ESPACIADOR DE ACTIVIDAD: Sincronizado con la etiqueta de texto y su gap */}
                          <div className="h-8 mb-4" />
                          
                          {buildHierarchicalTree(tasks)[proyecto][fase][actividad].map((tarea: TaskV4) => {
                            const start = parseISO(tarea.fechaInicio || tarea.fechaEntrega);
                            const end = parseISO(tarea.fechaEntrega);
                            const isTaskExpanded = expanded.includes(tarea.id);

                            return (
                              <div key={tarea.id} className={`${isTaskExpanded ? 'h-auto py-12' : 'h-[100px] mb-4'} relative border-b border-sansce-border/30 flex items-center transition-all duration-300`}>
                                {meses.map(mes => (
                                  <div key={mes.nombre} className="flex-1 min-w-[200px] border-r border-sansce-border/10 relative h-full min-h-[60px]">
                                    {(isWithinInterval(start, { start: mes.inicio, end: mes.fin }) || 
                                      isWithinInterval(end, { start: mes.inicio, end: mes.fin })) && (
                                      <div 
                                        className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-full border shadow-lg z-10 ${getBarColor(tarea)}`}
                                        style={{
                                          left: `${(start.getDate() - 1) * (100 / mes.dias.length)}%`,
                                          right: `${(mes.dias.length - end.getDate()) * (100 / mes.dias.length)}%`,
                                          minWidth: '15px'
                                        }}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}