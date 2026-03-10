//components/operacion/TaskBoardClient.tsx
"use client";

import React, { useState } from 'react';
import { LayoutList, GanttChartSquare, Filter, Plus, X, Target, Zap, ChevronRight } from 'lucide-react'; 
import { updateTaskStatusAction, fetchOkrDataAction } from '@/lib/actions'; // 🆕 Importamos fetchOkrDataAction
import TaskListView from './TaskListView';
import GanttView from './GanttView';
import MinutaForm from './MinutaForm'; 
import HitoForm from './HitoForm';
import TaskForm from './TaskForm';

export default function TaskBoardClient({ 
  initialTasks, 
  initialHitos, 
  personal,
  history = [] // 👈 Recibimos el historial con un valor vacío por defecto
}: { 
  initialTasks: any[], 
  initialHitos: any[],
  personal: any[],
  history?: any[] // 👈 Declaramos que es opcional para evitar errores
}) {
  const [view, setView] = useState<'lista' | 'cronograma'>('cronograma'); // 🕒 Prioridad Estratégica: El sistema inicia siempre en el Gantt
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'minuta' | 'hito' | 'tarea'>('minuta');
  const [prefilledProject, setPrefilledProject] = useState<string>("");
  const [prefilledHitoId, setPrefilledHitoId] = useState<string>("");

  // 📡 ESTADOS DEL RADAR ESTRATÉGICO (OKRs)
  const [showOkrBubble, setShowOkrBubble] = useState(false);
  const [okrData, setOkrData] = useState<any[]>([]);
  const [loadingOkr, setLoadingOkr] = useState(false);

  const toggleOkrRadar = async () => {
    if (!showOkrBubble && okrData.length === 0) {
      setLoadingOkr(true);
      try {
        // 🛡️ CORRECCIÓN: Usamos el email maestro de administración definido en su catálogo
        const data = await fetchOkrDataAction("administracion@sansce.com"); 
        setOkrData(data);
      } catch (err) {
        console.error("Error al cargar radar:", err);
      } finally {
        setLoadingOkr(false);
      }
    }
    setShowOkrBubble(!showOkrBubble);
  };

  const openHitoWithProject = (projectName: string) => {
    setPrefilledProject(projectName);
    setModalMode('hito');
    setIsModalOpen(true);
  };

  // 🆕 Abre modal para crear tarea específica dentro de un Tipo de Actividad
  const openTaskWithHito = (projectName: string, hitoId: string) => {
    setPrefilledProject(projectName);
    setPrefilledHitoId(hitoId);
    setModalMode('tarea');
    setIsModalOpen(true);
  };
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

        <div className="flex gap-2">
          {/* 🛡️ ACCESO ÚNICO SANSCE OS: Centralización en Minuta */}
          <button
            onClick={() => { setModalMode('minuta'); setIsModalOpen(true); }}
            className="flex items-center gap-3 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 border-b-4 border-emerald-800"
          >
            <Plus size={20} /> REGISTRAR ACUERDOS (MINUTA)
          </button>

          {/* 🆕 BOTÓN RADAR ESTRATÉGICO (Violeta) */}
          <button
            onClick={toggleOkrRadar}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 ${
              showOkrBubble ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <Target size={18} /> {showOkrBubble ? 'Cerrar Radar' : 'Radar Estratégico'}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-slate-400 px-4">
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
          <GanttView 
            hitos={initialHitos} 
            tasks={initialTasks}
            onAddActivity={openHitoWithProject} 
            onAddTask={openTaskWithHito} // 🆕 El "Radar" ya tiene a dónde enviar la señal
          />
        )}
      </div>
      {/* 🆕 VENTANA EMERGENTE (MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto overflow-x-hidden">
            {/* Botón para cerrar */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
            >
              <X size={24} />
            </button>
            
            <div className="p-2">
              <h2 className="text-2xl font-bold text-slate-800 p-8 pb-0">
                {modalMode === 'minuta' ? 'Registrar Nuevos Acuerdos' : 
                 modalMode === 'tarea' ? 'Nueva Tarea Ejecutiva' : 'Configurar Tipo de Actividad'}
              </h2>
              
              {modalMode === 'minuta' ? (
  <MinutaForm 
    personal={personal} 
    hitos={initialHitos} 
    tasks={initialTasks} 
    history={history} // 👈 Pasamos la señal del historial al formulario
  />
) : modalMode === 'tarea' ? (
                <TaskForm 
                  personal={personal} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    setPrefilledProject("");
                    setPrefilledHitoId(""); // Limpiamos rastro de hito
                  }} 
                  defaultProject={prefilledProject} 
                  defaultHitoId={prefilledHitoId}
                />
              ) : (
                <HitoForm 
                  personal={personal} 
                  onSuccess={() => { setIsModalOpen(false); setPrefilledProject(""); }} 
                  defaultProject={prefilledProject} 
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* 📡 PANEL FLOTANTE: RADAR DE OKRs (Alineación Estratégica) */}
      {showOkrBubble && (
        <div className="fixed right-6 bottom-6 w-80 md:w-96 z-[90] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[70vh]">
            <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Estrategia SANSCE</span>
              </div>
              <button onClick={() => setShowOkrBubble(false)}><X size={18} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar">
              {loadingOkr ? (
                <div className="py-10 text-center text-slate-400 text-xs font-bold animate-pulse">Sincronizando con el Norte Estratégico...</div>
              ) : (
                <div className="space-y-4">
                  {okrData.map((obj: any) => (
                    <div key={obj.Objective_ID} className="space-y-2">
                      <h4 className="text-[10px] font-black text-purple-600 uppercase border-l-2 border-purple-500 pl-2">
                        Obj: {obj.Nombre}
                      </h4>
                      <div className="space-y-1.5 pl-2">
                        {obj.ResultadosClave.map((kr: any) => (
                          <div key={kr.KR_ID} className="bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                            <div className="flex items-center gap-2">
                              <Zap size={12} className="text-amber-500" />
                              <p className="text-[9px] font-bold text-slate-700 leading-tight">{kr.Nombre_KR}</p>
                            </div>
                            <div className="mt-2 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-purple-500 h-full" style={{ width: `${kr.KR_Average}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase italic">Alinea tus proyectos a estos resultados</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}