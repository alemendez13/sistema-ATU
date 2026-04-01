'use client';

import React, { useState, useMemo } from 'react';
import { saveTaskV4Action } from '@/lib/actions';
import { TaskV4 } from '@/lib/v4/utils-hierarchy';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function TaskForm({ tasks, onSuccess, onCancel }: { tasks: TaskV4[], onSuccess: () => void, onCancel: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  // 🧠 Lógica de Cascada: Extraer proyectos y filtrar actividades
  const proyectos = useMemo(() => Array.from(new Set(tasks.map(t => t.proyecto))).filter(p => p && p !== 'Sin Proyecto'), [tasks]);
  const actividadesDisponibles = useMemo(() => {
    if (!selectedProject) return [];
    return Array.from(new Set(tasks.filter(t => t.proyecto === selectedProject).map(t => t.actividad))).filter(a => a && a !== 'General');
  }, [selectedProject, tasks]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const result = await saveTaskV4Action(new FormData(e.currentTarget));
    if (result.success) onSuccess();
    else { alert(result.error); setIsPending(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Descripción de la Tarea</label>
        <textarea required name="descripcion" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-4 text-sm outline-none min-h-[80px] resize-none" placeholder="¿Qué hay que hacer?" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Proyecto</label>
          <select required name="proyecto" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none appearance-none cursor-pointer">
            <option value="">Seleccionar...</option>
            {proyectos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Tipo Actividad</label>
          <select required name="actividad" disabled={!selectedProject} className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none appearance-none cursor-pointer disabled:opacity-30">
            <option value="">Seleccionar...</option>
            {actividadesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Responsable (Email)</label>
          <input required name="responsable" type="email" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none" placeholder="correo@sansce.com" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Prioridad</label>
          <select name="prioridad" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none appearance-none">
            <option value="Alta">🔴 Alta</option>
            <option value="Media" selected>🟡 Media</option>
            <option value="Baja">🟢 Baja</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Fecha Inicio</label>
          <input required name="fecha_inicio" type="date" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Compromiso</label>
          <input required name="fecha_compromiso" type="date" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none" />
        </div>
      </div>

      <div className="flex items-center space-x-4 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-sansce-muted">Cancelar</button>
        <button type="submit" disabled={isPending} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> <span>Crear Tarea</span></>}
        </button>
      </div>
    </form>
  );
}