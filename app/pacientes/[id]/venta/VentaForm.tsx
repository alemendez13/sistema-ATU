"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "../../../../components/ui/Button"; // Ajusta ruta si es necesario
import { agendarCitaGoogle } from "../../../../lib/actions"; 
import { descontarStockPEPS } from "../../../../lib/inventoryController";
// Importamos el tipo Descuento (Asegúrate de haber hecho el Paso 2)
import { Descuento } from "../../../../types"; 

interface Props {
  pacienteId: string;
  servicios: any[];
  medicos: any[]; 
  descuentos: Descuento[]; // 👈 Recibimos los descuentos
}

export default function VentaForm({ pacienteId, servicios, medicos, descuentos }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados del Formulario
  const [servicioSku, setServicioSku] = useState("");
  const [descuentoId, setDescuentoId] = useState(""); // 👈 Nuevo Estado
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedMedicoId, setSelectedMedicoId] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("");
  const [esLaboratorio, setEsLaboratorio] = useState(false);
  
  // Estados para Agenda
  const [esServicio, setEsServicio] = useState(false);
  const [medicoId, setMedicoId] = useState("");
  const [fechaCita, setFechaCita] = useState("");
  const [horaCita, setHoraCita] = useState("");

  // 🧠 LÓGICA DE FILTRADO (CASCADA) - NUEVO BLOQUE
  // 1. Áreas Disponibles
  const areasDisponibles = useMemo(() => {
    const areas = new Set<string>();
    servicios.forEach(s => s.area && areas.add(s.area));
    medicos.forEach(m => m.especialidad && areas.add(m.especialidad));
    return Array.from(areas).sort();
  }, [servicios, medicos]);

  // 2. Médicos Filtrados
  const medicosFiltrados = useMemo(() => {
  if (!selectedArea) return [];
  // Si seleccionamos Laboratorio, permitimos elegir a CUALQUIER médico para el seguimiento
  if (selectedArea === "Laboratorio") return medicos;
    // Para otras áreas, filtramos por especialidad o Medicina General
  return medicos.filter(m => 
    m.especialidad === selectedArea || 
    m.especialidad === "Medicina General" || 
    m.especialidad === "General"
  );
  }, [selectedArea, medicos]);

  // 3. Tipos de Servicio
  const tiposDisponibles = useMemo(() => {
    if (!selectedArea) return [];
    const servsDelArea = servicios.filter(s => s.area === selectedArea);
    const tipos = new Set<string>();
    servsDelArea.forEach(s => {
        if (s.tipo === "Laboratorio") tipos.add("Estudios de Laboratorio");
        else if (s.tipo === "Producto") tipos.add("Farmacia / Productos");
        else if (s.nombre.toLowerCase().includes("paquete")) tipos.add("Paquetes");
        else tipos.add("Consulta / Terapia");
    });
    return Array.from(tipos).sort();
  }, [selectedArea, servicios]);

  // 4. Servicios Finales
  const serviciosFinales = useMemo(() => {
    if (!selectedArea || !selectedTipo) return [];
    return servicios.filter(s => {
        const coincideArea = s.area === selectedArea;
        let coincideTipo = false;
        if (selectedTipo === "Estudios de Laboratorio") coincideTipo = s.tipo === "Laboratorio";
        else if (selectedTipo === "Farmacia / Productos") coincideTipo = s.tipo === "Producto";
        else if (selectedTipo === "Paquetes") coincideTipo = s.nombre.toLowerCase().includes("paquete");
        else coincideTipo = s.tipo === "Servicio" && !s.nombre.toLowerCase().includes("paquete");
        return coincideArea && coincideTipo;
    });
  }, [selectedArea, selectedTipo, servicios]);

  // 1. Encontrar objetos seleccionados
  const servicioSeleccionado = servicios.find(s => s.sku === servicioSku);
  const descuentoSeleccionado = descuentos.find(d => d.id === descuentoId);

  // 2. Lógica de Precios
  const precioOriginal = servicioSeleccionado ? parseFloat(servicioSeleccionado.precio) : 0;
  let montoDescuento = 0;
  let precioFinal = precioOriginal;

  if (descuentoSeleccionado && precioOriginal > 0) {
    if (descuentoSeleccionado.tipo === "Porcentaje") {
      montoDescuento = (precioOriginal * descuentoSeleccionado.valor) / 100;
    } else {
      montoDescuento = descuentoSeleccionado.valor;
    }
    // Evitar negativos
    precioFinal = Math.max(0, precioOriginal - montoDescuento);
  }

  // Efecto para detectar tipo de servicio
  useEffect(() => {
    const tipo = servicioSeleccionado?.tipo;
    const isLab = tipo === 'Laboratorio';
    
    setEsLaboratorio(isLab);
    // Habilitamos el bloque de agenda si es Servicio O Laboratorio
    setEsServicio(tipo === 'Servicio' || isLab);

    if (!isLab && tipo !== 'Servicio') {
        setMedicoId("");
    }
  }, [servicioSku, servicioSeleccionado]);

  // Filtrar médicos
  const medicosDisponibles = medicos.filter(m => 
    !servicioSeleccionado?.area || m.especialidad === servicioSeleccionado.area || m.especialidad === "General"
  );

  const handleVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioSku) return;
    if (esLaboratorio && !medicoId) {
        toast.error("⚠️ Es obligatorio asignar un responsable para el seguimiento de laboratorio.");
        return;
    }
    if (!esLaboratorio && esServicio && (!medicoId || !fechaCita || !horaCita)) {
        toast.error("Faltan datos de la cita.");
        return;
    }

    setLoading(true);

    try {
      const pDoc = await getDoc(doc(db, "pacientes", pacienteId));
      let pNombre = "Desconocido";
      let requiereFactura = false;

      if (pDoc.exists()) {
          const dataPac = pDoc.data();
          pNombre = dataPac.nombreCompleto;
          if (dataPac.datosFiscales?.rfc) requiereFactura = true;
      }

      const medicoElegido = medicos.find(m => m.id === medicoId);

      // Si no hay hora y es laboratorio, se marca como evento de todo el día
      const esTodoElDia = esLaboratorio && !horaCita;

      // 3. Crear OPERACIÓN con Descuentos
      await addDoc(collection(db, "operaciones"), {
        pacienteId,
        pacienteNombre: pNombre,
        requiereFactura, 
        
        servicioSku: servicioSeleccionado?.sku,
        servicioNombre: servicioSeleccionado?.nombre,
        
        // --- INICIO BLOQUE FINANCIERO DETALLADO ---
        montoOriginal: precioOriginal,
        descuentoAplicado: descuentoSeleccionado ? {
            id: descuentoSeleccionado.id,
            nombre: descuentoSeleccionado.nombre,
            monto: montoDescuento
        } : null,
        monto: precioFinal, // Este es el que se cobra
        // --- FIN BLOQUE FINANCIERO ---

        fecha: serverTimestamp(),
        estatus: precioFinal === 0 ? "Pagado (Cortesía)" : "Pendiente de Pago", // Autopagar si es cortesía
        
        esCita: esServicio,
        doctorId: medicoId || null,
        doctorNombre: medicoElegido?.nombre || null,
        fechaCita: fechaCita || null,
        horaCita: horaCita || null
      });

      // Descontar Stock si aplica
      if (!esServicio && servicioSeleccionado) {
        try {
            await descontarStockPEPS(servicioSeleccionado.sku, servicioSeleccionado.nombre, 1);
        } catch (err) { console.error(err); }
      }

      // Agendar Google si aplica
      if (esServicio && medicoElegido) {
        await addDoc(collection(db, "citas"), {
            doctorId: medicoId,
            doctorNombre: medicoElegido.nombre,
            paciente: pNombre,
            motivo: servicioSeleccionado?.nombre,
            fecha: fechaCita,
            hora: horaCita,
            creadoEn: new Date()
        });

        const duracion = parseInt(servicioSeleccionado?.duracion || "30");
        await agendarCitaGoogle({
            doctorId: medicoId,
            doctorNombre: medicoElegido.nombre,
            calendarId: medicoElegido.calendarId,
            pacienteNombre: pNombre,
            motivo: (esLaboratorio ? "🔬 LAB: " : "🩺 ") + servicioSeleccionado?.nombre,
            fecha: fechaCita,
            hora: horaCita || "00:00", 
            duracionMinutos: duracion,
            esTodoElDia: esTodoElDia
        });
      }

      toast.success("✅ Operación registrada correctamente.");
      router.push("/finanzas"); 

    } catch (error) {
      console.error(error);
      toast.error("Error al procesar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full h-fit border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            🛒 Nueva Venta / Cita
        </h1>
        
        <form onSubmit={handleVenta} className="space-y-6">
          
          {/* SELECCIÓN DE PRODUCTO */}
          {/* CASCADA DE SELECCIÓN (REEMPLAZO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              
              <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">1. Especialidad</label>
                  <select 
                      className="w-full border p-2 rounded" 
                      value={selectedArea}
                      onChange={e => { setSelectedArea(e.target.value); setSelectedMedicoId(""); setSelectedTipo(""); setServicioSku(""); }}
                  >
                      <option value="">-- Seleccionar --</option>
                      {areasDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">2. Profesional</label>
                  <select 
                      className="w-full border p-2 rounded"
                      value={selectedMedicoId}
                      onChange={e => setSelectedMedicoId(e.target.value)}
                      disabled={!selectedArea}
                  >
                      <option value="">-- Opcional / N/A --</option>
                      {medicosFiltrados.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">3. Tipo</label>
                  <select 
                      className="w-full border p-2 rounded"
                      value={selectedTipo}
                      onChange={e => { setSelectedTipo(e.target.value); setServicioSku(""); }}
                      disabled={!selectedArea}
                  >
                      <option value="">-- Seleccionar --</option>
                      {tiposDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
              </div>

              <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-1">4. Producto / Servicio</label>
                  <select 
                      className="w-full border-2 border-blue-200 p-2 rounded font-bold text-slate-700"
                      value={servicioSku}
                      onChange={e => setServicioSku(e.target.value)}
                      disabled={!selectedTipo}
                      required
                  >
                      <option value="">-- Elegir --</option>
                      {serviciosFinales.map(s => (
                          <option key={s.sku} value={s.sku}>{s.nombre}</option>
                      ))}
                  </select>
              </div>
          </div>

          {/* --- NUEVO: SELECTOR DE DESCUENTOS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
             <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">🏷️ Descuento / Cortesía</label>
                <select 
                    className="w-full border p-3 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={descuentoId}
                    onChange={e => setDescuentoId(e.target.value)}
                >
                    <option value="">Ninguno (Precio de Lista)</option>
                    {descuentos.map(d => (
                        <option key={d.id} value={d.id}>
                            {d.nombre} ({d.tipo === 'Porcentaje' ? `-${d.valor}%` : `-$${d.valor}`})
                        </option>
                    ))}
                </select>
             </div>
             
             {/* VISUALIZADOR DE PRECIO */}
             <div className="text-right p-3 bg-slate-50 rounded-lg border border-slate-100">
                {descuentoSeleccionado ? (
                    <div>
                        <span className="text-sm text-slate-400 line-through mr-2">${precioOriginal.toFixed(2)}</span>
                        <span className="text-xl font-bold text-green-600">${precioFinal.toFixed(2)}</span>
                    </div>
                ) : (
                    <span className="text-xl font-bold text-slate-700">${precioOriginal.toFixed(2)}</span>
                )}
             </div>
          </div>
          {/* --- FIN NUEVO BLOQUE --- */}

          {servicioSeleccionado?.observaciones && (
             <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 text-sm text-yellow-800">
                {servicioSeleccionado.observaciones}
             </div>
          )}

          {esServicio && (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
                <h3 className="font-bold text-blue-900 mb-4">
                    {esLaboratorio ? "📋 Responsable de Seguimiento" : "📅 Agendar Cita"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Profesional</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={medicoId}
                            onChange={e => setMedicoId(e.target.value)}
                            required
                        >
                            <option value="">-- Elegir Doctor --</option>
                            {medicosDisponibles.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Fecha</label>
                        <input type="date" className="w-full border p-2 rounded" value={fechaCita} onChange={e => setFechaCita(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Hora</label>
                        <input 
                            type="time" 
                            className="w-full border p-2 rounded" 
                            value={horaCita} 
                            onChange={e => setHoraCita(e.target.value)} 
                            required={!esLaboratorio} // Solo es obligatorio si NO es laboratorio
                        />
                        {esLaboratorio && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                * Opcional: Dejar vacío para evento de todo el día.
                            </p>
                        )}
                    </div>
                </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => router.back()} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
            <Button type="submit" isLoading={loading} className="flex-1 py-3 text-lg shadow-md">
                {precioFinal === 0 ? "Confirmar Cortesía" : "Generar Nota de Venta"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}