//components/operacion/MinutaForm.tsx
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
// 🆕 Agregamos 'tasks' a las herramientas que recibe el formulario
export default function MinutaForm({ personal, hitos = [], tasks = [] }: { personal: Personal[], hitos?: any[], tasks?: any[] }) {
  // 1. Estados Maestros
  const [datos, setDatos] = useState({
    fecha: new Date().toISOString().split('T')[0],
    moderador: '',
    asistentes: '',
    conclusiones: ''
  });

  // 🆕 Estado para la Tabla de Orden del Día
  const [puntosOrden, setPuntosOrden] = useState([{ punto: '', proyecto: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [compromisos, setCompromisos] = useState<any[]>([]);

  // --- LÓGICA DE CONTROL ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const agregarPuntoOrden = () => setPuntosOrden([...puntosOrden, { punto: '', proyecto: '' }]);
  const eliminarPuntoOrden = (index: number) => setPuntosOrden(puntosOrden.filter((_, i) => i !== index));
  const handleOrdenChange = (index: number, campo: 'punto' | 'proyecto', valor: string) => {
    const nuevosPuntos = [...puntosOrden];
    nuevosPuntos[index][campo] = valor;
    setPuntosOrden(nuevosPuntos);
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
    
    // 🛡️ REGLA DE LIMPIEZA SANSCE: Si cambiamos el proyecto, reseteamos la actividad y el área
    if (campo === 'proyecto') {
      nuevosCompromisos[index].proyecto = valor;
      nuevosCompromisos[index].idHito = ""; // Borramos la actividad seleccionada anteriormente
      nuevosCompromisos[index].area = "";   // Borramos el área previa
    } else {
      nuevosCompromisos[index][campo] = valor;
    }

    // 🔗 HERENCIA AUTOMÁTICA: Al seleccionar una Actividad, traemos sus metadatos
    if (campo === 'idHito' && valor !== "") {
      const hitoEncontrado = hitos.find(h => h.ID_Hito === valor);
      if (hitoEncontrado) {
        // Reforzamos la vinculación correcta de Proyecto y Área
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
      // 🆕 Convertimos la tabla de temas a un texto legible para Google Sheets
      const temasFormateados = puntosOrden
        .map((p, i) => `${i + 1}. [${p.proyecto}] ${p.punto}`)
        .join('\n');

      const resultado = await saveMinutaCompletaAction({
        ...datos,
        temas: temasFormateados, // Enviamos el texto procesado
        asistentes: datos.asistentes || "Sin registro",
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

  // 🆕 Estado para el filtro por persona
  const [filtroPersona, setFiltroPersona] = useState("");

  // 🆕 Cálculo de la semana actual y filtrado de pendientes
  const hoy = new Date();
  const lunes = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 1)).toISOString().split('T')[0];
  const domingo = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 7)).toISOString().split('T')[0];

  const pendientesSemana = tasks.filter(t => {
    const esEstaSemana = t.FechaEntrega >= lunes && t.FechaEntrega <= domingo;
    const noEstaCumplida = t.Estado !== 'Cumplida';
    const cumpleFiltroPersona = filtroPersona ? t.EmailAsignado === filtroPersona : true;
    return esEstaSemana && noEstaCumplida && cumpleFiltroPersona;
  });

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

        {/* 🛡️ SELECTOR MÚLTIPLE DE ASISTENTES SANSCE OS */}
        <div className="md:col-span-2 space-y-3">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <User size={14} className="text-emerald-600" /> Lista de Asistentes a la Sesión
          </label>
          
          {/* Visualizador de Asistentes Seleccionados */}
          <div className="flex flex-wrap gap-2 mb-2 p-3 bg-slate-50 rounded-xl min-h-[50px] border border-slate-100 shadow-inner">
            {datos.asistentes.split(',').filter(n => n.trim() !== "").map((nombre, i) => (
              <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black shadow-sm border border-emerald-200 animate-in zoom-in-50">
                {nombre.trim()}
                <button 
                  type="button" 
                  onClick={() => {
                    const nuevaLista = datos.asistentes.split(',').map(n => n.trim()).filter(n => n !== nombre.trim());
                    setDatos({...datos, asistentes: nuevaLista.join(', ')});
                  }} 
                  className="hover:text-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
            {datos.asistentes === "" && <span className="text-[11px] text-slate-400 italic p-1">Usa la lista de abajo para añadir asistentes...</span>}
          </div>

          {/* Menú Desplegable de Selección */}
          <select
            className="w-full rounded-lg border-slate-200 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-sm font-bold text-slate-700 bg-white cursor-pointer"
            onChange={(e) => {
              if (e.target.value === "") return;
              const nombre = e.target.value;
              const lista = datos.asistentes ? datos.asistentes.split(',').map(n => n.trim()) : [];
              if (!lista.includes(nombre)) {
                setDatos({ ...datos, asistentes: lista.length > 0 ? `${datos.asistentes}, ${nombre}` : nombre });
              }
              e.target.value = ""; // Reseteamos el selector tras añadir
            }}
          >
            <option value="">+ Seleccionar personal de la lista...</option>
            {personal.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
              <option key={p.id} value={p.nombre}>
                {p.nombre} {p.email ? `— (${p.email.split('@')[0]})` : ''}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* SECCIÓN 2: DESARROLLO (ORDEN DEL DÍA TABULAR) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <MessageSquare size={14} /> Orden del Día por Proyecto
          </label>
          <button 
            type="button" 
            onClick={agregarPuntoOrden}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
          >
            + Añadir Punto
          </button>
        </div>

        <div className="space-y-3">
          {puntosOrden.map((item, index) => (
            <div key={index} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-200">
              <select
                value={item.proyecto}
                onChange={(e) => handleOrdenChange(index, 'proyecto', e.target.value)}
                className="w-1/3 text-[11px] rounded-lg border-slate-200 bg-slate-50 font-bold text-blue-700"
              >
                <option value="">Seleccionar Proyecto...</option>
                {/* Extraemos proyectos únicos de los hitos */}
                {Array.from(new Set(hitos.map(h => h.Proyecto))).map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Punto a tratar en la reunión..."
                value={item.punto}
                onChange={(e) => handleOrdenChange(index, 'punto', e.target.value)}
                className="flex-1 text-[11px] rounded-lg border-slate-200 focus:ring-blue-500"
              />
              <button 
                type="button" 
                onClick={() => eliminarPuntoOrden(index)}
                className="p-2 text-slate-300 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* SECCIÓN 4: CIERRE Y CONCLUSIONES */}
      <section className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <ClipboardList size={14} className="text-blue-600" /> Conclusiones Finales y Cierre de Sesión
          </label>
          <textarea
            name="conclusiones"
            rows={4}
            value={datos.conclusiones}
            onChange={handleChange}
            placeholder="Registra los acuerdos definitivos, resoluciones y puntos clave del cierre..."
            className="w-full rounded-lg border-slate-200 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </section>
      </section>

      {/* 🆕 SECCIÓN: SEGUIMIENTO INTELIGENTE (RADAR DE COMPROMISOS) */}
      <section className="p-6 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-100 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-blue-900 uppercase flex items-center gap-2">
              📡 Radar de Pendientes (Semana Actual)
            </h3>
            <p className="text-[10px] text-blue-600 font-medium">Vencimientos entre {lunes} y {domingo}</p>
          </div>
          
          <select 
            value={filtroPersona}
            onChange={(e) => setFiltroPersona(e.target.value)}
            className="text-[10px] font-bold py-1 px-3 rounded-full border-blue-200 text-blue-700 bg-white shadow-sm"
          >
            <option value="">Filtrar por Responsable (Todos)</option>
            {personal.map(p => <option key={p.id} value={p.email}>{p.nombre}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendientesSemana.length > 0 ? pendientesSemana.map((tarea, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                // 📡 CARGA QUIRÚRGICA: Mantiene ID original para permitir edición absoluta
                if (!compromisos.find(c => c.idTarea === tarea.ID_Tarea)) {
                  setCompromisos([...compromisos, { 
                    idTarea: tarea.ID_Tarea,
                    descripcion: tarea.Descripcion, 
                    responsable: tarea.EmailAsignado, 
                    fechaInicio: tarea.FechaInicio, 
                    fechaEntrega: tarea.FechaEntrega, 
                    area: tarea.Area, 
                    proyecto: tarea.Proyecto, 
                    idHito: tarea.ID_Hito,
                    estado: tarea.Estado || 'Pendiente'
                  }]);
                }
              }}
              className="p-3 bg-white border border-blue-100 rounded-xl hover:border-blue-400 cursor-pointer transition-all group flex justify-between items-center"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700 leading-tight group-hover:text-blue-700">{tarea.Descripcion}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">🗓️ {tarea.FechaEntrega} • {tarea.Proyecto}</span>
              </div>
              <Plus size={14} className="text-blue-300 group-hover:text-blue-600" />
            </div>
          )) : (
            <p className="text-[10px] text-slate-400 italic py-4">No hay compromisos pendientes de entrega para esta semana.</p>
          )}
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
                  <textarea
                    placeholder="¿Qué se debe hacer?"
                    className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 text-sm text-slate-800 resize-none overflow-hidden"
                    rows={1}
                    value={tarea.descripcion}
                    onChange={(e) => {
                      handleTareaChange(index, 'descripcion', e.target.value);
                      // ⚡ EFECTO ELÁSTICO: Ajusta la altura dinámicamente al escribir
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                    }}
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

                {/* 🚦 SELECTOR DE ESTATUS (Gobernanza Minuta) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Estado / Avance</label>
                  <select
                    className={`w-full bg-transparent text-sm font-black outline-none ${
                      tarea.estado === 'Realizada' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                    value={tarea.estado || 'Pendiente'}
                    onChange={(e) => handleTareaChange(index, 'estado', e.target.value)}
                  >
                    <option value="Pendiente">⚪ Pendiente</option>
                    <option value="En Proceso">🔵 En Proceso</option>
                    <option value="Realizada">🟢 Realizada (Finalizada)</option>
                  </select>
                </div>

                {/* 📂 SELECCIÓN DE PROYECTO (FILTRO MADRE) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Proyecto</label>
                  <select
                    className="w-full bg-transparent text-sm outline-none text-slate-700 font-bold"
                    value={tarea.proyecto}
                    onChange={(e) => handleTareaChange(index, 'proyecto', e.target.value)}
                  >
                    <option value="">Seleccionar Proyecto...</option>
                    {Array.from(new Set(hitos.map(h => h.Proyecto))).filter(p => p).map(proj => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                  </select>
                </div>

                {/* 🎯 SELECCIÓN DE ACTIVIDAD (FILTRADO POR PROYECTO) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tipo de Actividad</label>
                  <select
                    className="w-full bg-transparent text-sm outline-none text-blue-700 font-medium disabled:opacity-30"
                    value={tarea.idHito}
                    disabled={!tarea.proyecto}
                    onChange={(e) => handleTareaChange(index, 'idHito', e.target.value)}
                  >
                    <option value="">{tarea.proyecto ? "Vincular a Actividad..." : "Primero elige un proyecto"}</option>
                    {hitos
                      .filter(h => h.Proyecto === tarea.proyecto)
                      .map(h => (
                        <option key={h.ID_Hito} value={h.ID_Hito}>
                          {h['Nombre de la Actividad'] || h['Nombre del Hito']}
                        </option>
                      ))
                    }
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