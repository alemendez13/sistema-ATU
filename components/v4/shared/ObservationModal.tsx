//components/v4/shared/ObservationModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { useHierarchy } from '../core/HierarchicalProvider';
import { TaskV4 } from '@/lib/v4/utils-hierarchy';

interface Props {
  task: TaskV4;
  onClose: () => void;
}

export default function ObservationModal({ task, onClose }: Props) {
  const [newObs, setNewObs] = useState('');
  const { updateTaskState } = useHierarchy();
  const [isSaving, setIsSaving] = useState(false);

  // 📜 Procesamos el historial: Separamos por el carácter "|"
  const history = task.observaciones 
    ? task.observaciones.split('|').filter(obs => obs.trim() !== '') 
    : [];

  const handleSave = async () => {
    if (!newObs.trim()) return;
    setIsSaving(true);

    try {
      // 1. FECHA AUTOMÁTICA SANSCE
      const d = new Date();
      const hoy = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      
      // 2. CONSTRUCCIÓN DE LA NOTA
      const noteWithDate = `[${hoy}]: ${newObs.trim()}`;
      const updatedObs = task.observaciones ? `${task.observaciones} | ${noteWithDate}` : noteWithDate;
      
      // 3. ACTUALIZACIÓN OPTIMISTA (Cambio inmediato en pantalla)
      updateTaskState(task.id, { observaciones: updatedObs });

      // NOTA: La conexión con Google Sheets se realizará en el siguiente paso técnico
      setNewObs('');
      onClose();
    } catch (error) {
      console.error("Error al guardar observación:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* CABECERA ESTILO RADAR */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2 italic">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              OBSERVACIONES
            </h3>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
              ID: {task.id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* ÁREA DE HISTORIAL (Burbujas de tiempo) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-white">
          {history.length > 0 ? (
            history.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group hover:bg-blue-50/50 transition-colors">
                 <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.trim()}</p>
                 <div className="absolute -left-1 top-4 w-1 h-6 bg-blue-300 rounded-full group-hover:bg-blue-500 transition-colors" />
              </div>
            ))
          ) : (
            <div className="text-center py-20">
               <MessageSquare className="w-12 h-12 text-slate-100 mx-auto mb-2" />
               <p className="text-slate-400 text-xs italic">Sin comentarios registrados.</p>
            </div>
          )}
        </div>

        {/* PANEL DE ESCRITURA */}
        <div className="p-6 bg-slate-50 border-t">
          <div className="relative">
            <textarea
              value={newObs}
              onChange={(e) => setNewObs(e.target.value)}
              placeholder="Escribe un avance o comentario..."
              className="w-full rounded-2xl border-slate-200 text-sm p-4 pr-12 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[100px] shadow-inner"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !newObs.trim()}
              className="absolute bottom-4 right-4 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[9px] text-slate-400 mt-3 text-center uppercase font-bold tracking-tighter">
            Al enviar, se notificará la actualización en el sistema.
          </p>
        </div>
      </div>
    </div>
  );
}