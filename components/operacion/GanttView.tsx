//components/operacion/GanttView.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation'; // 🚀 Importación para actualización reactiva
import { Plus } from 'lucide-react'; 
// Agregamos moveTaskAction a la lista de herramientas disponibles
import { rescheduleHitoAction, updateTaskStatusAction, moveTaskAction } from '@/lib/actions';

interface GanttViewProps {
  hitos: any[];
  tasks?: any[];
  onAddActivity?: (projectName: string) => void;
  onAddTask?: (projectName: string, hitoId: string) => void; 
}

export default function GanttView({ hitos, tasks = [], onAddActivity, onAddTask }: GanttViewProps) {
  const router = useRouter(); // ⚡ Iniciamos el controlador de sincronización
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

  // ✨ ESTADO SANSCE: Registra la tarea recién movida para activarle el destello
  const [lastMovedId, setLastMovedId] = React.useState<string | null>(null);

  const toggleProject = (name: string) => setExpandedProjects(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  return (
    <div className="bg-white rounded-xl shadow-md border-t-4 border-green-500">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tight">
          Cronograma Maestro de Actividades
        </h2>
      </div>
      
      <div className="px-6 pb-6 relative">
        <div className="min-w-[1000px] flex flex-col">
          {/* CABECERA DE MESES (Inmovilizada debajo del Navbar) */}
          <div className="grid grid-cols-[280px_repeat(12,1fr)] gap-px bg-white border-b-2 border-slate-300 text-[10px] font-bold text-slate-500 text-center uppercase sticky top-[80px] z-[50] shadow-xl -mx-6 px-6">
            <div className="bg-slate-50 p-3 text-left border-r border-slate-200">Tipo de Actividad / Proyecto</div>
            {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(mes => (
              <div key={mes} className="bg-slate-50 p-3 flex items-center justify-center border-l border-slate-100">
                {mes}
              </div>
            ))}
          </div>

          {/* CUERPO DEL GANTT (Ahora comparte el mismo padre largo que la cabecera) */}
          <div className="divide-y divide-slate-200 border-x border-b border-slate-200 bg-white"></div>
            {(!hitos || hitos.length === 0) ? (
              <div className="p-10 text-center text-slate-400 text-xs italic">
                No hay actividades programadas en el cronograma.
              </div>
            ) : (Object.entries(
              hitos.reduce((acc, hito) => {
                if (!hito || !hito.Proyecto) return acc; // 🛡️ Salto de seguridad si el dato viene roto
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

                // 🛠️ TRADUCTOR UNIVERSAL SANSCE: Convierte texto "DD/MM/AAAA" a fecha real para el sistema
                const parseSanceDate = (dStr: string) => {
                  if (!dStr || typeof dStr !== 'string') return new Date();
                  if (dStr.includes('-')) return new Date(dStr); // Si ya viene en formato sistema (AAAA-MM-DD)
                  const [d, m, a] = dStr.split('/').map(n => parseInt(n));
                  return new Date(a, m - 1, d); // Crea la fecha entendible por el navegador
                };

                const fechasInicio = hitosDelProyecto.map(h => parseSanceDate(h['Fecha Inicio']).getTime()).filter(t => !isNaN(t));
                const fechasFin = hitosDelProyecto.map(h => parseSanceDate(h['Fecha Fin']).getTime()).filter(t => !isNaN(t));
                
                const minFecha = fechasInicio.length ? 
                  ((d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)(new Date(Math.min(...fechasInicio))) : 'N/A';
                
                const maxFecha = fechasFin.length ? 
                  ((d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)(new Date(Math.max(...fechasFin))) : 'N/A';

                return (
                  <div 
                    onClick={() => toggleProject(proyecto)}
                    onDragOver={(e) => {
                      e.preventDefault(); // 🛡️ Obligatorio para habilitar la "recepción"
                      e.currentTarget.style.backgroundColor = "#dbeafe"; // Feedback: Se ilumina en azul al pasar la tarea
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.backgroundColor = ""; // Limpiamos el color si el usuario se arrepiente
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = ""; // Restauramos color original
                      const taskId = e.dataTransfer.getData("taskId");
                      
                      if (taskId) {
                        // 🛡️ SEGURIDAD OPERATIVA: Confirmamos el movimiento para evitar errores de dedo
                        const confirmar = window.confirm(`¿Confirmar trasplante de la tarea al proyecto: ${proyecto}?`);
                        if (confirmar) {
                          const result = await moveTaskAction(taskId, proyecto);
                          if (result.success) {
                            setLastMovedId(taskId); // Activamos el destello para esta tarea
                            router.refresh(); 
                            // El destello se apaga solo tras 3 segundos para no cansar la vista
                            setTimeout(() => setLastMovedId(null), 3000);
                          } else {
                            alert("Error técnico en el trasplante: " + result.error);
                          }
                        }
                      }
                    }}
                    className="bg-slate-100/90 px-4 py-3 border-y border-slate-200 cursor-pointer hover:bg-blue-50 transition-all flex items-center justify-between group border-2 border-transparent"
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

                      <div className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                        {isExpanded ? 'Ocultar actividades' : `Ver ${hitosDelProyecto.length} actividades`}
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
                              {/* 🛡️ BLOQUEO SANSCE: Edición transferida a Minuta */}
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

                      // 🚦 SEMÁFORO PREVENTIVO SANSCE OS v3.0 (Sincronizado)
                      const parseSanceDate = (dStr: string) => {
                        if (!dStr || typeof dStr !== 'string') return new Date();
                        if (dStr.includes('-')) return new Date(dStr);
                        const [d, m, a] = dStr.split('/').map(n => parseInt(n));
                        return new Date(a, m - 1, d);
                      };

                      const isRealizada = tarea.Estado === 'Realizada';
                      const fechaEntrega = parseSanceDate(tarea.FechaEntrega); // ✅ Traducción activada
                      const diffHoras = (fechaEntrega.getTime() - hoy.getTime()) / (1000 * 3600);

                      let statusColor = '#3b82f6'; // Azul: Programada
                      let statusText = "Programada"; // 🆕 Variable para el texto del globo informativo

                      if (isRealizada) {
                        statusColor = '#10b981'; statusText = "Realizada";
                      } else if (diffHoras < 0) {
                        statusColor = '#ef4444'; statusText = "Atrasada";
                      } else if (diffHoras <= 48) {
                        statusColor = '#f97316'; statusText = "Urgente (<48h)";
                      }

                      return (
                          <div 
                            key={tarea.ID_Tarea} 
                            draggable={!isRealizada} // Solo permitimos arrastrar tareas pendientes
                            onDragStart={(e) => {
                              e.dataTransfer.setData("taskId", tarea.ID_Tarea);
                              e.currentTarget.style.opacity = "0.4"; // Efecto visual de "fantasma" al arrastrar
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = "1"; // Restauramos la visibilidad al soltar
                            }}
                            className={`grid grid-cols-[280px_repeat(12,1fr)] items-stretch border-b border-slate-50 group/task hover:bg-slate-100/50 transition-all duration-700 ${lastMovedId === tarea.ID_Tarea ? 'bg-blue-200 ring-2 ring-blue-500 ring-inset shadow-lg' : 'bg-slate-50/30'} ${!isRealizada ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                          >
                          {/* COLUMNA 1: DESCRIPCIÓN + SEMÁFORO INTERACTIVO */}
                          <div className="p-3 pl-8 border-r border-slate-100 relative flex gap-3 items-start">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"></div>
                            
                            {/* Semáforo Visual (Inerte) */}
                            <div 
                              className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 border shadow-sm`}
                              style={{ backgroundColor: statusColor, borderColor: 'rgba(0,0,0,0.1)' }}
                              title={`Estado actual: ${statusText}`}
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

              {/* --- CAPA 4: CONTENEDOR DE TAREAS GENERALES (Fuera del ciclo de Hitos) --- */}
              {expandedProjects.includes(proyecto) && (() => {
                const idsHitosReales = hitosDelProyecto.map(h => h.ID_Hito);
                const tareasSinHito = tasks.filter(t => 
                  t.Proyecto === proyecto && 
                  (!t.ID_Hito || t.ID_Hito === 'Gral' || !idsHitosReales.includes(t.ID_Hito))
                );

                if (tareasSinHito.length === 0) return null;

                return (
                  <div className="bg-slate-50/80 border-t border-blue-200">
                    <div className="px-4 py-2 bg-blue-50/50 flex items-center gap-2">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                        📥 Tareas por Clasificar / Generales ({tareasSinHito.length})
                      </span>
                    </div>
                    {tareasSinHito.map((tarea: any) => {
                      // 🚦 SEMÁFORO PREVENTIVO SANSCE OS v3.0 (Sincronizado)
                      const parseSanceDate = (dStr: string) => {
                        if (!dStr || typeof dStr !== 'string') return new Date();
                        if (dStr.includes('-')) return new Date(dStr);
                        const [d, m, a] = dStr.split('/').map(n => parseInt(n));
                        return new Date(a, m - 1, d);
                      };

                      const isRealizada = tarea.Estado === 'Realizada';
                      const fechaEntrega = parseSanceDate(tarea.FechaEntrega); // ✅ Traducción activada
                      const diffHoras = (fechaEntrega.getTime() - hoy.getTime()) / (1000 * 3600);

                      let statusColor = '#3b82f6'; // Azul: Con tiempo
                      let statusText = "Programada";

                      if (isRealizada) {
                        statusColor = '#10b981'; // Verde: Realizada
                        statusText = "Realizada";
                      } else if (diffHoras < 0) {
                        statusColor = '#ef4444'; // Rojo: Vencida
                        statusText = "Atrasada";
                      } else if (diffHoras <= 48) {
                        statusColor = '#f97316'; // Naranja: Urgente (<48h)
                        statusText = "Urgente";
                      }

                      return (
                          <div 
                            key={tarea.ID_Tarea} 
                            draggable={!isRealizada}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("taskId", tarea.ID_Tarea);
                              e.currentTarget.style.opacity = "0.4";
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                            className={`grid grid-cols-[280px_repeat(12,1fr)] items-stretch border-b border-slate-50 group/task hover:bg-slate-100/50 transition-all duration-700 ${lastMovedId === tarea.ID_Tarea ? 'bg-blue-200 ring-2 ring-blue-500 ring-inset shadow-lg' : 'bg-slate-50/30'} ${!isRealizada ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                          >
                          <div className="p-3 pl-8 border-r border-slate-100 relative flex gap-3 items-start">
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"></div>
                            
                            <button 
                              onClick={() => !isRealizada && updateTaskStatusAction(tarea.ID_Tarea, 'Realizada').then(() => router.refresh())}
                              className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 border transition-transform hover:scale-125 shadow-sm`}
                              style={{ backgroundColor: statusColor, borderColor: 'rgba(0,0,0,0.1)' }}
                              title={`Estado: ${statusText} - Clic para completar`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-600 font-bold leading-tight">{tarea.Descripcion}</p>
                              <p className="text-[8px] text-blue-500 uppercase font-black mt-1">Hito: {tarea.ID_Hito}</p>
                            </div>
                          </div>
                          <div className="relative col-span-12 h-10 flex items-center px-1">
                            <div className="absolute h-1 w-full bg-blue-100/30"></div>
                            <div 
                              className="absolute h-3 rounded-full opacity-60"
                              style={{ left: '0%', width: '100%', backgroundColor: statusColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
      {/* 🆕 MODAL QUIRÚRGICO DE REPROGRAMACIÓN */}
    </div>
  );
}