"use client";

import React, { useState } from 'react';
import { List, User, Calendar, Save, Loader2, Briefcase } from 'lucide-react';
import { saveSingleTaskAction } from '@/lib/actions';

interface TaskFormProps {
  personal: any[];
  onSuccess: () => void;
  defaultProject: string;
  defaultHitoId: string;
}

export default function TaskForm({ personal, onSuccess, defaultProject, defaultHitoId }: TaskFormProps) {
  const [loading, setLoading] = useState(false);

  async function clientAction(formData: FormData) {
    setLoading(true);
    try {
      const result = await saveSingleTaskAction(formData);
      if (result.success) {
        onSuccess();
        // Recarga para sincronizar el Gantt y la Lista de Tareas
        window.location.reload();
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Error de conexión al guardar la tarea.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={clientAction} className="p-8 space-y-6">
      {/* 🧬 CAMPOS OCULTOS DE TRAZABILIDAD (Mantiene la jerarquía Proyecto -> Hito -> Tarea) */}
      <input type="hidden" name="proyecto" value={defaultProject} />
      <input type="hidden" name="id_hito" value={defaultHitoId} />
      <input type="hidden" name="area" />

      {/* BANNER DE CONTEXTO */}
      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6 flex items-start gap-3">
        <Briefcase className="text-blue-600 mt-1" size={18} />
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contexto de Asignación</p>
          <p className="text-xs text-slate-700 font-bold">Proyecto: {defaultProject}</p>
          <p className="text-[10px] text-blue-600 font-mono">ID Tipo de Actividad: {defaultHitoId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. DESCRIPCIÓN */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <List size={14} className="text-blue-600" /> Descripción de la Tarea Ejecutiva
          </label>
          <textarea 
            name="descripcion"
            placeholder="¿Qué acción específica se debe realizar?"
            required
            rows={3}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* 2. RESPONSABLE Y ÁREA AUTOMÁTICA */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <User size={14} className="text-blue-500" /> Responsable de Ejecución
          </label>
          <select 
            name="responsable"
            required
            onChange={(e) => {
              const [nombre, area] = e.target.value.split('|');
              const areaInput = document.getElementsByName('area')[0] as HTMLInputElement;
              if (areaInput) areaInput.value = area;
            }}
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer shadow-sm"
          >
            <option value="">Seleccionar responsable...</option>
            {personal.map((p, i) => {
                const nombre = p.nombre || p.Nombre || 'Sin Nombre';
                const area = p.area || p.Area || p.especialidad || 'General';
                return (
                    <option key={i} value={`${nombre}|${area}`}>
                        {nombre} — ({area})
                    </option>
                );
            })}
          </select>
        </div>

        {/* 3. FECHA INICIO */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" /> Fecha de Inicio
          </label>
          <input 
            type="date"
            name="fecha_inicio"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* 4. FECHA ENTREGA */}
        <div className="space-y-2 md:col-start-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-blue-600" /> Fecha Límite de Entrega
          </label>
          <input 
            type="date"
            name="fecha_entrega"
            required
            className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900 shadow-sm"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Registrando Tarea...
            </>
          ) : (
            <>
              <Save size={20} />
              Asignar Tarea a Actividad
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-tighter">
          SANSCE OS • Capa 3 de Ejecución Directa
        </p>
      </div>
    </form>
  );
}