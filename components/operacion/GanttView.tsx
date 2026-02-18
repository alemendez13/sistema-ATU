"use client";

import React from 'react';
import { Plus } from 'lucide-react'; // 🆕 Importamos el ícono de suma
import { rescheduleHitoAction, updateTaskStatusAction } from '@/lib/actions'; // 🆕 Importamos la actualización de tareas

interface GanttViewProps {
  hitos: any[];
  tasks?: any[];
  onAddActivity?: (projectName: string) => void;
  onAddTask?: (projectName: string, hitoId: string) => void; // 🆕 Prop para crear tareas vinculadas
}

export default function GanttView({ hitos, tasks = [], onAddActivity, onAddTask }: GanttViewProps) {
  const [expandedProjects, setExpandedProjects] = React.useState<string[]>([]);
  const [expandedHitos, setExpandedHitos] = React.useState<string[]>([]); 
  
  // 🕒 RELOJ MAESTRO: Definimos la fecha actual para todos los cálculos de semáforos
  const hoy = new Date();

  const toggleHito = (id: string) => setExpandedHitos(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );
  // 🆕 Estados para la gestión de reprogramación
  const [rescheduleId, setRescheduleId] = React.useState<string | null>(null);
  const [rescheduleName, setRescheduleName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleProject = (name: string) => setExpandedProjects(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-500 overflow-x-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tight">
        Cronograma Maestro de Actividades
      </h2>
      
      <div className="min-w-[850px]">
        {/* CABECERA DE MESES (13 Columnas: 1 Título + 12 Meses) */}
        <div className="grid grid-cols-[280px_repeat(12,1fr)] gap-px bg-slate-200 border-b border-slate-200 text-[10px] font-bold text-slate-500 text-center uppercase">
          <div className="bg-slate-50 p-3 text-left border-r border-slate-200">Tipo de Actividad / Proyecto</div>
          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(mes => (
            <div key={mes} className="bg-slate-50 p-3 flex items-center justify-center border-l border-slate-100">
              {mes}
            </div>
          ))}
        </div>

        {/* CUERPO DEL GANTT AGRUPADO POR PROYECTO */}
        <div className="divide-y divide-slate-200 border-x border-b border-slate-200">
          {(Object.entries(
            hitos.reduce((acc, hito) => {
              const proy = hito.Proyecto || 'General';
              if (!acc[proy]) acc[proy] = [];
              acc[proy].push(hito);
              return acc;
            }, {} as Record<string, any[]>)
          ) as [string, any[]][]).map(([proyecto, hitosDelProyecto]) => (
            <div key={proyecto} className="bg-slate-50/50">
              {/* Encabezado de Proyecto Interactivo (Metadatos) */}
              {(() => {
                // 🧠 MOTOR DE CÁLCULO DE ESTATUS SANSCE OS v2.1
                const hoy = new Date();
                const responsablePrincipal = hitosDelProyecto[0]?.Responsable || "No asignado";
                const isExpanded = expandedProjects.includes(proyecto);
                
                // 1. Consolidación de Tareas del Proyecto
                const idsHitosProy = hitosDelProyecto.map(h => h.ID_Hito);
                const tareasProy = tasks.filter(t => idsHitosProy.includes(t.ID_Hito));
                
                // 2. Cálculos de Cumplimiento
                const totalTareas = tareasProy.length;
                const tareasHechas = tareasProy.filter(t => t.Estado === 'Realizada').length;
                const hayAtrasadas = tareasProy.some(t => t.Estado !== 'Realizada' && new Date(t.FechaEntrega) < hoy);
                
                // 3. Determinación de Estado del Proyecto
                let statusProy = "En Proceso";
                let colorStatus = "text-blue-600 bg-blue-50";

                if (totalTareas > 0 && tareasHechas === totalTareas) {
                  statusProy = "Realizado";
                  colorStatus = "text-emerald-700 bg-emerald-50";
                } else if (hayAtrasadas) {
                  statusProy = "Atrasado";
                  colorStatus = "text-red-700 bg-red-50";
                }

                const fechasInicio = hitosDelProyecto.map(h => new Date(h['Fecha Inicio']).getTime()).filter(t => !isNaN(t));
                const fechasFin = hitosDelProyecto.map(h => new Date(h['Fecha Fin']).getTime()).filter(t => !isNaN(t));
                const minFecha = fechasInicio.length ? new Date(Math.min(...fechasInicio)).toLocaleDateString() : 'N/A';
                const maxFecha = fechasFin.length ? new Date(Math.max(...fechasFin)).toLocaleDateString() : 'N/A';

                return (
                  <div 
                    onClick={() => toggleProject(proyecto)}
                    className="bg-slate-100/90 px-4 py-3 border-y border-slate-200 cursor-pointer hover:bg-blue-50 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-blue-600 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-blue-800 uppercase tracking-tighter block">
                            📂 PROYECTO: {proyecto}
                          </span>
                          {/* 🆕 ETIQUETA SEMÁFORO DE PROYECTO */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-sm border ${colorStatus}`}>
                            ● {statusProy}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">👤 Resp: <span className="text-slate-700">{responsablePrincipal}</span></span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">📅 Periodo: <span className="text-slate-700">{minFecha} - {maxFecha}</span></span>
                          <span className="text-[9px] text-blue-600 font-bold uppercase italic">📊 Avance: {totalTareas > 0 ? Math.round((tareasHechas/totalTareas)*100) : 0}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* 🆕 BOTÓN DE AGREGAR RÁPIDO */}
                      <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddActivity?.(proyecto);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                        >
                          <Plus size={12} /> + ACTIVIDAD
                      </button>

                      <div className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                        {isExpanded ? 'Ocultar actividades' : `Ver ${hitosDelProyecto.length} actividades`}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Renderizado condicional de actividades (Hitos) */}
              {expandedProjects.includes(proyecto) && hitosDelProyecto.map((hito: any) => {
                const getDayOfYear = (dateStr: string) => {
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return null;
                  const start = new Date(date.getFullYear(), 0, 0);
                  const diff = date.getTime() - start.getTime();
                  return Math.floor(diff / (1000 * 60 * 60 * 24));
                };

                const diaInicio = getDayOfYear(hito['Fecha Inicio']) || 1;
                const diaFin = getDayOfYear(hito['Fecha Fin']) || diaInicio + 7;
                const posicionIzquierda = ((diaInicio - 1) / 365) * 100;
                const anchoBarra = ((diaFin - diaInicio + 1) / 365) * 100;

               // 🔍 CÁLCULO DE AVANCE Y SEMÁFOROS (CAPA 2 Y 3)
                const tareasDelHito = tasks.filter(t => t.ID_Hito === hito.ID_Hito);
                const isHitoExpanded = expandedHitos.includes(hito.ID_Hito);
                
                // Cálculo matemático de porcentaje
                const tRealizadas = tareasDelHito.filter(t => t.Estado === 'Realizada').length;
                const porcentajeHito = tareasDelHito.length > 0 
                  ? Math.round((tRealizadas / tareasDelHito.length) * 100) 
                  : 0;

                return (
                  <React.Fragment key={hito.ID_Hito}>
                    {/* --- CAPA 2: TIPO DE ACTIVIDAD --- */}
                    <div 
                      onClick={() => toggleHito(hito.ID_Hito)}
                      className="grid grid-cols-[280px_repeat(12,1fr)] items-stretch group/row hover:bg-white transition-colors border-b border-slate-200 relative bg-white/40 cursor-pointer"
                    >
                      <div className="p-3 border-r border-slate-100 flex gap-2">
                        <span className={`text-blue-500 transition-transform mt-1 ${isHitoExpanded ? 'rotate-90' : ''}`}>
                          <Plus size={10} />
                        </span>
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight whitespace-normal break-words leading-tight">
                              {hito['Nombre de la Actividad'] || hito['Nombre del Hito']}
                            </p>
                            {/* 🆕 BADGE DE PORCENTAJE (CAPA 2) */}
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                              {porcentajeHito}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[9px] text-slate-500 font-medium">👤 {hito.Responsable}</p>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); onAddTask?.(proyecto, hito.ID_Hito); }}
                                className="opacity-0 group-hover/row:opacity-100 px-2 py-0.5 bg-slate-800 text-white rounded text-[8px] font-bold hover:bg-slate-700 transition-all active:scale-95"
                              >
                                + TAREA
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setRescheduleId(hito.ID_Hito); setRescheduleName(hito['Nombre de la Actividad'] || hito['Nombre del Hito']); }}
                                className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-amber-50 text-amber-600 rounded transition-all"
                              >
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M8 2v4M16 2v4M3 10h18M21 6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6zM12 18l3-3m0 0l-3-3m3 3H9"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div> 
                      {/* 🛠️ Estructura Corregida: El calendario ahora es el segundo hijo del grid principal */}
                      <div className="relative col-span-12 min-h-[48px] flex items-center px-1">
                        <div 
                          className="absolute h-5 rounded shadow-sm flex items-center px-3 text-[8px] font-black text-white z-10"
                          style={{ left: `${posicionIzquierda}%`, width: `${anchoBarra}%`, backgroundColor: hito.Estado === 'Cumplida' ? '#059669' : '#2563eb' }}
                        >
                          <span className="truncate">{hito.Estado}</span>
                        </div>
                        {Array.from({length: 12}).map((_, i) => (
                          <div key={i} className="flex-1 h-full border-r border-slate-100/30 last:border-0" />
                        ))}
                      </div>
                    </div>

                    {/* --- CAPA 3: TAREAS (DESPLEGABLE) --- */}
                    {isHitoExpanded && tareasDelHito.map((tarea: any) => {
                      const tDiaInicio = getDayOfYear(tarea.FechaInicio) || diaInicio;
                      const tDiaFin = getDayOfYear(tarea.FechaEntrega) || tDiaInicio;
                      const tPosIzquierda = ((tDiaInicio - 1) / 365) * 100;
                      const tAnchoBarra = ((tDiaFin - tDiaInicio + 1) / 365) * 100;

                      // 🚦 Lógica de Semáforo Único
                      const isRealizada = tarea.Estado === 'Realizada';
                      const isAtrasada = !isRealizada && new Date(tarea.FechaEntrega) < hoy;
                      const statusColor = isRealizada ? '#10b981' : isAtrasada ? '#ef4444' : '#f59e0b';

                      return (
                        <div key={tarea.ID_Tarea} className="grid grid-cols-[280px_repeat(12,1fr)] items-stretch bg-slate-50/30 border-b border-slate-50 group/task hover:bg-slate-100/50 transition-colors">
                          {/* COLUMNA 1: DESCRIPCIÓN + SEMÁFORO INTERACTIVO */}
                          <div className="p-3 pl-8 border-r border-slate-100 relative flex gap-3 items-start">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"></div>
                            
                            {/* Círculo Semáforo Único */}
                            <button 
                              onClick={() => !isRealizada && updateTaskStatusAction(tarea.ID_Tarea, 'Realizada').then(() => window.location.reload())}
                              className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 border transition-transform hover:scale-125 shadow-sm`}
                              style={{ backgroundColor: statusColor, borderColor: 'rgba(0,0,0,0.1)' }}
                              title={isRealizada ? "Tarea Realizada" : isAtrasada ? "Tarea Atrasada - Clic para completar" : "Tarea Programada - Clic para completar"}
                            />

                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-600 font-medium whitespace-normal break-words leading-tight">
                                {tarea.Descripcion}
                              </p>
                              <p className="text-[8px] text-slate-400 italic mt-1 uppercase tracking-tighter">👤 {tarea.EmailAsignado?.split('@')[0]}</p>
                            </div>
                          </div>

                          {/* COLUMNA 2-13: CRONOGRAMA CON BARRA DE COLOR */}
                          <div className="relative col-span-12 h-10 flex items-center px-1">
                            {/* Barra de Duración con Color de Estatus */}
                            <div 
                              className="absolute h-4 rounded-sm shadow-sm opacity-80 group-hover/task:opacity-100 transition-all border border-black/5"
                              style={{ 
                                left: `${tPosIzquierda}%`, 
                                width: `${tAnchoBarra}%`, 
                                backgroundColor: statusColor 
                              }}
                            />
                            
                            {Array.from({length: 12}).map((_, i) => (
                              <div key={i} className="flex-1 h-full border-r border-slate-50/50 last:border-0" />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* 🆕 MODAL QUIRÚRGICO DE REPROGRAMACIÓN */}
      {rescheduleId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-800 uppercase mb-4">Reprogramar Actividad</h3>
            <p className="text-[10px] text-slate-500 mb-4 bg-slate-50 p-2 rounded">Actividad: <b className="text-slate-700">{rescheduleName}</b></p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              // 🛡️ Conversión explícita a texto para satisfacer la seguridad de TypeScript
              const nuevaFecha = String(formData.get('nueva_fecha') || '');
              const motivo = String(formData.get('motivo') || '');
              
              const result = await rescheduleHitoAction(rescheduleId, nuevaFecha, motivo);
              if (result.success) {
                setRescheduleId(null);
                window.location.reload();
              } else {
                alert("Error: " + result.error);
              }
              setIsSubmitting(false);
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nueva Fecha Compromiso</label>
                <input name="nueva_fecha" type="date" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo del Cambio</label>
                <textarea name="motivo" required placeholder="Ej: Retraso en entrega de insumos" className="w-full p-3 bg-slate-50 border rounded-xl text-sm h-20" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setRescheduleId(null)} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}