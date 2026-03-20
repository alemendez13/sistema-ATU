//app/planeacion/inteligencia/IntelligenceClient.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Target, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2 
} from "lucide-react";

interface IntelligenceProps {
  okrData: any;
  cronograma: any;
  checklist: any;
}

export default function IntelligenceClient({ okrData, cronograma, checklist }: IntelligenceProps) {
  // Protocolo "Clean Start": Todos los cuadrantes cerrados por defecto
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({
    radar: false,
    brujula: false,
    pulso: false,
  });

  const toggleSection = (section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // --- LÓGICA DE INTELIGENCIA ESTRATÉGICA (OKRs) ---
  const activeObjectives = okrData?.filter((obj: any) => obj.Estatus === 'Activo') || [];
  const totalOkrProgress = activeObjectives.length > 0 
    ? Math.round(activeObjectives.reduce((acc: number, obj: any) => acc + (obj.Promedio || 0), 0) / activeObjectives.length)
    : 0;

  // --- LÓGICA DE RADAR OPERATIVO (Proyectos y Hitos) ---
  const hitosPendientesCount = cronograma?.filter((h: any) => h.Estado !== 'Cumplida').length || 0;
  
  const proyectosStats = cronograma?.reduce((acc: any, h: any) => {
    const proy = h.Proyecto || 'General';
    if (!acc[proy]) acc[proy] = { total: 0, cumplidos: 0 };
    acc[proy].total++;
    if (h.Estado === 'Cumplida') acc[proy].cumplidos++;
    return acc;
  }, {}) || {};

  const listaProyectos = Object.entries(proyectosStats).map(([nombre, stats]: [string, any]) => ({
    nombre,
    progreso: Math.round((stats.cumplidos / stats.total) * 100)
  }));

  // Componente de "Burbuja Dinámica" para KPIs rápidos
  const KPIBubble = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-xl ${color}`}
    >
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-xs uppercase tracking-widest text-white/70 mt-1">{label}</span>
    </motion.div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* 🧬 FILA DE BURBUJAS DINÁMICAS (VISTA RÁPIDA) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIBubble label="Eficacia Diaria" value={`${checklist?.porcentaje || 0}%`} color="bg-emerald-500/20" />
        <KPIBubble label="Avance OKRs" value={`${totalOkrProgress}%`} color="bg-blue-500/20" />
        <KPIBubble label="Hitos Pendientes" value={hitosPendientesCount} color="bg-purple-500/20" />
        <KPIBubble label="Riesgo Churn" value="12%" color="bg-rose-500/20" />
      </div>

      {/* 📡 CUADRANTE 1: RADAR OPERATIVO (GANTT & HITOS) */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
        <button 
          onClick={() => toggleSection('radar')}
          className="w-full flex items-center justify-between p-8 text-left hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Radar Operativo</h2>
              <p className="text-sm text-slate-400">Salud de Proyectos y Cronogramas</p>
            </div>
          </div>
          {expanded.radar ? <ChevronUp /> : <ChevronDown />}
        </button>
        
        <AnimatePresence>
          {expanded.radar && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="grid grid-cols-1 gap-4 pt-4">
                {listaProyectos.length > 0 ? (
                  listaProyectos.map((proy) => (
                    <div key={proy.nombre} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white/90">{proy.nombre}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Salud del Proyecto</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-blue-400">{proy.progreso}%</span>
                        <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${proy.progreso}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="bg-blue-500 h-full" 
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-4 text-sm italic">No hay proyectos registrados en el cronograma.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 🎯 CUADRANTE 2: BRÚJULA ESTRATÉGICA (OKRs) */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
        <button 
          onClick={() => toggleSection('brujula')}
          className="w-full flex items-center justify-between p-8 text-left hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
              <Target size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Brújula Estratégica</h2>
              <p className="text-sm text-slate-400">Objetivos y Resultados Clave</p>
            </div>
          </div>
          {expanded.brujula ? <ChevronUp /> : <ChevronDown />}
        </button>

        <AnimatePresence>
          {expanded.brujula && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 pb-8 space-y-6"
            >
              {/* Mapeo Real de Objetivos Activos */}
              {activeObjectives.length > 0 ? (
                activeObjectives.map((obj: any) => (
                  <div key={obj.Objective_ID} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white/90">{obj.Nombre}</span>
                      <span className={obj.Promedio >= 90 ? "text-emerald-400" : "text-amber-400"}>
                        {obj.Promedio}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${obj.Promedio}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-400" 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-4 text-sm italic">
                  No hay objetivos activos en el tablero actual.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 🩺 CUADRANTE 3: PULSO DIARIO (CHECKLIST CALIDAD) */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
        <button 
          onClick={() => toggleSection('pulso')}
          className="w-full flex items-center justify-between p-8 text-left hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Pulso Diario</h2>
              <p className="text-sm text-slate-400">Cumplimiento Operativo ATU</p>
            </div>
          </div>
          {expanded.pulso ? <ChevronUp /> : <ChevronDown />}
        </button>

        <AnimatePresence>
          {expanded.pulso && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {checklist?.tareas?.length > 0 ? (
                  checklist.tareas.map((tarea: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                      <div className={`p-1.5 rounded-full transition-colors ${tarea.completada ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-600'}`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium transition-colors ${tarea.completada ? 'text-white/90' : 'text-slate-500 italic'}`}>
                          {tarea.nombre}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Estándar de Calidad SANSCE</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-[2rem] text-slate-500">
                    <Activity className="mb-2 opacity-20" size={32} />
                    <p className="text-sm italic text-center">No se han registrado actividades de cumplimiento para la jornada de hoy.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </div>
  );
}