// components/v4/core/BubbleRenderer.tsx
'use client';

import React, { useState } from 'react';
import { useHierarchy } from './HierarchicalProvider';
import { buildHierarchicalTree, FASES_SANSCE, TaskV4 } from '@/lib/v4/utils-hierarchy';
import { ChevronRight, MessageSquare, Calendar, CheckCircle2, Trash2, Loader2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { updateTaskStatusAction } from '@/lib/actions';
import { parseISO, differenceInDays, startOfWeek, endOfWeek, isSameWeek, isBefore, format } from 'date-fns';
import { es } from 'date-fns/locale';
import ObservationModal from '../shared/ObservationModal';
import RescheduleModal from '../shared/RescheduleModal';

interface BubbleRendererProps {
  customTasks?: TaskV4[];
  isGanttActive?: boolean;      // 🔗 Prop de sincronización para Columna 4
  onProjectExpand?: () => any;  // 🛡️ Flexibilidad de retorno para evitar error false|void
}

export default function BubbleRenderer({ customTasks, isGanttActive, onProjectExpand }: BubbleRendererProps) {
  // 🔗 CONEXIÓN AL PANEL DE CONTROL MAESTRO SANSCE
  // 🛡️ ESCUDO SANSCE: Garantizamos que si el Provider falla, el sistema no colapse.
  const hierarchy = useHierarchy();
  const globalTasks = hierarchy?.tasks || [];
  const getStatusStyles = hierarchy?.getStatusStyles || (() => "");
  const updateTaskState = hierarchy?.updateTaskState || (() => {});
  const expanded = hierarchy?.expanded || [];
  const toggleExpanded = hierarchy?.toggleExpanded || (() => {});

  const [loadingTask, setLoadingTask] = useState<string | null>(null);
  const tasksToRender = customTasks || globalTasks;
  const tree = buildHierarchicalTree(tasksToRender);
  
  // 🛡️ REGLA SANSCE: Usaremos 'expanded' del Provider para TODO (Jerarquía y Tareas)
  // Esto garantiza que si una tarea se expande, el Gantt lo sepa y ajuste su altura.
  const [activeTaskForObs, setActiveTaskForObs] = useState<TaskV4 | null>(null);
  const [activeTaskForReschedule, setActiveTaskForReschedule] = useState<TaskV4 | null>(null);

  // 🧪 MOTOR DE MÉTRICAS SANSCE: Calcula días restantes o de atraso
  const getDaysMetric = (fechaStr: string) => {
    if (!fechaStr) return null;
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const entrega = parseISO(fechaStr);
    const diff = differenceInDays(entrega, hoy);
    
    if (diff < 0) return { label: `${Math.abs(diff)} días de atraso`, color: 'text-rose-600', icon: <Clock size={10} className="text-rose-600" /> };
    if (diff === 0) return { label: 'Vence hoy', color: 'text-amber-500', icon: <Clock size={10} className="text-amber-500" /> };
    return { label: `${diff} días restantes`, color: 'text-emerald-600', icon: <Clock size={10} className="text-emerald-600" /> };
  };

  const toggle = (id: string, isProject: boolean = false) => {
    const isOpening = !expanded.includes(id);
    // 📡 TRANSMISIÓN SANSCE: Enviamos la señal al Provider global
    toggleExpanded(id);
    
    if (isProject && isOpening) {
      onProjectExpand?.();
    }
  };

// 🛡️ COMPONENTE QUIRÚRGICO: Define cómo se ve una tarjeta de tarea (Reutilizable)
  const renderTaskCard = (tarea: TaskV4) => {
    const isTaskExpanded = expanded.includes(tarea.id);
    const metrics = getDaysMetric(tarea.fechaEntrega);

    return (
      <div 
          key={tarea.id} 
          onClick={() => toggleExpanded(tarea.id)}
          className={`relative w-full bg-white border cursor-pointer transition-all duration-300 rounded-xl p-3 shadow-sm hover:shadow-lg ${getStatusStyles(tarea)} ${isTaskExpanded ? 'z-50 ring-2 ring-sansce-brand/10' : 'z-10 h-[100px]'}`}
      >
          <p className={`text-[11px] font-bold text-sansce-text leading-tight whitespace-normal overflow-hidden ${isTaskExpanded ? 'mb-2' : 'line-clamp-2'}`}>
            {tarea.descripcion}
          </p>
          
          {isTaskExpanded ? (
            <div className="mt-4 pt-3 border-t border-sansce-bg space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase font-black text-sansce-muted tracking-widest mb-1">Responsable</span>
                  <span className="text-[10px] font-bold text-sansce-brand italic">@{tarea.responsable}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase font-black text-sansce-muted tracking-widest mb-1">Métrica de Tiempo</span>
                  <div className="flex items-center space-x-1">
                    {metrics?.icon}
                    <span className={`text-[9px] font-black ${metrics?.color}`}>{metrics?.label}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase font-black text-sansce-muted tracking-widest mb-1">Fecha Compromiso</span>
                  <span className="text-[10px] font-bold text-sansce-text">{tarea.fechaEntrega || 'Pendiente'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase font-black text-sansce-muted tracking-widest mb-1">Prioridad</span>
                  <span className={`text-[9px] font-black uppercase ${tarea.prioridad === 'Alta' ? 'text-rose-600' : 'text-amber-500'}`}>
                    {tarea.prioridad}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="flex gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setActiveTaskForObs(tarea); }} title="Observaciones" className="p-2 bg-sansce-bg rounded-lg hover:text-sansce-brand transition-colors"><MessageSquare size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveTaskForReschedule(tarea); }} title="Reprogramar" className="p-2 bg-sansce-bg rounded-lg hover:text-amber-500 transition-colors"><Calendar size={14} /></button>
                  <button 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      if(confirm('¿Confirmar cancelación de esta tarea?')) {
                        setLoadingTask(tarea.id);
                        updateTaskState(tarea.id, { estado: 'Descartada' });
                        await updateTaskStatusAction(tarea.id, 'Descartada');
                        setLoadingTask(null);
                      }
                    }} 
                    title="Cancelar Tarea"
                    className="p-2 bg-sansce-bg rounded-lg hover:text-rose-600 transition-colors"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
                
                <button 
                  disabled={loadingTask === tarea.id}
                  onClick={async (e) => {
                      e.stopPropagation();
                      const nuevoEstado = tarea.estado === 'Realizada' ? 'En Proceso' : 'Realizada';
                      setLoadingTask(tarea.id);
                      updateTaskState(tarea.id, { estado: nuevoEstado });
                      await updateTaskStatusAction(tarea.id, nuevoEstado);
                      setLoadingTask(null);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md border-2 ${
                      tarea.estado === 'Realizada' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-amber-500 text-white border-amber-600'
                  }`}
                >
                  {loadingTask === tarea.id ? <Loader2 size={12} className="animate-spin" /> : <span>{tarea.estado === 'Realizada' ? 'Realizada' : 'En Proceso'}</span>}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between opacity-40">
               <span className="text-[7px] font-black uppercase tracking-tighter italic">@{tarea.responsable}</span>
               <div className="flex space-x-1 items-center">
                  <Clock size={8} />
                  <span className="text-[7px] font-bold">{tarea.fechaEntrega}</span>
               </div>
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="h-full bg-sansce-bg/20">
      {Object.keys(tree).map((proyecto) => (
        <div key={proyecto} className="flex flex-col border-b border-sansce-border last:border-0">
          
          {/* 🟦 COLUMNA 1: PROYECTO (CABECERA MINIMALISTA SANSCE) */}
          <div className="sticky top-0 z-40 h-14 bg-white/90 backdrop-blur-xl px-6 border-b border-sansce-border flex items-center shadow-sm transition-all">
            <button 
              onClick={() => toggle(proyecto, true)}
              className="flex items-center space-x-3 group py-1 px-2 rounded-lg hover:bg-sansce-bg/50 transition-all active:scale-95"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm ${expanded.includes(proyecto) ? 'bg-sansce-brand text-white shadow-emerald-200' : 'bg-sansce-surface text-sansce-muted border border-sansce-border'}`}>
                <ChevronRight className={`w-4 h-4 transition-transform duration-500 ${expanded.includes(proyecto) ? 'rotate-90' : ''}`} />
              </div>
              <h2 className="text-[11px] font-black text-sansce-text tracking-[0.15em] uppercase truncate max-w-[400px]">
                {proyecto}
              </h2>
            </button>
          </div>

          {expanded.includes(proyecto) && (
            /* 🛤️ MATRIZ DE GOBERNANZA SANSCE: Estructura de flujo libre para scroll sincronizado */
            <div className="flex divide-x divide-sansce-border bg-white">
              
              {/* 🟩 COLUMNA 1: FASES (Sticky Header a 80px para quedar bajo el Proyecto) */}
              <div className="w-1/3 flex-none bg-white border-r border-sansce-border relative flex flex-col">
                <div className="sticky top-[56px] z-[40] h-12 flex-none flex items-center bg-white border-b border-sansce-border px-4 shadow-sm">
                    <span className="text-[10px] font-black text-sansce-brand uppercase tracking-[0.2em]">Etapa</span>
                </div>
                
                <div className="p-3 space-y-3">
                    {FASES_SANSCE.map((fase) => (
                    <button 
                      key={fase}
                      onClick={() => toggle(proyecto + fase)}
                      className={`w-full text-left p-3 rounded-xl text-[10px] leading-tight font-bold transition-all border ${
                        expanded.includes(proyecto + fase) 
                        ? 'bg-sansce-brand text-white border-sansce-brand shadow-premium z-10' 
                        : 'bg-white text-sansce-muted border-sansce-border hover:border-sansce-brand/30'
                      }`}
                    >
                      {fase}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🟨 COLUMNA 2: ACTIVIDADES (25% del total / 33% del contenedor) */}
            <div className="w-1/3 flex-none bg-white border-r border-sansce-border relative flex flex-col">
            {/* 🛡️ ESCUDO SANSCE: Título estático que bloquea el scroll de actividades */}
            <div className="sticky top-[56px] z-[40] h-12 flex-none flex items-center bg-white border-b border-sansce-border px-4 shadow-sm">
                <span className="text-[10px] font-black text-sansce-brand uppercase tracking-[0.2em]">Actividades</span>
            </div>

            {/* 🚀 CONTENEDOR DE ACTIVIDADES: Con Scroll independiente */}
            <div className="p-4 space-y-6">
                {FASES_SANSCE.map((fase) => expanded.includes(proyecto + fase) && (
                <div key={fase + 'acts'} className="animate-in fade-in slide-in-from-left-2 duration-300">
                    {/* Sub-cabecera de Contexto (Ayuda a saber de qué fase vienen estas actividades) */}
                    <div className="mb-3 px-1">
                    <span className="text-[9px] font-black text-sansce-muted uppercase tracking-widest opacity-60 italic">Fase: {fase}</span>
                    </div>
                    <div className="space-y-3">
                    {Object.keys(tree[proyecto][fase]).map((actividad) => (
                        <button 
                        key={actividad}
                        onClick={() => toggle(proyecto + fase + actividad)}
                        className={`w-full text-left p-3 rounded-xl text-[11px] font-black transition-all border ${
                            expanded.includes(proyecto + fase + actividad) 
                            ? 'bg-sansce-brand/5 text-sansce-brand border-sansce-brand/30 shadow-sm' 
                            : 'bg-white text-sansce-text border-sansce-border hover:bg-sansce-bg'
                        }`}
                        >
                        <span className="italic uppercase">{actividad}</span>
                        </button>
                    ))}
                    </div>
                </div>
                ))}
            </div>
            </div>

              {/* 🟧 COLUMNA 3: TAREAS (25% del total / 33% del contenedor) */}
            <div className="w-1/3 flex-none bg-white relative flex flex-col">
            {/* 🛡️ ESCUDO SANSCE: Título estático para el nivel final de ejecución */}
            <div className="sticky top-[56px] z-[40] h-12 flex-none flex items-center bg-white border-b border-sansce-border px-4 shadow-sm">
                <span className="text-[10px] font-black text-sansce-brand uppercase tracking-[0.2em]">Tareas y Ejecución</span>
            </div>

            {/* 🚀 CONTENEDOR DE TAREAS: Con Scroll independiente y visualización de amplitud */}
            <div className="p-4 space-y-8">
                {FASES_SANSCE.map(fase => 
                Object.keys(tree[proyecto][fase]).map(actividad => 
                    expanded.includes(proyecto + fase + actividad) && (
                    <div key={actividad + 'tasks'} className="space-y-4 animate-in zoom-in-95 duration-200">
                        {/* Indicador de procedencia (Para no perder el hilo clínico) */}
                        <div className="px-1 border-l-2 border-sansce-brand/20 ml-1">
                        <span className="text-[9px] font-black text-sansce-muted uppercase tracking-widest opacity-60 italic">
                            {actividad}
                        </span>
                        </div>

                        {(() => {
                          const hoy = new Date();
                          const hoyStr = hoy.toISOString().split('T')[0];
                          
                          // 1. FILTRADO INICIAL: Solo pendientes
                          const pendientes = tree[proyecto][fase][actividad].filter((t: TaskV4) => t.estado !== 'Realizada');

                          // 🧠 MOTOR DE NORMALIZACIÓN SANSCE: Convierte DD/MM/YYYY a YYYY-MM-DD
                          const getValidDate = (f: string) => {
                              let fLimpia = (f || "").trim();
                              if (fLimpia.includes('/')) {
                                  const parts = fLimpia.split('/');
                                  if (parts.length === 3) {
                                      const [d, m, y] = parts;
                                      fLimpia = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                                  }
                              }
                              const d = parseISO(fLimpia);
                              return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
                          };

                          // 2. SEGMENTACIÓN: Esta Semana
                          const deLaSemana = pendientes.filter((t: TaskV4) => {
                              const d = getValidDate(t.fechaEntrega);
                              if (!d) return false;
                              return isSameWeek(d, hoy, { weekStartsOn: 1 }) && !isBefore(d, hoy);
                          });

                          // 3. SEGMENTACIÓN: Atrasos
                          const atrasadas = pendientes.filter((t: TaskV4) => {
                              const d = getValidDate(t.fechaEntrega);
                              if (!d) return false; // Las fechas vacías no cuentan como atraso aquí
                              // Comparamos contra hoyStr (YYYY-MM-DD)
                              const dStr = d.toISOString().split('T')[0];
                              return dStr < hoyStr;
                          });
                          
                          // 4. AGRUPAMIENTO DE ATRASOS
                          const atrasosAgrupados = atrasadas.reduce((acc: Record<string, TaskV4[]>, t: TaskV4) => {
                              const d = getValidDate(t.fechaEntrega);
                              const etiqueta = d 
                                ? `Semana ${format(startOfWeek(d, { weekStartsOn: 1 }), 'dd MMM', { locale: es })}`
                                : "Fecha por Definir";
                              
                              if (!acc[etiqueta]) acc[etiqueta] = [];
                              acc[etiqueta].push(t);
                              return acc;
                          }, {} as Record<string, TaskV4[]>);

                          return (
                              <div className="space-y-8">
                                  {/* BLOQUE A: FOCO DE LA SEMANA */}
                                  {deLaSemana.length > 0 && (
                                      <div className="space-y-3">
                                          <div className="flex items-center space-x-2 px-1">
                                              <div className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                                              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Entrega esta semana</span>
                                          </div>
                                          {deLaSemana.map((tarea: TaskV4) => renderTaskCard(tarea))} 
                                      </div>
                                  )}

                                  {/* BLOQUE B: HISTÓRICO DE ATRASOS */}
                                  {Object.keys(atrasosAgrupados).sort().reverse().map((semana: string) => (
                                      <div key={semana} className="space-y-3">
                                          <div className="flex items-center space-x-2 px-1 border-l-2 border-rose-500/30 ml-1">
                                              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Atraso: {semana}</span>
                                          </div>
                                          {atrasosAgrupados[semana].map((tarea: TaskV4) => renderTaskCard(tarea))}
                                      </div>
                                  ))}

                                  {/* AVISO: Si no hay nada pendiente */}
                                  {pendientes.length === 0 && (
                                      <div className="py-10 text-center border-2 border-dashed border-sansce-bg rounded-2xl">
                                          <span className="text-[10px] font-bold text-sansce-muted uppercase">Todo en orden por aquí</span>
                                      </div>
                                  )}
                              </div>
                          );
                      })()}
                    </div>
                    )
                )
                )}
            </div>
            </div>

            </div>
          )}
        </div>
      ))}

      {/* MODALES */}
      {activeTaskForObs && <ObservationModal task={activeTaskForObs} onClose={() => setActiveTaskForObs(null)} />}
      {activeTaskForReschedule && <RescheduleModal task={activeTaskForReschedule} onClose={() => setActiveTaskForReschedule(null)} />}
    </div>
  );
}