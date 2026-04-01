'use client';

import React, { useState } from 'react';
import { saveActivityAction } from '@/lib/actions';
import { FASES_SANSCE } from '@/lib/v4/utils-hierarchy';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function ActivityForm({ 
  projects, 
  onSuccess, 
  onCancel 
}: { 
  projects: string[], 
  onSuccess: () => void, 
  onCancel: () => void 
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await saveActivityAction(formData);
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
        <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Nombre del Tipo de Actividad</label>
        <input 
          required 
          name="nombre_actividad"
          placeholder="Ej. Ingeniería de Detalle"
          className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Proyecto Maestro Vinculado</label>
        <select required name="proyecto" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-4 text-sm outline-none appearance-none cursor-pointer">
          <option value="" disabled selected>Selecciona el proyecto...</option>
          {projects.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Fecha Inicio</label>
          <input required name="fecha_inicio" type="date" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Compromiso Final</label>
          <input required name="fecha_compromiso" type="date" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-3 text-sm outline-none" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-sansce-muted ml-4">Etapa Asignada</label>
        <select required name="etapa" className="w-full bg-sansce-bg border-none rounded-2xl px-6 py-4 text-sm outline-none appearance-none cursor-pointer">
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
          className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> <span>Crear Tipo de Actividad</span></>}
        </button>
      </div>
    </form>
  );
}