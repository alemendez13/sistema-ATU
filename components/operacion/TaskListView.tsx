//components/operacion/TaskListView.tsx
"use client";

import React, { useState } from 'react';
import { MessageSquare, X, User, Calendar, BookOpen, CheckCircle2, XCircle, Clock, Save, AlertCircle } from 'lucide-react'; // 🧬 Iconografía de tiempo y alertas
import { rescheduleTaskAction } from '@/lib/actions'; // 🚀 Importación del motor de memoria

interface TaskListViewProps {
  tasks: any[];
  loadingId: string | null;
  onToggleStatus: (id: string, currentStatus: string) => void;
  history?: any[]; 
}

export default function TaskListView({ tasks, loadingId, onToggleStatus, history = [] }: TaskListViewProps) {
  // 1. MOTOR DE MEMORIA: Detectamos la última minuta
  const ultimaMinuta = [...history].sort((a, b) => b.Fecha.localeCompare(a.Fecha))[0];
  const fechaReferencia = ultimaMinuta?.Fecha;

  // 2. MOTOR DE CLASIFICACIÓN: Agrupamos y ordenamos tareas internamente
  const tareasAgrupadas = tasks.reduce((acc: any, t) => {
    const proy = t.Proyecto || "📂 TAREAS GENERALES / OPERACIÓN DIARIA";
    if (!acc[proy]) acc[proy] = [];
    acc[proy].push(t);
    return acc;
  }, {});

  // 3. ORDEN ESTRATÉGICO: Proyectos ordenados por la fecha de entrega más próxima de sus tareas
  const proyectosOrdenados = Object.keys(tareasAgrupadas).sort((a, b) => {
    const minA = Math.min(...tareasAgrupadas[a].map((t: any) => new Date(t.FechaEntrega || '9999-12-31').getTime()));
    const minB = Math.min(...tareasAgrupadas[b].map((t: any) => new Date(t.FechaEntrega || '9999-12-31').getTime()));
    return minA - minB;
  });

  // 4. CONTROL DE VISTA: Estado del acordeón, Observaciones y Reprogramación
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [activeObsId, setActiveObsId] = useState<string | null>(null); 
  const [rescheduleId, setRescheduleId] = useState<string | null>(null); // 🕒 Tarea que se está reprogramando
  const [reprogLoading, setReprogLoading] = useState(false); // ⏳ Estado de guardado

  const toggleProject = (name: string) => setExpandedProjects(prev =>
    prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
  );

  // 5. VALIDACIÓN DE CARGA
  if (!tasks || tasks.length === 0) {
    return <div className="text-center py-12 text-slate-400 font-medium italic">No hay tareas pendientes para mostrar.</div>;
  }

  return (
    <div className="space-y-12">
      {proyectosOrdenados.map((nombreProyecto) => (
        <div key={nombreProyecto} className="space-y-6">
          {/* ENCABEZADO INTERACTIVO SANSCE OS (Con Sensor de Completitud) */}
          <div 
            onClick={() => toggleProject(nombreProyecto)}
            className={`flex items-center gap-4 border-b-2 border-slate-100 pb-3 cursor-pointer group hover:border-blue-300 transition-all ${
              tareasAgrupadas[nombreProyecto].every((t: any) => t.Estado === 'Realizada' || t.Estado === 'Cumplida' || t.Estado === 'Cancelada') ? 'opacity-30 grayscale' : ''
            }`}
          >
            <span className={`text-[10px] text-blue-500 transition-transform duration-300 ${expandedProjects.includes(nombreProyecto) ? 'rotate-90' : 'rotate-0'}`}>
              ▶
            </span>
            <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] whitespace-nowrap group-hover:text-blue-700">
              {nombreProyecto} <span className="text-slate-400 font-medium ml-2">({tareasAgrupadas[nombreProyecto].length})</span>
            </h3>
            <div className="h-px w-full bg-gradient-to-r from-blue-100 to-transparent opacity-50 group-hover:opacity-100"></div>
          </div>

          {/* LISTADO DE TAREAS (CONDICIONAL) */}
          {expandedProjects.includes(nombreProyecto) && (
            <div className="grid gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
              {tareasAgrupadas[nombreProyecto]
                .sort((a: any, b: any) => new Date(a.FechaEntrega || '9999-12-31').getTime() - new Date(b.FechaEntrega || '9999-12-31').getTime())
                .map((tarea: any) => {
                  // 🧠 SANSCE OS: Motor de estados terminales y urgencia
                  const hoyStr = new Date().toLocaleDateString('sv-SE');
                  const isFinished = tarea.Estado === 'Realizada' || tarea.Estado === 'Cumplida';
                  const isCancelled = tarea.Estado === 'Cancelada';
                  const isTerminal = isFinished || isCancelled;
                  const esVencida = !isTerminal && tarea.FechaEntrega && tarea.FechaEntrega < hoyStr;
                  const esArrastre = fechaReferencia && tarea.FechaInicio === fechaReferencia && !isTerminal;
                  
                  return (
                    <div 
                      key={tarea.ID_Tarea}
                      className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all border-l-8 ${
                      isCancelled
                        ? 'opacity-60 border-rose-200 bg-rose-50/30' 
                        : isFinished 
                          ? 'opacity-40 grayscale border-slate-100 bg-slate-50/50' 
                          : esVencida
                            ? 'border-red-600 bg-red-50/50 ring-2 ring-red-200 shadow-lg shadow-red-100' // 🚨 ALERTA ROJA: Tarea Vencida
                            : esArrastre
                              ? 'border-red-400 shadow-red-50 ring-1 ring-red-50' 
                              : 'border-blue-500 shadow-blue-50'
                    }`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {esArrastre && (
                            <span className="flex items-center gap-1.5 text-[9px] bg-red-600 text-white px-3 py-1 rounded-full font-black animate-pulse uppercase tracking-tight shadow-sm">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                              Arrastre de Minuta
                            </span>
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                          {tarea.Area || 'Gral'}
                        </span>
                        
                        {/* 🚦 ESTATUS REAL SANSCE OS */}
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                          isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          tarea.Estado === 'En Proceso' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          ● {tarea.Estado || 'Pendiente'}
                        </span>

                        {/* 🔥 SEMÁFORO DE PRIORIDAD ESTRATÉGICA */}
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                          tarea.Prioridad === 'Alta' ? 'bg-rose-600 text-white border-rose-700' :
                          tarea.Prioridad === 'Baja' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-amber-100 text-amber-700 border-amber-200' // Media por defecto
                        }`}>
                          {tarea.Prioridad === 'Alta' ? '⚡ CRÍTICA' : 
                           tarea.Prioridad === 'Baja' ? '🧊 BAJA' : '⭐ MEDIA'}
                        </span>

                        {/* 🚨 SENSOR DE DESVIACIÓN: Contador de días de atraso */}
                        {esVencida && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-red-600 text-white border border-red-700 shadow-sm animate-pulse">
                            ⚠️ ATRASADA POR {Math.floor((new Date(hoyStr).getTime() - new Date(tarea.FechaEntrega).getTime()) / (1000 * 60 * 60 * 24))} DÍAS
                          </span>
                        )}

                        <span className="text-[9px] text-slate-400 font-mono font-bold tracking-tighter bg-slate-50 px-2 py-1 rounded">
                          #{tarea.ID_Tarea?.split('-')[1]}
                        </span>
                      </div>
                        <p className={`text-[15px] text-slate-800 font-bold leading-snug ${isFinished ? 'line-through text-slate-400' : ''}`}>
                          {tarea.Descripcion}
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                          <span className="flex items-center gap-1.5">📅 Inicio: <b className="text-slate-600">{tarea.FechaInicio || 'N/A'}</b></span>
                          <span className="flex items-center gap-1.5">🏁 Límite: <b className="text-blue-600">{tarea.FechaEntrega || 'N/A'}</b></span>
                        </div>
                      </div>

                      <div className="mt-5 sm:mt-0 sm:ml-8 flex flex-col items-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0">
                        {/* 1. LÍNEA DE ACCIÓN PRINCIPAL */}
                        <div className="flex items-center gap-5 w-full justify-end">
                          <div className="text-right hidden md:block">
                            <p className="text-[8px] uppercase text-slate-400 font-black tracking-widest mb-0.5">Responsable</p>
                            <p className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">{tarea.EmailAsignado?.split('@')[0]}</p>
                          </div>
                          <button 
                            onClick={() => onToggleStatus(tarea.ID_Tarea, tarea.Estado === 'Pendiente' ? 'En Proceso' : 'Realizada')}
                            disabled={loadingId === tarea.ID_Tarea || isTerminal}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                              isCancelled 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : isFinished 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95 disabled:opacity-50'
                            }`}
                          >
                            {loadingId === tarea.ID_Tarea ? '...' : (
                              isCancelled ? '✘ Cancelada' : isFinished ? '✓ Finalizada' : 'Actualizar'
                            )}
                          </button>
                        </div>

                        {/* 2. BOTÓN DE OBSERVACIONES (CONTEXTO SANSCE) */}
                        {(() => {
                          const minuta = history.find(m => m.Fecha === tarea.FechaInicio) || ultimaMinuta;
                          return (
                            <div className="relative">
                              <button
                                onClick={() => setActiveObsId(activeObsId === tarea.ID_Tarea ? null : tarea.ID_Tarea)}
                                className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest py-1 px-3 rounded-full transition-all border ${
                                  activeObsId === tarea.ID_Tarea 
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-transparent'
                                }`}
                              >
                                <MessageSquare size={12} />
                                {activeObsId === tarea.ID_Tarea ? 'Cerrar Contexto' : 'Observaciones'}
                              </button>

                              {/* 3. BURBUJA ELEGANTE (POPOVER) */}
                              {activeObsId === tarea.ID_Tarea && minuta && (
                                <div className="absolute right-0 top-full mt-3 w-72 md:w-85 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden ring-8 ring-slate-50/50">
                                  <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <BookOpen size={14} className="text-blue-400" />
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Memoria de Gestión</span>
                                    </div>
                                    <button onClick={() => setActiveObsId(null)} className="hover:rotate-90 transition-transform"><X size={16} /></button>
                                  </div>
                                  <div className="p-5 space-y-4 text-left">
                                    <div className="flex gap-3">
                                      <Calendar size={14} className="text-blue-500 mt-1 flex-shrink-0" />
                                      <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Sesión del {minuta.Fecha}</p>
                                        <p className="text-[11px] font-bold text-slate-700 italic">Moderador: {minuta.Moderador || 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="space-y-1 border-l-2 border-slate-100 pl-3">
                                      <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><User size={10}/> Participantes</p>
                                      <p className="text-[10px] text-slate-600 leading-tight">{minuta.Asistentes || 'Sin registro'}</p>
                                    </div>
                                    <div className="space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                      <p className="text-[9px] font-black text-blue-600 uppercase">Temas Tratados</p>
                                      <p className="text-[10px] text-slate-700 font-medium leading-relaxed whitespace-pre-line line-clamp-4 hover:line-clamp-none transition-all">{minuta.Temas}</p>
                                    </div>
                                    <div className="pt-2 flex gap-2 items-start">
                                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-[9px] font-black text-emerald-600 uppercase">Acuerdo Directivo</p>
                                        <p className="text-[11px] text-slate-800 font-bold leading-snug">{minuta.Conclusiones}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4. MÓDULO DE REPROGRAMACIÓN (GESTIÓN DE COMPROMISOS) */}
                              {!isTerminal && (
                                <div className="mt-2 flex flex-col gap-2">
                                  <button
                                    onClick={() => setRescheduleId(rescheduleId === tarea.ID_Tarea ? null : tarea.ID_Tarea)}
                                    className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest py-1 px-3 rounded-full transition-all border ${
                                      rescheduleId === tarea.ID_Tarea 
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-md' 
                                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-transparent'
                                    }`}
                                  >
                                    <Clock size={12} />
                                    {rescheduleId === tarea.ID_Tarea ? 'Cerrar Ajuste' : 'Reprogramar'}
                                  </button>

                                  {rescheduleId === tarea.ID_Tarea && (
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner animate-in slide-in-from-top-2 duration-300">
                                      <p className="text-[9px] font-black text-amber-700 uppercase mb-2 flex items-center gap-1">
                                        <AlertCircle size={12} /> Ajuste de Fecha
                                      </p>
                                      <form 
                                        onSubmit={async (e) => {
                                          e.preventDefault();
                                          const form = e.currentTarget;
                                          const nuevaFecha = (form.elements.namedItem('nuevaFecha') as HTMLInputElement).value;
                                          const motivo = (form.elements.namedItem('motivo') as HTMLTextAreaElement).value;
                                          
                                          setReprogLoading(true);
                                          const res = await rescheduleTaskAction(tarea.ID_Tarea, nuevaFecha, motivo);
                                          if (res.success) setRescheduleId(null);
                                          else alert("Error: " + res.error);
                                          setReprogLoading(false);
                                        }}
                                        className="space-y-2"
                                      >
                                        <input 
                                          name="nuevaFecha" 
                                          type="date" 
                                          required 
                                          className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[11px] focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                        <textarea 
                                          name="motivo" 
                                          placeholder="¿Por qué se reprograma?" 
                                          required 
                                          className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[10px] focus:ring-2 focus:ring-amber-500 outline-none h-14"
                                        />
                                        <button 
                                          disabled={reprogLoading}
                                          className="w-full py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-amber-700 disabled:opacity-50"
                                        >
                                          {reprogLoading ? 'Guardando...' : <><Save size={12} /> Confirmar Cambio</>}
                                        </button>
                                      </form>
                                    </div>
                                  )}

                                  {/* 5. BOTÓN DE CANCELACIÓN (CONTROL DIRECTIVO) */}
                                  <button
                                    onClick={() => window.confirm("¿Seguro que desea CANCELAR esta tarea? No se borrará, pero quedará inactiva.") && onToggleStatus(tarea.ID_Tarea, 'Cancelada')}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest py-1 px-3 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all w-full justify-center sm:justify-start"
                                    title="Marcar como cancelada"
                                  >
                                    <XCircle size={12} />
                                    Descartar Tarea
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}