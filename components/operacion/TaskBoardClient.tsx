//components/operacion/TaskBoardClient.tsx
"use client";

import React, { useState } from 'react';
import { LayoutList, GanttChartSquare, Filter, Plus, X, Target, Zap, ChevronRight } from 'lucide-react'; 
import { useRouter } from 'next/navigation'; // 🚀 Motor de actualización silenciosa
import { updateTaskStatusAction, fetchOkrDataAction } from '@/lib/actions'; 
import TaskListView from './TaskListView';
import GanttView from './GanttView';
import MinutaForm from './MinutaForm'; 
import HitoForm from './HitoForm';
import TaskForm from './TaskForm';

export default function TaskBoardClient({ 
  initialTasks, 
  initialHitos, 
  personal,
  history = [] 
}: { 
  initialTasks: any[], 
  initialHitos: any[],
  personal: any[],
  history?: any[] 
}) {
  const router = useRouter(); // ⚡ Iniciamos el controlador de sincronización SANSCE
  // 🧠 MOTOR DE FILTRADO INTELIGENTE SANSCE OS
  const [fResponsable, setFResponsable] = useState('all');
  const [fEstatus, setFEstatus] = useState('all');
  const [fUrgencia, setFUrgencia] = useState('all');

  // 1. Extracción de responsables únicos para el dropdown
  const listaResponsables = Array.from(new Set(initialTasks.map(t => t.EmailAsignado?.split('@')[0]))).filter(Boolean);

  // 2. Lógica de filtrado en tiempo real
  const tasksFiltradas = initialTasks.filter(t => {
    const cumpleResp = fResponsable === 'all' || t.EmailAsignado?.includes(fResponsable);
    
    const isDone = t.Estado === 'Realizada' || t.Estado === 'Cumplida' || t.Estado === 'Cancelada';
    const cumpleEstatus = fEstatus === 'all' || 
                         (fEstatus === 'Terminadas' ? isDone : t.Estado === fEstatus);
    
    let cumpleUrgencia = true;
    if (fUrgencia !== 'all') {
      // 🛡️ SANSCE CLOCK: Obtenemos la fecha exacta en la zona horaria local (MX)
      const hoyStr = new Date().toLocaleDateString('sv-SE'); 
      
      const esAtrasada = !isDone && t.FechaEntrega && t.FechaEntrega < hoyStr;
      const esParaHoy = !isDone && t.FechaEntrega === hoyStr;
      
      if (fUrgencia === 'atrasadas') cumpleUrgencia = esAtrasada;
      if (fUrgencia === 'hoy') cumpleUrgencia = esParaHoy;
    }

    return cumpleResp && cumpleEstatus && cumpleUrgencia;
  });
  const [view, setView] = useState<'lista' | 'cronograma'>('cronograma');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'minuta' | 'hito' | 'tarea'>('minuta');
  const [isMinutaMinimized, setIsMinutaMinimized] = useState(false); // 🔍 Memoria de persistencia
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
            {/* 🎛️ BARRA DE FILTROS INTELIGENTES SANSCE */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                Tareas Operativas <span className="text-blue-600">[{tasksFiltradas.length}]</span>
              </h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtro 1: Responsable */}
                <select 
                  value={fResponsable}
                  onChange={(e) => setFResponsable(e.target.value)}
                  className="text-[10px] font-bold uppercase p-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">👤 Todos los Responsables</option>
                  {listaResponsables.map(res => (
                    <option key={res} value={res}>{res.toUpperCase()}</option>
                  ))}
                </select>

                {/* Filtro 2: Estatus */}
                <select 
                  value={fEstatus}
                  onChange={(e) => setFEstatus(e.target.value)}
                  className="text-[10px] font-bold uppercase p-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">📊 Todos los Estatus</option>
                  <option value="Pendiente">Pendientes</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Terminadas">Realizadas / Canceladas</option>
                </select>

                {/* Filtro 3: Urgencia */}
                <select 
                  value={fUrgencia}
                  onChange={(e) => setFUrgencia(e.target.value)}
                  className="text-[10px] font-bold uppercase p-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">📅 Todas las Fechas</option>
                  <option value="atrasadas">⚠️ Solo Atrasadas</option>
                  <option value="hoy">🔔 Para Hoy</option>
                </select>

                {/* Botón Limpiar */}
                {(fResponsable !== 'all' || fEstatus !== 'all' || fUrgencia !== 'all') && (
                  <button 
                    onClick={() => { setFResponsable('all'); setFEstatus('all'); setFUrgencia('all'); }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Limpiar filtros"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <TaskListView 
              tasks={tasksFiltradas} // 👈 Conexión con el motor de filtrado
              loadingId={loadingId} 
              onToggleStatus={handleToggleStatus} 
              history={history} 
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
      {/* 🆕 VENTANA EMERGENTE (MODAL PERSISTENTE SANSCE) */}
      {(isModalOpen || isMinutaMinimized) && (
        <div 
          className={`fixed z-[100] transition-all duration-500 ease-in-out ${
            isMinutaMinimized 
              ? 'bottom-4 right-4 w-80 h-16 cursor-pointer shadow-2xl hover:scale-105' 
              : 'inset-0 p-4 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center'
          }`}
          onClick={() => isMinutaMinimized && setIsMinutaMinimized(false)}
        >
          <div className={`relative bg-white shadow-2xl overflow-hidden transition-all duration-500 ${
            isMinutaMinimized 
              ? 'w-full h-full rounded-2xl border-2 border-emerald-500 flex items-center px-4 bg-emerald-50' 
              : 'w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-y-auto'
          }`}>
            
            {/* Cabecera de Control de Superpoderes */}
            <div className={`absolute top-4 right-6 flex gap-2 z-10 ${isMinutaMinimized ? 'hidden' : ''}`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinutaMinimized(true); }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                title="Minimizar para consultar cronograma"
              >
                <LayoutList size={20} />
              </button>
              <button 
                onClick={() => { setIsModalOpen(false); setIsMinutaMinimized(false); }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* 🟢 VISTA MINIMIZADA (BARRA DE ESTADO): Solo visible cuando se activa la minimización */}
            {isMinutaMinimized && (
              <div className="flex items-center gap-3 w-full h-full animate-pulse">
                <div className="bg-emerald-500 p-2 rounded-lg text-white"><Plus size={16}/></div>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-tighter">Minuta en progreso... (Clic para recuperar)</span>
              </div>
            )}

            {/* ⚪ VISTA EXPANDIDA (EL CEREBRO): Siempre presente en memoria, pero invisible si está minimizada */}
            <div className={`p-2 ${isMinutaMinimized ? 'hidden' : 'block'}`}>
              <h2 className="text-2xl font-bold text-slate-800 p-8 pb-0">
                {modalMode === 'minuta' ? 'Registrar Nuevos Acuerdos' : 
                 modalMode === 'tarea' ? 'Nueva Tarea Ejecutiva' : 'Configurar Tipo de Actividad'}
              </h2>
              
              {modalMode === 'minuta' ? (
                <MinutaForm 
                  personal={personal} 
                  hitos={initialHitos} 
                  tasks={initialTasks} 
                  history={history} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    setIsMinutaMinimized(false);
                    router.refresh();
                  }}
                />
              ) : modalMode === 'tarea' ? (
                <TaskForm 
                  personal={personal} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    setPrefilledProject("");
                    setPrefilledHitoId("");
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