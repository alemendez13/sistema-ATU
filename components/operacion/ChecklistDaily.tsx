//components/operacion/ChecklistDaily.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, Sun, Clock, Moon, CheckCircle } from 'lucide-react';
import { saveChecklistAction } from '@/lib/actions';

interface ChecklistProps {
  activities: any[];
  savedProgress: any[];
  currentDate: string;
}

export default function ChecklistDaily({ activities, savedProgress, currentDate }: ChecklistProps) {
  // 1. Unificamos la configuración con el progreso real guardado en Google Sheets
  const [localActivities, setLocalActivities] = useState(() => {
    return activities.map(act => {
      const progress = savedProgress.find(p => p.ActivityID === act['ID, Actividad']);
      return {
        id: act['ID, Actividad'],
        nombre: act['ID, Actividad'], // Tomamos el nombre del campo ID/Actividad
        bloque: act.Bloque || 'Durante el día',
        asignado: act.EmailAsignado,
        completado: progress?.IsCompleted === 'TRUE'
      };
    });
  });

  const [syncingId, setSyncingId] = useState<string | null>(null);

  // 2. Cálculos de Progreso (Para su tablero de control)
  const stats = useMemo(() => {
    const total = localActivities.length;
    const completadas = localActivities.filter(a => a.completado).length;
    return {
      porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0,
      completadas,
      total
    };
  }, [localActivities]);

  // 3. Acción de Guardado (Se comunica con lib/actions.ts)
  const handleToggle = async (id: string, currentStatus: boolean) => {
    setSyncingId(id);
    const newStatus = !currentStatus;
    
    // Optimismo: Cambiamos en pantalla de inmediato
    setLocalActivities(prev => prev.map(a => a.id === id ? { ...a, completado: newStatus } : a));

    // Persistencia: Mandamos a Google Sheets
    // Nota: Aquí usaríamos el email del usuario logueado. Por ahora contacto@sansce.com
    const res = await saveChecklistAction('contacto@sansce.com', currentDate, id, newStatus);
    
    if (!res.success) {
      alert("No se pudo sincronizar con Google Sheets. Reintenta.");
      setLocalActivities(prev => prev.map(a => a.id === id ? { ...a, completado: currentStatus } : a));
    }
    setSyncingId(null);
  };

  // 4. Agrupador por Bloque
  const bloques = ['Apertura', 'Durante el día', 'Cierre'];

  return (
    <div className="space-y-8">
      {/* BARRA DE PROGRESO GLOBAL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cumplimiento General</span>
          <span className="text-3xl font-black text-blue-600">{stats.porcentaje}%</span>
        </div>
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-out"
            style={{ width: `${stats.porcentaje}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400 font-medium italic">
          {stats.completadas} de {stats.total} actividades registradas con éxito.
        </p>
      </div>

      {/* LISTADO POR BLOQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bloques.map((bloque) => {
          const items = localActivities.filter(a => a.bloque === bloque);
          const icon = bloque === 'Apertura' ? <Sun className="text-amber-500" size={20}/> : 
                       bloque === 'Cierre' ? <Moon className="text-indigo-500" size={20}/> : 
                       <Clock className="text-blue-500" size={20}/>;

          return (
            <section key={bloque} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                {icon}
                <h3 className="font-bold text-slate-700">{bloque}</h3>
              </div>
              
              <div className="space-y-2">
                {items.map((act) => (
                  <div 
                    key={act.id}
                    onClick={() => !syncingId && handleToggle(act.id, act.completado)}
                    className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      act.completado 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-white border-slate-100 hover:border-blue-200 text-slate-600 shadow-sm'
                    } ${syncingId === act.id ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="mt-0.5">
                      {act.completado 
                        ? <CheckCircle2 className="text-emerald-500" size={18} /> 
                        : <Circle className="text-slate-300 group-hover:text-blue-400" size={18} />
                      }
                    </div>
                    <div className="flex-1">
                       <p className={`text-xs leading-tight font-medium ${act.completado ? 'line-through opacity-70' : ''}`}>
                         {act.nombre}
                       </p>
                       {act.asignado && !act.completado && (
                         <span className="text-[9px] uppercase font-bold text-slate-400 block mt-1">
                           Asignado: {act.asignado.split('@')[0]}
                         </span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}