//components/v4/shared/RescheduleModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Save, AlertCircle } from 'lucide-react';
import { useHierarchy } from '../core/HierarchicalProvider';
import { TaskV4 } from '@/lib/v4/utils-hierarchy';
import { rescheduleTaskAction } from '@/lib/actions';

interface Props {
  task: TaskV4;
  onClose: () => void;
}

export default function RescheduleModal({ task, onClose }: Props) {
  const [nuevaFecha, setNuevaFecha] = useState(task.fechaEntrega);
  const [motivo, setMotivo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { updateTaskState } = useHierarchy();

  const handleReschedule = async () => {
    if (!motivo.trim() || nuevaFecha === task.fechaEntrega) return;
    setIsSaving(true);

    try {
      // 1. Persistencia en Google Sheets (Acción existente en lib/actions.ts)
      const result = await rescheduleTaskAction(task.id, nuevaFecha, motivo);

      if (result.success) {
        // 2. Actualización Optimista en la UI
        updateTaskState(task.id, { 
          fechaEntrega: nuevaFecha,
          // Actualizamos localmente el rastro de auditoría
          observaciones: `${task.observaciones} | [REPROG]: Nueva fecha ${nuevaFecha}` 
        });
        onClose();
      }
    } catch (error) {
      console.error("Error en reprogramación:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        
        {/* ENCABEZADO ESTRATÉGICO */}
        <div className="p-8 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 italic uppercase tracking-tighter">Reprogramación</h3>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Control de Trazabilidad</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-full transition-colors text-amber-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* CAMPO: NUEVA FECHA */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Nueva Fecha de Entrega</label>
            <input 
              type="date" 
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          {/* CAMPO: MOTIVO (REGLA DE ORO) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Motivo del Cambio</label>
            <textarea 
              placeholder="Explica brevemente por qué se reprograma esta tarea..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm min-h-[100px] resize-none focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl flex gap-3 items-start border border-amber-100">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              Esta acción quedará registrada en el historial del proyecto. Se mantendrá la fecha original `{task.fechaEntrega}` como rastro de auditoría.
            </p>
          </div>
        </div>

        {/* BOTÓN DE ACCIÓN FINAL */}
        <div className="p-8 pt-0">
          <button 
            onClick={handleReschedule}
            disabled={isSaving || !motivo.trim() || nuevaFecha === task.fechaEntrega}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs hover:bg-slate-800 disabled:opacity-20 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            {isSaving ? 'Guardando Cambio...' : (
              <>
                <Save className="w-4 h-4" />
                Confirmar Reprogramación
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}