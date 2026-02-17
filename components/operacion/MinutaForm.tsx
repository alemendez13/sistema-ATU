"use client";

import React, { useState } from 'react';
import { User, Calendar, MessageSquare, ClipboardList, Plus, Trash2, Send } from 'lucide-react';
import { saveMinutaCompletaAction } from '@/lib/actions';

interface Personal {
  id: string;
  nombre: string;
  email: string;
}

// Añadimos 'hitos' a las herramientas que recibe el formulario
export default function MinutaForm({ personal, hitos = [] }: { personal: Personal[], hitos?: any[] }) {
  // 1. Estados Maestros
  const [datos, setDatos] = useState({
    fecha: new Date().toISOString().split('T')[0],
    moderador: '',
    temas: '',
    asistentes: '',
    conclusiones: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [compromisos, setCompromisos] = useState<any[]>([]);

  // --- LÓGICA DE CONTROL ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const agregarCompromiso = () => {
    // Generamos un ID único basado en la hora exacta (ej: T-1715832000)
    const idUnico = `T-${Date.now()}`;
    
    setCompromisos([...compromisos, { 
      idTarea: idUnico,
      descripcion: '', 
      responsable: '', 
      fechaInicio: datos.fecha, 
      fechaEntrega: '', 
      area: '', 
      proyecto: '', 
      idHito: '' 
    }]);
  };

  const eliminarCompromiso = (index: number) => {
    setCompromisos(compromisos.filter((_, i) => i !== index));
  };

  const handleTareaChange = (index: number, campo: string, valor: string) => {
    const nuevosCompromisos = [...compromisos];
    nuevosCompromisos[index][campo] = valor;

    // 🔗 HERENCIA AUTOMÁTICA: Si seleccionamos un Hito, heredamos su Proyecto y Área
    if (campo === 'idHito' && valor !== "") {
      const hitoEncontrado = hitos.find(h => h.ID_Hito === valor);
      if (hitoEncontrado) {
        nuevosCompromisos[index].proyecto = hitoEncontrado.Proyecto || 'General';
        nuevosCompromisos[index].area = hitoEncontrado.Area || 'General';
      }
    }

    setCompromisos(nuevosCompromisos);
  };

  // --- LÓGICA DE ENVÍO FINAL ---
  const handleSubmit = async () => {
    if (!datos.moderador) return alert("Por favor, selecciona un moderador.");
    if (compromisos.length === 0) {
       if (!confirm("No has añadido tareas. ¿Deseas finalizar la minuta solo con el resumen?")) return;
    }

    setIsSaving(true);
    try {
      const resultado = await saveMinutaCompletaAction({
        ...datos,
        asistentes: "", // Opcional por ahora según su estructura
        compromisos: compromisos
      });

      if (resultado.success) {
        alert("✅ Minuta guardada y tareas asignadas con éxito.");
        // Opcional: Limpiar el formulario o redirigir
        window.location.reload(); 
      } else {
        throw new Error(resultado.error);
      }
    } catch (error: any) {
      alert("❌ Error al guardar: " + (error?.message || "Error desconocido en el servidor"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 space-y-10">
      {/* SECCIÓN 1: DATOS GENERALES */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <Calendar size={14} /> Fecha de la Reunión
          </label>
          <input
            type="date"
            name="fecha"
            value={datos.fecha}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <User size={14} /> Moderador / Responsable
          </label>
          <select
            name="moderador"
            value={datos.moderador}
            onChange={handleChange}
            className="w-full rounded-lg border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecciona al moderador...</option>
            {personal.map(p => (
              <option key={p.id} value={p.email}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </section>

      {/* SECCIÓN 2: DESARROLLO */}
      <section className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <MessageSquare size={14} /> Orden del Día / Temas Tratados
          </label>
          <textarea
            name="temas"
            rows={4}
            value={datos.temas}
            onChange={handleChange}
            placeholder="Escribe los puntos clave de la reunión..."
            className="w-full rounded-lg border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <ClipboardList size={14} /> Conclusiones Finales
          </label>
          <textarea
            name="conclusiones"
            rows={4}
            value={datos.conclusiones}
            onChange={handleChange}
            placeholder="Registra los acuerdos definitivos..."
            className="w-full rounded-lg border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </section>

      {/* SECCIÓN 3: COMPROMISOS DINÁMICOS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <label className="text-xs font-bold uppercase text-blue-600 flex items-center gap-2">
            <Plus size={14} /> Tareas y Compromisos Generados
          </label>
          <button
            type="button"
            onClick={agregarCompromiso}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            + Añadir Compromiso
          </button>
        </div>

        <div className="space-y-4">
          {compromisos.map((tarea, index) => (
            <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 relative group">
              <button
                type="button"
                onClick={() => eliminarCompromiso(index)}
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    placeholder="¿Qué se debe hacer?"
                    className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-sm text-slate-800"
                    value={tarea.descripcion}
                    onChange={(e) => handleTareaChange(index, 'descripcion', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Responsable</label>
                  <select
                    className="w-full bg-transparent text-sm outline-none text-slate-700"
                    value={tarea.responsable}
                    onChange={(e) => handleTareaChange(index, 'responsable', e.target.value)}
                  >
                    <option value="">Asignar a...</option>
                    {personal.map(p => <option key={p.id} value={p.email}>{p.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vincular a Tipo de Actividad / Proyecto</label>
                  <select
                    className="w-full bg-transparent text-sm outline-none text-blue-700 font-medium"
                    value={tarea.idHito}
                    onChange={(e) => handleTareaChange(index, 'idHito', e.target.value)}
                  >
                    <option value="">Opcional: Vincular a Actividad...</option>
                    {hitos.map(h => (
                      <option key={h.ID_Hito} value={h.ID_Hito}>
                        [{h.Proyecto}] {h['Nombre del Hito']}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Inicio</label>
                    <input 
                      type="date" 
                      className="w-full bg-transparent text-sm outline-none text-slate-700"
                      value={tarea.fechaInicio}
                      onChange={(e) => handleTareaChange(index, 'fechaInicio', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Entrega</label>
                    <input 
                      type="date" 
                      className="w-full bg-transparent text-sm outline-none font-bold text-blue-600"
                      value={tarea.fechaEntrega}
                      onChange={(e) => handleTareaChange(index, 'fechaEntrega', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOTÓN FINAL DE GUARDADO */}
      <div className="pt-6 border-t border-slate-100 text-right">
        <button
          type="button"
          onClick={handleSubmit} // 🔌 Conexión realizada
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando en Sheets...
            </span>
          ) : (
            <>
              <Send size={18} /> Finalizar y Notificar Minuta
            </>
          )}
        </button>
      </div>
    </div>
  );
}