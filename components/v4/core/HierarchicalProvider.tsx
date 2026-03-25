//HierarchicalProvider.tsx//
'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';
import { TaskV4 } from '@/lib/v4/utils-hierarchy';

interface HierarchicalContextType {
  tasks: TaskV4[];
  view: 'cronograma' | 'lista' | 'minuta';
  setView: (view: 'cronograma' | 'lista' | 'minuta') => void;
  getStatusStyles: (task: TaskV4) => string;
  isPending: boolean;
  updateTaskState: (taskId: string, newState: Partial<TaskV4>) => void;
  // 🔗 NUEVOS CONTROLES DE SINCRONIZACIÓN SANSCE
  expanded: string[];
  toggleExpanded: (id: string) => void;
}

const HierarchicalContext = createContext<HierarchicalContextType | undefined>(undefined);

export function HierarchicalProvider({ 
  children, 
  initialTasks 
}: { 
  children: React.ReactNode; 
  initialTasks: TaskV4[];
}) {
  const [tasks, setTasks] = useState<TaskV4[]>(initialTasks);
  const [view, setView] = useState<'cronograma' | 'lista' | 'minuta'>('cronograma');
  const [expanded, setExpanded] = useState<string[]>([]); // 🧠 ESTADO MAESTRO DE APERTURA
  const [isPending, startTransition] = useTransition();

  const toggleExpanded = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 🚥 LÓGICA DE SEMÁFORO (Regla 6 del Director)
  const getStatusStyles = (task: TaskV4) => {
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
    const fechaEntrega = (task.fechaEntrega || "").trim();

    // 🟢 ESTATUS: REALIZADA (Éxito - Verde Intenso Vibrante)
    // Se cambia a emerald-600 para mayor contraste y se duplica la intensidad del brillo
    if (task.estado === 'Realizada') {
      return 'border-[3px] border-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.4)] bg-white';
    }

    // 🔴 ESTATUS: ATRASADA (Alerta)
    // Contorno Carmesí intenso para tareas vencidas y no realizadas
    if (fechaEntrega < hoy) {
      return 'border-[3px] border-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)] bg-white';
    }

    // 🟡 ESTATUS: EN PROCESO (Operación)
    // Contorno Ámbar vibrante para tareas en tiempo (hoy o futuro)
    return 'border-[3px] border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)] bg-white';
  };

  // Actualización local inmediata (Optimistic UI)
  const updateTaskState = (taskId: string, newState: Partial<TaskV4>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...newState } : t));
  };

  return (
    <HierarchicalContext.Provider value={{ 
      tasks, 
      view, 
      setView, 
      getStatusStyles, 
      isPending,
      updateTaskState,
      expanded,         // 🔗 Inyección de Sincronización
      toggleExpanded    // 🔗 Inyección de Sincronización
    }}>
      {/* 🧩 FONDO PRINCIPAL SANSCE */}
      <div className="flex h-screen w-full overflow-hidden bg-sansce-bg">
        {/* ÁREA PRINCIPAL DE TRABAJO */}
        <main className="flex-1 overflow-auto with-sidebar">
          {children}
        </main>

        {/* 🛠️ SUB-SIDEBAR DERECHO (CONTROL MAESTRO MINIMALISTA) */}
        <aside className="w-20 border-l border-sansce-border bg-sansce-surface flex flex-col shadow-premium z-10 transition-all duration-300">
          <div className="h-20 flex items-center justify-center border-b border-sansce-bg">
            <div className="w-2 h-2 rounded-full bg-sansce-brand animate-pulse" title="Panel Activo" />
          </div>
          
          <nav className="flex-1 py-8 flex flex-col items-center space-y-6">
            {[
              { id: 'cronograma', label: 'Vista Cronograma', icon: '📅' },
              { id: 'lista', label: 'Vista de Lista', icon: '📋' },
              { id: 'minuta', label: 'Vista Minuta', icon: '📝' }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setView(btn.id as any)}
                title={btn.label}
                className={`w-12 h-12 flex items-center justify-center rounded-full text-lg transition-all duration-300 relative group ${
                  view === btn.id 
                    ? 'bg-sansce-brand text-white shadow-lg scale-110' 
                    : 'bg-sansce-bg text-sansce-muted hover:bg-sansce-brand/10 hover:text-sansce-brand'
                }`}
              >
                {btn.icon}
                {/* Indicador de Selección lateral */}
                {view === btn.id && (
                  <div className="absolute -right-1 w-1 h-4 bg-sansce-brand rounded-l-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Pie de página removido por requerimiento de diseño minimalista */}
        </aside>
      </div>
    </HierarchicalContext.Provider>
  );
}

export const useHierarchy = () => {
  const context = useContext(HierarchicalContext);
  if (!context) throw new Error("useHierarchy debe usarse dentro de HierarchicalProvider");
  return context;
};