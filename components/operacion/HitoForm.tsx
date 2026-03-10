//components/operacion/HitoForm.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // 🚀 Importación para sincronización inteligente
import { Calendar, User, Target, Save, Loader2, Briefcase } from 'lucide-react';
import { saveHitoAction } from '@/lib/actions';

interface HitoFormProps {
  personal: any[];
  onSuccess: () => void;
  defaultProject?: string;
  mode?: 'proyecto' | 'actividad'; // 🛠️ Identificador de nivel (Jerarquía SANSCE)
  projects?: string[]; // 🛠️ Listado de padres existentes para subordinación
}

export default function HitoForm({ personal, onSuccess, defaultProject, mode = 'proyecto', projects = [] }: HitoFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // ⚡ Activamos el controlador de actualización

  async function clientAction(formData: FormData) {
    setLoading(true);
    try {
      const result = await saveHitoAction(formData);
      if (result.success) {
        onSuccess();
        // Sincronización instantánea sin parpadeo de pantalla
        router.refresh(); 
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Error de conexión al guardar el hito.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={clientAction} className="p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. SELECCIÓN DE PROYECTO (Validación de Jerarquía SANSCE OS) */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Target size={14} className={mode === 'proyecto' ? "text-emerald-600" : "text-indigo-600"} /> 
            {mode === 'proyecto' ? 'Nombre del Nuevo Proyecto' : 'Vincular a Proyecto Existente'}
          </label>
          
          {mode === 'proyecto' ? (
            <input 
              name="pc_impactado"
              placeholder="Ej: Expansión de Consultorios 2024"
              required
              className="w-full p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-emerald-900 shadow-inner"
            />
          ) : (
            <select
              name="pc_impactado"
              required
              defaultValue={defaultProject}
              className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-indigo-900 cursor-pointer"
            >
              <option value="">-- Seleccione el Proyecto Padre --</option>
              {projects.filter(p => p).map(proj => (
                <option key={proj} value={proj}>{proj}</option>
              ))}
            </select>
          )}
          <p className="text-[9px] text-slate-400 italic px-2">
            {mode === 'proyecto' 
              ? '* Esta acción creará una nueva categoría en el Cronograma Maestro.' 
              : '* La actividad se agrupará bajo el proyecto seleccionado para evitar datos huérfanos.'}
          </p>
        </div>

        {/* 2. TIPO DE ACTIVIDAD (Acción Específica) */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Briefcase size={14} className="text-slate-400" /> Tipo de Actividad / Entregable
          </label>
          <input 
            name="nombre_hito"
            placeholder="Ej: Mantenimiento Preventivo o Capacitación"
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* 3. RESPONSABLE Y ÁREA AUTOMÁTICA */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <User size={14} className="text-blue-500" /> Responsable del Proyecto
          </label>
          <div className="relative">
            <select 
              name="responsable_raw"
              required
              onChange={(e) => {
                const [nombre, area] = e.target.value.split('|');
                // Buscamos los inputs ocultos para actualizarlos
                (document.getElementsByName('responsable')[0] as HTMLInputElement).value = nombre;
                (document.getElementsByName('area_responsable')[0] as HTMLInputElement).value = area;
              }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Seleccionar responsable...</option>
              {personal.map((p, i) => {
                const nombre = p.nombre || p.Nombre || 'Sin Nombre';
                const especialidad = p.especialidad || p.Especialidad || 'General';
                return (
                  <option key={i} value={`${nombre}|${especialidad}`}>
                    {nombre} — ({especialidad})
                  </option>
                );
              })}
            </select>
            {/* Campos ocultos que viajan a la acción saveHitoAction */}
            <input type="hidden" name="responsable" />
            <input type="hidden" name="area_responsable" />
          </div>
        </div>

        {/* 4. FECHA INICIO */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" /> Fecha Inicio
          </label>
          <input 
            type="date"
            name="fecha_inicio"
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* 5. FECHA FINAL */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" /> Fecha Final
          </label>
          <input 
            type="date"
            name="fecha_fin"
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Registrando Actividad...
            </>
          ) : (
            <>
              <Save size={20} />
              Registrar Tipo de Actividad
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-tighter">
          SANSCE OS v2.0 • Los cambios se reflejarán automáticamente en la vista de Gantt
        </p>
      </div>
    </form>
  );
}