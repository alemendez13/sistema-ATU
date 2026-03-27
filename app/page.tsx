//app/page.tsx
"use client";
import ProtectedRoute from "../components/ProtectedRoute";
// 🩺 Importación de iconos necesaria al inicio del archivo
  import { TrendingUp, Calendar, Users, CheckCircle2, ArrowUpRight } from "lucide-react";

import { useState, useEffect } from "react"; // ➕ Agregamos useEffect
import { ChevronDown, ChevronUp, LayoutGrid, Target, ListTodo, Clock, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
// ➕ Consolidamos importaciones de acciones y agregamos las de Checklist
import { 
  fetchTareasDashboardAction, // 🚀 Nueva conexión a Tareas Reales
  fetchOkrDataAction, 
  fetchDashboardChecklistAction, 
  saveChecklistAction 
} from "@/lib/actions";

export default function Home() {
  // Estados de Interfaz (Configurados para iniciar contraídos/ocultos)
  const [showTasks, setShowTasks] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // 🛡️ SANSCE OS: Definición de Identidad y Estados Unificados
  const { user } = useAuth() as { user: any }; // Forzamos el tipo para eliminar el error "never"
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]); // ➕ Nuevo estado para el Checklist
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificación de seguridad para evitar errores de lectura nula
    const userEmail = user?.email;
    if (!userEmail) return;

    async function loadDashboardData() {
      setLoading(true);
      try {
        // 🚀 Carga Triple en Paralelo Real (Cronograma + OKRs + Checklist)
        const [tasksData, okrData, checklistData] = await Promise.all([
          fetchTareasDashboardAction(), // 🎯 Cambiamos Hitos por Tareas Operativas
          fetchOkrDataAction(userEmail),
          fetchDashboardChecklistAction(userEmail) 
        ]);
        
        setTasks(tasksData || []);
        setGoals(okrData || []);
        setChecklist(checklistData || []); // ➕ Datos vivos

      } catch (error) {
        console.error("Error en sincronización SANSCE:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user?.email]);

  // Estilo común para las tarjetas tipo "Burbuja"
  const bubbleStyle = "bg-white/80 backdrop-blur-md rounded-[2rem] border border-sansce-border shadow-premium overflow-hidden transition-all duration-500 ease-in-out";

  // ⚡ Lógica Quirúrgica para marcar/desmarcar tareas
  const handleToggleCheck = async (activityId: string, currentStatus: boolean) => {
    if (!user?.email) return;
    const newStatus = !currentStatus;
    const dateId = new Date().toISOString().split('T')[0];

    // 1. Actualización Optimista (Cambio instantáneo en pantalla)
    setChecklist(prev => prev.map(item => 
      item.id === activityId ? { ...item, status: newStatus } : item
    ));

    // 2. Sincronización en segundo plano con Google Cloud
    const result = await saveChecklistAction(user.email, dateId, activityId, newStatus);
    
    if (!result.success) {
      // Revertir cambio si hay error de conexión
      setChecklist(prev => prev.map(item => 
        item.id === activityId ? { ...item, status: currentStatus } : item
      ));
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] mx-auto space-y-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* 1. CUADRANTE SUPERIOR: CRONOGRAMA (DE LADO A LADO) */}
        <section className={`${bubbleStyle} ${showTasks ? 'flex-1' : 'h-20'}`}>
          <div className="p-6 flex justify-between items-center border-b border-sansce-border/50 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sansce-brand text-white rounded-xl shadow-lg">
                <LayoutGrid size={20} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-sansce-text uppercase">Cronograma de Tareas</h2>
            </div>
            <button onClick={() => setShowTasks(!showTasks)} className="p-2 hover:bg-sansce-border rounded-full transition-colors">
              {showTasks ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {showTasks && (
            <div className="p-6 overflow-x-auto animate-in zoom-in-95 duration-300">
              {loading ? ( // 🔧 Corregido: Usamos 'loading' unificado
                <div className="flex items-center gap-3 p-4 text-sansce-muted animate-pulse">
                  <Clock className="animate-spin" size={18} />
                  <span>Sincronizando cronograma con Google Cloud...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.length > 0 ? (
                    tasks
                      .filter(t => t.estado !== 'Completado' && t.estado !== 'Realizada' && t.estado !== 'Cancelada')
                      .map((task, idx) => {
                      // 🛡️ SANSCE DASHBOARD RADAR: Sincronización de alertas de tiempo (Operativo)
                      const hoyStr = new Date().toLocaleDateString('sv-SE');
                      const isTerminal = task.estado === 'Completado' || task.estado === 'Realizada' || task.estado === 'Cancelada';
                      const esVencida = !isTerminal && task.fechaEntrega && task.fechaEntrega < hoyStr;

                      return (
                        <div key={idx} className={`p-4 rounded-2xl border transition-all group hover:shadow-md ${
                          esVencida 
                            ? 'bg-red-50/50 border-red-500 shadow-lg shadow-red-100 ring-1 ring-red-200' 
                            : 'bg-white border-sansce-border'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit ${
                                task.estado === 'Completado' || task.estado === 'Realizada' ? 'bg-emerald-100 text-emerald-700' : 
                                esVencida ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {esVencida ? '⚠️ Vencida' : task.estado}
                              </span>
                              {esVencida && (
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter">
                                  {Math.floor((new Date(hoyStr).getTime() - new Date(task.fechaEntrega).getTime()) / (1000 * 60 * 60 * 24))} días de atraso
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-medium flex items-center gap-1 ${esVencida ? 'text-red-700 font-bold' : 'text-sansce-muted'}`}>
                              <Clock size={10} /> {task.fechaEntrega}
                            </span>
                          </div>
                          <h4 className={`text-sm font-semibold transition-colors line-clamp-2 ${esVencida ? 'text-red-900' : 'text-sansce-text group-hover:text-sansce-brand'}`}>
                            {task.descripcion}
                          </h4>
                          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-50">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${esVencida ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-sansce-brand'}`}>
                              <User size={12} />
                            </div>
                            <span className={`text-xs truncate ${esVencida ? 'text-red-800 font-medium' : 'text-sansce-muted'}`}>{task.responsable}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-4 text-sansce-muted text-sm italic">No hay tareas pendientes en el cronograma actual.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* CONTENEDOR INFERIOR: PARTIDO POR LA MITAD VERTICALMENTE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 2. CUADRANTE INFERIOR IZQUIERDO: METAS */}
          <section className={`${bubbleStyle} ${showGoals ? 'min-h-[400px]' : 'h-20'}`}>
            <div className="p-6 flex justify-between items-center border-b border-sansce-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg">
                  <Target size={20} />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-sansce-text uppercase">Objetivos y Metas</h2>
              </div>
              <button onClick={() => setShowGoals(!showGoals)} className="p-2 hover:bg-sansce-border rounded-full transition-colors">
                {showGoals ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showGoals && (
              <div className="p-6 space-y-6 animate-in zoom-in-95 duration-300">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div>
                    <div className="h-12 bg-slate-50 rounded-xl animate-pulse"></div>
                  </div>
                ) : goals.length > 0 ? (
                  goals.filter(g => g.estatus !== 'Inactivo').map((goal, idx) => (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-[10px] font-bold text-sansce-brand uppercase tracking-widest mb-1">
                            {goal.Objective_ID || 'Objetivo'}
                          </p>
                          <h4 className="text-sm font-bold text-sansce-text leading-tight uppercase">
                            {goal.Nombre_Objetivo}
                          </h4>
                        </div>
                        <span className="text-sm font-black text-sansce-brand">
                          {goal.progreso || 0}%
                        </span>
                      </div>
                      
                      {/* Barra de progreso fina con estilo moderno */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
                          style={{ width: `${goal.progreso || 0}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-xs text-sansce-muted uppercase tracking-widest">Sin metas asignadas a este perfil</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. CUADRANTE INFERIOR DERECHO: CHECKLIST GOOGLE SHEETS */}
          <section className={`${bubbleStyle} ${showChecklist ? 'min-h-[400px]' : 'h-20'}`}>
            <div className="p-6 flex justify-between items-center border-b border-sansce-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg">
                  <ListTodo size={20} />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-sansce-text uppercase">Checklist Operativo (Sheets)</h2>
              </div>
              <button onClick={() => setShowChecklist(!showChecklist)} className="p-2 hover:bg-sansce-border rounded-full transition-colors">
                {showChecklist ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {showChecklist && (
              <div className="p-6 space-y-3 animate-in zoom-in-95 duration-300">
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-10 bg-slate-50 rounded-xl animate-pulse"></div>
                    <div className="h-10 bg-slate-50 rounded-xl animate-pulse"></div>
                  </div>
                ) : checklist.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleToggleCheck(item.id, item.status)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-sansce-brand/20 group active:scale-[0.98]"
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.status ? 'bg-sansce-brand border-sansce-brand' : 'border-slate-300 group-hover:border-sansce-brand'
                    }`}>
                      {item.status && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className={`text-sm font-medium ${item.status ? 'text-sansce-muted line-through' : 'text-sansce-text'}`}>
                      {item.tarea}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </ProtectedRoute>
  );
}