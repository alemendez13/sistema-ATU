// app/pacientes/[id]/venta/VentaForm.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "../../../../components/ui/Button"; // Ajusta ruta si es necesario
import { agendarCitaGoogle } from "../../../../lib/actions"; 
import { descontarStockPEPS } from "../../../../lib/inventoryController";
import { Descuento } from "../../../../types";
import { generateFolio, cleanPrice } from "@/lib/utils"; 
import { useAuth } from "@/hooks/useAuth";

interface Props {
  pacienteId: string;
  servicios: any[];
  medicos: any[]; 
  descuentos: Descuento[]; // 👈 Recibimos los descuentos
}

interface ItemCarrito {
  uniqueId: string;
  servicioSku: string;
  servicioNombre: string;
  tipo: string;
  especialidad?: string;
  precioOriginal: number;
  precioFinal: number;
  descuento: { id: string, nombre: string, monto: number } | null;
  medicoId: string;
  doctorNombre?: string;
  fechaCita: string;
  horaCita: string;
  esLaboratorio: boolean;
  requiereStock: boolean;
}

export default function VentaForm({ pacienteId, servicios, medicos, descuentos }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth() as any;
  const [tieneRFC, setTieneRFC] = useState(false);
  const [requiereFactura, setRequiereFactura] = useState(false); // 🛠️ ESTADO RECUPERADO
  const [ubicacionVenta, setUbicacionVenta] = useState("Satelite"); // 📍 Default a Satélite
  
  // Estados del Formulario
  const [servicioSku, setServicioSku] = useState("");
  const [descuentoId, setDescuentoId] = useState("");
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState<any>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedMedicoId, setSelectedMedicoId] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("");
  const [esLaboratorio, setEsLaboratorio] = useState(false);
  
  // Estados para Agenda
  const [esServicio, setEsServicio] = useState(false);
  const [medicoId, setMedicoId] = useState("");
  const [fechaCita, setFechaCita] = useState(new Date().toISOString().split('T')[0]);
  const [horaCita, setHoraCita] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // 🧠 LÓGICA DE FILTRADO (CASCADA) - NUEVO BLOQUE
  // 1. Áreas Disponibles (Con Inyección de Laboratorio)
  const areasDisponibles = useMemo(() => {
    const areas = new Set<string>();
    servicios.forEach(s => s.area && areas.add(s.area));
    medicos.forEach(m => m.especialidad && areas.add(m.especialidad));
    
    // 💉 INYECCIÓN QUIRÚRGICA: Si hay laboratorios cargados, agregamos la opción
    if (servicios.some(s => s.tipo === "Laboratorio")) {
        areas.add("Laboratorio");
    }
    
    return Array.from(areas).sort();
  }, [servicios, medicos]);

  // 2. Médicos Filtrados
  const medicosFiltrados = useMemo(() => {
    if (!selectedArea) return [];
    // Si es Lab, permitimos elegir cualquier médico (el solicitante)
    if (selectedArea === "Laboratorio") return medicos;
    
    return medicos.filter(m => 
      m.especialidad === selectedArea || 
      m.especialidad === "Medicina General" || 
      m.especialidad === "General"
    );
  }, [selectedArea, medicos]);

  // 3. Tipos de Servicio (Adaptado para detectar Labs)
  const tiposDisponibles = useMemo(() => {
    if (!selectedArea) return [];
    
    // Si eligió Especialidad "Laboratorio", solo mostramos esa opción
    if (selectedArea === "Laboratorio") return ["Estudios de Laboratorio"];

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

  // 2. Lógica de Precios
  const precioOriginal = cleanPrice(servicioSeleccionado?.precio);
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

  // Esto permite asignar la venta de un producto (ej. Shampoo) a un Dermatólogo específico.
  const medicosDisponibles = medicos;

  useEffect(() => {
      const aplicarConvenioAutomatico = async () => {
          if (!pacienteId) return;
          
          try {
              const pSnap = await getDoc(doc(db, "pacientes", pacienteId));
              if (pSnap.exists()) {
                  const pData = pSnap.data();
                  // ✅ DETECTAR RFC Y SUGERIR FACTURA
                  const rfcEnExpediente = !!(pData.datosFiscales?.rfc || pData.rfc);
                  setTieneRFC(rfcEnExpediente);
                  setRequiereFactura(rfcEnExpediente);
                  // Si el paciente tiene un convenio guardado...
                  if (pData.convenioId) {
                      setDescuentoId(pData.convenioId);
                      
                      // 🧠 FIX CRÍTICO: Actualizamos también el OBJETO lógico, no solo el ID visual
                      const descuentoObj = descuentos.find(d => d.id === pData.convenioId);
                      setDescuentoSeleccionado(descuentoObj || null);

                      if (descuentoObj) toast.info(`Convenio aplicado: ${descuentoObj.nombre}`);
                  }
              }
          } catch (error) {
              console.error("Error leyendo convenio:", error);
          }
      };
      aplicarConvenioAutomatico();
  }, [pacienteId, descuentos]);

  // --- A. Función para agregar al carrito visual ---
  const agregarAlCarrito = () => {
    if (!servicioSku) return toast.warning("Selecciona un servicio primero.");
    
    // 🛡️ REGLA DE VALIDACIÓN 1: Laboratorio requiere médico responsable
    if (esLaboratorio && !medicoId) return toast.error("⚠️ Es obligatorio asignar un responsable para el seguimiento de laboratorio.");
    
    // 🛡️ REGLA DE VALIDACIÓN 2: Servicios médicos requieren fecha y hora
    if (!esLaboratorio && esServicio && (!medicoId || !fechaCita || !horaCita)) return toast.error("Faltan datos de la cita.");

    const servicioDetalle = servicios.find(s => s.sku === servicioSku);
    const medicoDetalle = medicos.find(m => m.id === medicoId);

    // 💰 CÁLCULO DE PRECIOS (Snapshot exacto del momento)
    let montoOriginalItem = cleanPrice(servicioDetalle?.precio);
    let montoDescuentoItem = 0;
    
    if (descuentoSeleccionado && montoOriginalItem > 0) {
        if (descuentoSeleccionado.tipo === "Porcentaje") {
            montoDescuentoItem = (montoOriginalItem * descuentoSeleccionado.valor) / 100;
        } else {
            montoDescuentoItem = descuentoSeleccionado.valor;
        }
    }
    // Evitar negativos matemáticos
    const precioFinalItem = Math.max(0, montoOriginalItem - montoDescuentoItem);

    const nuevoItem: ItemCarrito = {
        uniqueId: Date.now().toString(),
        servicioSku,
        servicioNombre: servicioDetalle?.nombre || "Desconocido",
        tipo: servicioDetalle?.tipo || "Servicio",
        especialidad: servicioDetalle?.area || "General",
        precioOriginal: montoOriginalItem,
        precioFinal: precioFinalItem,
        descuento: descuentoSeleccionado ? {
            id: descuentoSeleccionado.id,
            nombre: descuentoSeleccionado.nombre,
            monto: montoDescuentoItem
        } : null,
        medicoId,
        doctorNombre: medicoDetalle?.nombre || "", // Se guarda string aquí, se limpia al procesar
        fechaCita,
        horaCita,
        esLaboratorio,
        // Regla Maestra de Stock: Solo false si explícitamente es false
        requiereStock: servicioDetalle?.requiereStock !== false 
    };

    setCarrito([...carrito, nuevoItem]);
    
    // Limpieza de campos para agilidad operativa
    setServicioSku("");
    setDescuentoId(""); 
    setDescuentoSeleccionado(null);
    toast.success("Item agregado a la lista.");
  };

  const eliminarDelCarrito = (uniqueId: string) => {
      setCarrito(carrito.filter(item => item.uniqueId !== uniqueId));
  };

  // --- B. Función Final (Procesamiento en Bucle / Batch) ---
  const procesarVentaGlobal = async () => {
    if (carrito.length === 0) return;
    setLoading(true);

    try {
      // 1. Obtención de datos del paciente (Una sola lectura para todo el lote)
      const pDoc = await getDoc(doc(db, "pacientes", pacienteId));
      let pNombre = "Desconocido";
      if (pDoc.exists()) {
          const dataPac = pDoc.data();
          pNombre = dataPac.nombreCompleto;
      }

      // 🔄 BUCLE DE PROCESAMIENTO (Mantiene integridad por transacción individual)
      for (const item of carrito) {
          
          // 2. Crear OPERACIÓN (Sincronizada con Sucursal)
          const docRef = await addDoc(collection(db, "operaciones"), {
            pacienteId,
            pacienteNombre: pNombre,
            sucursal: ubicacionVenta, // 🛰️ MARCA DE SUCURSAL PARA FINANZAS
            requiereFactura, 
            servicioSku: item.servicioSku,
            servicioNombre: item.servicioNombre,
            especialidad: item.especialidad || null,
            elaboradoPor: user?.email || "Usuario Desconocido",
            
            montoOriginal: item.precioOriginal,
            descuentoAplicado: item.descuento,
            monto: Number(item.precioFinal),
            
            folioInterno: generateFolio("FIN-FR-09", ""), 
            fecha: serverTimestamp(),
            
            // Lógica de Estatus Financiero (VALE PS y Cortesías se marcan como Pagado)
            estatus: (Number(item.precioFinal) === 0 || item.descuento?.nombre?.includes("VALE")) ? "Pagado" : "Pendiente de Pago",

            // Lógica Temporal de Pago (Si es VALE o $0, el pago queda registrado hoy)
            fechaPago: (Number(item.precioFinal) === 0 || item.descuento?.nombre?.includes("VALE"))
                ? (item.fechaCita && item.horaCita ? new Date(`${item.fechaCita}T${item.horaCita}:00`) : serverTimestamp()) 
                : null,

            // Asignación de Método de Pago Inteligente
            metodoPago: item.descuento?.nombre?.includes("VALE") ? "VALE PS" : (Number(item.precioFinal) === 0 ? "Cortesía" : null),     
            
            esCita: item.tipo === 'Servicio' || item.tipo === 'Laboratorio',
            doctorId: item.medicoId || null,
            // Ajuste Quirúrgico: Convertimos cadena vacía a null para consistencia DB
            doctorNombre: item.doctorNombre || null, 
            fechaCita: item.fechaCita || null,
            horaCita: item.horaCita || null
          });

          // 3. VINCULACIÓN DE FOLIO
          await setDoc(doc(db, "operaciones", docRef.id), { 
            folioInterno: generateFolio("FIN-FR-09", docRef.id) 
          }, { merge: true });

          // 4. Gestión de Inventario PEPS
          const itemEsProducto = item.tipo === "Producto";
          const itemEsLab = item.tipo === "Laboratorio";

          if ((itemEsProducto || itemEsLab) && item.requiereStock) {
            try {
                const folioRastreo = generateFolio("FIN-FR-09", docRef.id); 
                
                // 🛡️ CONGRUENCIA SANSCE: Vinculamos la venta a la ubicación elegida en UI
                const ubicacionSalida = ubicacionVenta; 

                await descontarStockPEPS(
                    item.servicioSku, 
                    item.servicioNombre, 
                    1, 
                    `${folioRastreo} - ${pNombre}`,
                    ubicacionSalida as any // 🛠️ CORRECCIÓN DE TIPADO
                );
            } catch (err) { 
                console.warn(`Error stock ${item.servicioSku}`, err); 
            }
          }

          // 5. Agenda (Google + Local)
          if (item.medicoId && item.fechaCita) {
            
            // A. Firebase Local: Creamos la cita y GUARDAMOS LA REFERENCIA (citaRef)
            const citaRef = await addDoc(collection(db, "citas"), {
                doctorId: item.medicoId,
                doctorNombre: item.doctorNombre,
                paciente: pNombre,
                motivo: item.servicioNombre,
                fecha: item.fechaCita,
                hora: item.horaCita,
                creadoEn: new Date(),
                elaboradoPor: user?.email || "Usuario Desconocido",
                // Inicializamos como pendiente de sincronizar
                googleEventId: null 
            });

            // B. Google Calendar API
            const medicoReal = medicos.find(m => m.id === item.medicoId);
            const servicioReal = servicios.find(s => s.sku === item.servicioSku);
            const duracion = parseInt(servicioReal?.duracion || "30");
            
            if (medicoReal) {
                // ⚠️ FIX DE TIPADO: Usamos 'as any' para calmar a VS Code
                // mientras actualizamos el archivo actions.ts en el siguiente paso.
                const respGoogle = await agendarCitaGoogle({
                    doctorId: item.medicoId,
                    doctorNombre: medicoReal.nombre,
                    calendarId: medicoReal.calendarId,
                    pacienteNombre: pNombre,
                    motivo: (item.esLaboratorio ? "🔬 LAB: " : "🩺 ") + item.servicioNombre,
                    fecha: item.fechaCita,
                    hora: item.horaCita || "00:00", 
                    duracionMinutos: duracion,
                    esTodoElDia: item.esLaboratorio && !item.horaCita
                }) as any; 

                // 🧠 EL ESLABÓN PERDIDO: Si Google nos dio un ID, actualizamos la cita en Firebase
                // (Nota: Verificamos respGoogle.id o respGoogle.eventId según cómo retorne tu actions.ts)
                const idEvento = respGoogle?.eventId || respGoogle?.id;

                if (idEvento) {
                    await setDoc(doc(db, "citas", citaRef.id), { 
                        googleEventId: idEvento 
                    }, { merge: true });
                    console.log("✅ Cita vinculada con Google ID:", idEvento);
                }
            }
          }
      } // Fin del Loop

      toast.success(`✅ ${carrito.length} operaciones registradas correctamente.`);
      router.push("/finanzas"); 

    } catch (error) {
      console.error("Error procesando venta global:", error);
      toast.error("Error al procesar la transacción.");
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
        
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          
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
                    onChange={e => {
                        const val = e.target.value;
                        setDescuentoId(val);
                        // Esto conecta con el estado que creamos en el Paso 2
                        setDescuentoSeleccionado(descuentos.find(d => d.id === val) || null);
                    }}
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

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">📅 Fecha de Venta / Cita</label>
            <input 
                type="date" 
                className="w-full border p-2 rounded font-bold text-slate-700" 
                value={fechaCita} 
                onChange={e => setFechaCita(e.target.value)} 
                required 
            />
          </div>

          {/* ✅ ACTUALIZACIÓN: Bloque siempre visible (Democratización de la Agenda) */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
                <h3 className="font-bold text-blue-900 mb-4">
                    {/* Título dinámico: Se adapta según si es una Cita real o una asignación opcional */}
                    {esLaboratorio ? "📋 Responsable de Seguimiento" : (esServicio ? "📅 Agendar Cita" : "👤 Profesional Asignado (Opcional)")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Profesional</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={medicoId}
                            onChange={e => setMedicoId(e.target.value)}
                            // ⚠️ Solo forzamos selección si es un Servicio Médico real
                            required={esServicio}
                        >
                            <option value="">-- Elegir Doctor --</option>
                            {medicosDisponibles.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Hora</label>
                        <input 
                            type="time" 
                            className="w-full border p-2 rounded" 
                            value={horaCita} 
                            onChange={e => setHoraCita(e.target.value)} 
                            // ⚠️ Hora obligatoria solo para Citas Médicas (No Labs, No Productos)
                            required={esServicio && !esLaboratorio} 
                        />
                        {esLaboratorio && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                * Opcional: Dejar vacío para evento de todo el día.
                            </p>
                        )}
                    </div>
                </div>
            </div>

          {/* 📍 SELECTOR DE ORIGEN DE PRODUCTOS */}
          <div className="bg-blue-600 p-4 rounded-lg shadow-md flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏪</span>
                <div>
                  <p className="text-[10px] font-black uppercase leading-none opacity-80">Punto de Entrega</p>
                  <p className="text-sm font-bold">Sucursal de Inventario</p>
                </div>
              </div>
              <select 
                  value={ubicacionVenta}
                  onChange={(e) => setUbicacionVenta(e.target.value)}
                  className="bg-blue-700 border-none rounded-md font-bold text-xs p-2 focus:ring-2 focus:ring-white outline-none"
              >
                  <option value="Satelite">🛰️ SUCURSAL SATÉLITE</option>
                  <option value="Central">🏥 MATRIZ / CENTRAL</option>
              </select>
          </div>

          {/* ✅ BLOQUE DE DOBLE CHECK PARA FACTURA */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                      type="checkbox" 
                      checked={requiereFactura} 
                      onChange={(e) => setRequiereFactura(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-sm font-bold text-slate-700 uppercase">¿Generar Factura?</span>
              </label>

              {tieneRFC ? (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-black border border-green-200 uppercase">
                      RFC Registrado
                  </span>
              ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-1 rounded font-black border border-amber-200 uppercase">
                      Sin Datos Fiscales
                  </span>
              )}
          </div>

          {/* --- INICIO ZONA NUEVA: TABLA Y BOTONES --- */}
          
          {/* 1. Tabla Visual del Carrito */}
          {carrito.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in my-6">
                <h3 className="text-sm font-bold text-blue-800 uppercase mb-2 flex justify-between items-center">
                    <span>🛒 Lista de Movimientos ({carrito.length})</span>
                    <span className="bg-white px-2 py-1 rounded text-blue-900 border border-blue-100 font-bold">
                        Total: ${carrito.reduce((acc, item) => acc + item.precioFinal, 0).toFixed(2)}
                    </span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {carrito.map((item) => (
                        <div key={item.uniqueId} className="flex justify-between items-center bg-white p-3 rounded-md border border-blue-100 shadow-sm text-sm">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700">{item.servicioNombre}</span>
                                    {item.tipo === 'Servicio' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded">Cita</span>}
                                    {item.tipo === 'Producto' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded">Stock</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {item.medicoId ? `👨‍⚕️ ${item.doctorNombre}` : '🏢 Venta Mostrador'} 
                                    {item.fechaCita ? ` • 📅 ${item.fechaCita} ${item.horaCita}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 pl-4 border-l ml-4">
                                <span className="font-bold text-slate-800">${item.precioFinal.toFixed(2)}</span>
                                <button 
                                    type="button" 
                                    onClick={() => eliminarDelCarrito(item.uniqueId)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded font-bold"
                                    title="Quitar"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* 2. Botonera de Acción Nueva */}
          <div className="flex flex-col gap-3 pt-6 border-t border-slate-100">
            {/* Botón A: Agregar a la lista */}
            <Button 
                type="button" 
                onClick={agregarAlCarrito} 
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 shadow-sm flex justify-center items-center gap-2"
                disabled={!servicioSku}
            >
                <span>➕</span> Agregar a la Lista
            </Button>

            {/* Botón B: Finalizar Todo */}
            <div className="flex gap-4 mt-2">
                <button 
                    type="button" 
                    onClick={() => router.back()} 
                    className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                    Cancelar
                </button>
                
                <Button 
                    type="button" 
                    onClick={procesarVentaGlobal} 
                    isLoading={loading} 
                    disabled={carrito.length === 0}
                    className={`flex-1 py-3 text-lg shadow-md transition-all ${
                        carrito.length > 0 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {carrito.length > 0 
                        ? `✅ Finalizar (${carrito.length} items)` 
                        : "Lista vacía"}
                </Button>
            </div>
          </div>
          {/* --- FIN ZONA NUEVA --- */}

        </form>
      </div>
    </div>
  );
}