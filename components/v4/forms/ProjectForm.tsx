'use client';

import React, { useState } from 'react';
import { saveProjectAction } from '@/lib/actions';
import { FASES_SANSCE } from '@/lib/v4/utils-hierarchy';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function ProjectForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await saveProjectAction(formData);
    if (result.success) {
      onSuccess();
    } else {
      alert("Error al guardar: " + result.error);
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Nombre del Proyecto</label>
        <input 
          required 
          name="nombre_proyecto"
          placeholder="Ej. Expansión Clínica Norte"
          className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Responsable</label>
          <input required name="responsable" placeholder="Email o Nombre" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none" />
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

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Etapa Inicial</label>
        <select name="etapa" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-4 text-sm outline-none appearance-none">
          {FASES_SANSCE.map(fase => (
            <option key={fase} value={fase}>{fase}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-4 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-sansce-muted hover:text-sansce-text transition-colors"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={isPending}
          className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> <span>Crear Proyecto</span></>}
        </button>
      </div>
    </form>
  );
}