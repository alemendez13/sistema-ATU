// ARCHIVO: app/reportes/cambio-turno/page.tsx
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "@/lib/firebase-guard";
import { db } from "../../../lib/firebase"; 
import ProtectedRoute from "../../../components/ProtectedRoute";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation"; // 🆕 Agregamos useSearchParams
import Link from "next/link";
import { cleanPrice, formatCurrency } from "../../../lib/utils";
import { getMedicosAction } from "../../../lib/actions";
import { useAuth } from "../../../hooks/useAuth"; // 🔐 Importamos el vigilante de identidad

export default function CambioTurnoPage() {
  const { user } = useAuth() as any; 
  const router = useRouter();
  const searchParams = useSearchParams(); // 🛰️ Detectamos el origen
  
  // 🧠 Lógica de Retorno Inteligente:
  const isFromInteligencia = searchParams.get('from') === 'inteligencia';
  const backRoute = isFromInteligencia 
    ? "/planeacion/inteligencia?tab=reportes" 
    : "/reportes";
  const [loading, setLoading] = useState(true);
  const [procesandoCierre, setProcesandoCierre] = useState(false);

  // --- ESTADOS DE DATOS (Fusión de ambos mundos) ---
  
  // 1. Operativo (Pacientes) - Del Código Original
  const [citasHoy, setCitasHoy] = useState<any[]>([]);
  const [statsPacientes, setStatsPacientes] = useState({ total: 0, sansce: 0, renta: 0 });

  // 2. Financiero (Arqueo Ciego) - Sincronizado con Caja Chica e Inyecciones
  const [ingresosTotal, setIngresosTotal] = useState(0);
  const [ingresosEfectivo, setIngresosEfectivo] = useState(0); // Suma de TODO el dinero físico (Recepción + PS)
  const [gastosTotal, setGastosTotal] = useState(0); // Solo salidas reales de dinero
  const [inyeccionesTotal, setInyeccionesTotal] = useState(0); 
  const [desgloseMetodos, setDesgloseMetodos] = useState<any>({});
  const [ingresosPorDoctor, setIngresosPorDoctor] = useState<any>({});

  // 3. Productividad (WhatsApp) - Automatizado 🤖
  const [msgsConfirmacion, setMsgsConfirmacion] = useState(0);
  const [msgsCobranza, setMsgsCobranza] = useState(0);
  const [msgsInfo, setMsgsInfo] = useState(0);

  // 4. Inputs Manuales (Responsabilidad) - Del Código Original
  const [efectivoReportado, setEfectivoReportado] = useState(""); // Lo que cuenta la recepcionista
  const [observaciones, setObservaciones] = useState("");
  const [asistenteEntrega, setAsistenteEntrega] = useState("");
  const [asistenteRecibe, setAsistenteRecibe] = useState("");

  // --- CÁLCULOS EN TIEMPO REAL (Alineados con Caja Chica) ---
  const efectivoEsperado = ingresosEfectivo + inyeccionesTotal - gastosTotal;
  const diferencia = (parseFloat(efectivoReportado) || 0) - efectivoEsperado;

  useEffect(() => {
    cargarDatosDelDia();
  }, []);

  const cargarDatosDelDia = async () => {
    setLoading(true);
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));
    const hoyStr = inicioDia.toISOString().split('T')[0]; // Para citas (YYYY-MM-DD)

    try {
      // A. PACIENTES (Refactorización SANSCE OS: Clasificación por Esquema Real)
      const [snapCitas, medicosConfig] = await Promise.all([
          getDocs(query(collection(db, "citas"), where("fecha", "==", hoyStr))),
          getMedicosAction() // Traemos la lista de Google Sheets
      ]);
      
      const listaCitas = snapCitas.docs.map(d => d.data());
      
      // 🧠 Lógica de Emparejamiento Flexible (SANSCE OS Standard)
      const esquemaMap = new Map(
          medicosConfig.map((m: any) => [
              String(m.nombreCompleto || "").trim().toLowerCase(), 
              m.esquema
          ])
      );

      let consultasSansce = 0;
      let consultasExternos = 0;

      listaCitas.forEach(cita => {
          // Normalizamos el nombre que viene de la agenda para la búsqueda
          const nombreEnAgenda = String(cita.doctorNombre || "").trim().toLowerCase();
          const esquema = esquemaMap.get(nombreEnAgenda);

          if (esquema === "Nómina") {
              consultasSansce++;
          } else {
              // 🛡️ Por definición de negocio: Si no es Nómina explícita, es Externo (Renta)
              consultasExternos++;
          }
      });

      setCitasHoy(listaCitas);
      setStatsPacientes({ total: listaCitas.length, sansce: consultasSansce, renta: consultasExternos });

      // B. INGRESOS Y DESGLOSE (Sincronizado con Efectivo PS)
      const qIngresos = query(
        collection(db, "operaciones"),
        where("estatus", "in", ["Pagado", "Pagado (Cortesía)"]),
        where("fechaPago", ">=", inicioDia),
        where("fechaPago", "<=", finDia)
      );
      const snapIngresos = await getDocs(qIngresos);
      
      let total = 0;
      let efectivo = 0;
      const desgloseMetodosMap: any = {};
      const ingresosDoctorMap: any = {}; // 🩺 Acumulador quirúrgico

      snapIngresos.forEach(doc => {
        const data = doc.data();
        const monto = cleanPrice(data.monto);
        const metodo = data.metodoPago || "No especificado";
        const doctor = data.doctorNombre || "Sin especificar"; // 🛡️ Evitamos datos huérfanos

        total += monto;
        desgloseMetodosMap[metodo] = (desgloseMetodosMap[metodo] || 0) + monto;
        
        // 🩺 TRAZABILIDAD POR PROFESIONAL:
        ingresosDoctorMap[doctor] = (ingresosDoctorMap[doctor] || 0) + monto;

        // 🛡️ REGLA SANSCE OS: Solo el "Efectivo" puro entra a la caja física.
        // El "Efectivo PS" se registra como ingreso, pero no se suma al arqueo de la gaveta.
        if (metodo === "Efectivo") {
            efectivo += monto;
        }
      });
      
      setIngresosTotal(total);
      setIngresosEfectivo(efectivo);
      setDesgloseMetodos(desgloseMetodosMap);
      setIngresosPorDoctor(ingresosDoctorMap);

      // C. GASTOS E INYECCIONES (Diferenciación Quirúrgica)
      const qGastos = query(
        collection(db, "gastos"),
        where("fecha", ">=", inicioDia),
        where("fecha", "<=", finDia)
      );
      const snapGastos = await getDocs(qGastos);
      
      let totalG = 0;
      let totalI = 0;

      snapGastos.forEach(doc => {
          const data = doc.data();
          const monto = parseFloat(data.monto) || 0;
          // ✅ Separamos: ¿Es dinero que entró para fondo o dinero que salió para gasto?
          if (data.tipo === "Ingreso") {
              totalI += monto;
          } else {
              totalG += monto;
          }
      });

      setGastosTotal(totalG);
      setInyeccionesTotal(totalI);

      // D. WHATSAPP AUTOMÁTICO (Del Nuevo)
      const qMsgs = query(
        collection(db, "historial_mensajes"),
        where("fecha", ">=", Timestamp.fromDate(inicioDia)),
        where("fecha", "<=", Timestamp.fromDate(finDia))
      );
      const snapMsgs = await getDocs(qMsgs);
      
      let confirm = 0, cobro = 0, info = 0;
      snapMsgs.forEach(doc => {
          const etiqueta = doc.data().tipo || "";
          
          // 🧠 Lógica de Clasificación Quirúrgica (SANSCE OS Standard)
          // Suma: Confirmaciones (excepto cancelaciones), Reagendar y Recordatorios.
          const esCitaConfirmada = (etiqueta.includes("Confirmación") && !etiqueta.toLowerCase().includes("cancelación")) || 
                                   etiqueta.includes("Reagendar") || 
                                   etiqueta.includes("Recordatorio");
          
          // Suma: Todo lo relacionado a flujos de cobranza o comprobantes.
          const esMensajeCobranza = etiqueta.includes("Cobro") || 
                                    etiqueta.includes("Pago") || 
                                    etiqueta.includes("Ticket");

          if (esCitaConfirmada) confirm++;
          else if (esMensajeCobranza) cobro++;
          else info++; // El resto: Meet, Formularios, Cancelaciones, Ubicación, etc.
      });

      setMsgsConfirmacion(confirm);
      setMsgsCobranza(cobro);
      setMsgsInfo(info);

    } catch (error) {
      console.error("Error cargando corte:", error);
      toast.error("Error cargando datos del turno.");
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarTurno = async () => {
    // 🛡️ Validaciones de Seguridad (SANSCE OS Standard)
    if (!efectivoReportado) return toast.warning("⚠️ Faltan datos: Debes ingresar el efectivo contado en caja.");
    
    // El .trim() evita que firmen con espacios vacíos
    if (!asistenteEntrega.trim() || !asistenteRecibe.trim()) {
        return toast.warning("⚠️ Faltan firmas: Ambas asistentes deben escribir su nombre real.");
    }

    if(!confirm("¿Confirmas que el efectivo físico coincide con lo reportado? El reporte quedará sellado con tu usuario.")) return;
    
    setProcesandoCierre(true);
    try {
        await addDoc(collection(db, "cortes_turno"), {
            fecha: serverTimestamp(),
            fechaLegible: new Date().toLocaleString(),
            
            ingresosTotal,
            ingresosEfectivo,
            inyeccionesTotal, 
            gastosTotal,      
            efectivoEsperado, 
            efectivoReportado: parseFloat(efectivoReportado),
            diferencia,
            desgloseMetodos,
            
            totalPacientes: statsPacientes.total,
            pacientesDetalle: citasHoy.map(c => ({ paciente: c.paciente, doctor: c.doctorNombre })), 
            
            mensajes: {
                confirmacion: msgsConfirmacion,
                cobranza: msgsCobranza,
                info: msgsInfo
            },
            
            observaciones: observaciones.trim(),
            personal: {
                entrega: asistenteEntrega.trim(),
                recibe: asistenteRecibe.trim()
            },
            // 🖋️ SELLO DE RESPONSABILIDAD: Vinculamos el email de la sesión activa
            elaboradoPor: user?.email || "Usuario no identificado"
        });

        toast.success("✅ Turno cerrado correctamente");
        router.push("/reportes");

    } catch (error) {
        console.error(error);
        toast.error("No se pudo cerrar el turno");
    } finally {
        setProcesandoCierre(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando auditoría del turno...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
            
            {/* HEADER CON BOTÓN DE REGRESO (Restaurado) */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Link href={backRoute} className="text-2xl text-slate-400 hover:text-blue-600 transition-colors">←</Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Cierre de Turno</h1>
                        <p className="text-slate-500">Auditoría operativa y entrega de valores.</p>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-slate-400 uppercase">Fecha Corte</p>
                    <p className="text-xl font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* === COLUMNA IZQUIERDA: DINERO Y PACIENTES === */}
                <div className="space-y-6">
                    
                    {/* 1. PACIENTES (Visualización Original Restaurada) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex justify-between">
                            <span>1. Pacientes Atendidos</span>
                            <span className="bg-blue-100 text-blue-800 px-2 rounded text-sm">{statsPacientes.total}</span>
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="block text-xl font-bold text-slate-700">{statsPacientes.sansce}</span>
                                <span className="text-[10px] uppercase text-slate-400 font-bold">SANSCE</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="block text-xl font-bold text-slate-700">{statsPacientes.renta}</span>
                                <span className="text-[10px] uppercase text-slate-400 font-bold">EXTERNOS</span>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {citasHoy.length === 0 && <p className="text-slate-400 italic text-center text-sm">Sin citas registradas hoy</p>}
                            {citasHoy.map((c, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 mb-1 last:border-0">
                                    <div className="truncate w-2/3">
                                        <p className="text-sm font-bold text-slate-700 truncate">{c.paciente}</p>
                                        <p className="text-[10px] text-slate-400">{c.doctorNombre}</p>
                                    </div>
                                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{c.hora}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. FINANZAS (Arqueo Ciego Mejorado) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">FINANZAS</div>
                        <h3 className="font-bold text-slate-800 mb-6 border-b pb-2">2. Arqueo de Caja (Ciego)</h3>

                        {/* Calculadora Visual Sincronizada */}
                        {/* 🛡️ DESGLOSE DE CUENTAS SEPARADAS (SANSCE M8 Standard) */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-3">
                            {/* Cuenta A: Ventas (Dinero del Cliente) */}
                            <div className="border-b border-slate-200 pb-2">
                                <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-wider">Cuenta A: Ingresos por Ventas</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 italic">Efectivo por Servicios (Recep + PS):</span>
                                    <span className="font-mono font-bold text-slate-800">${ingresosEfectivo.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            {/* Cuenta B: Caja Chica (Dinero de Operación) */}
                            <div className="border-b border-slate-200 pb-2">
                                <p className="text-[10px] font-black text-orange-600 uppercase mb-1 tracking-wider">Cuenta B: Movimientos de Caja Chica</p>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Inyecciones (Fondos inyectados):</span>
                                    <span className="font-mono text-emerald-600 font-bold">+${inyeccionesTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Egresos (Gastos pagados):</span>
                                    <span className="font-mono text-red-600 font-bold">-${gastosTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Consolidado Final para Arqueo Físico */}
                            <div className="flex justify-between items-center pt-1">
                                <span className="font-black text-slate-900 text-xs uppercase">Efectivo Final Esperado (A + B):</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">${efectivoEsperado.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Input de Arqueo */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">💰 Efectivo contado físicamente</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    className={`w-full pl-8 p-3 border rounded-lg text-lg font-bold outline-none transition-all ${
                                        efectivoReportado 
                                        ? (diferencia === 0 ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') 
                                        : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                                    }`}
                                    placeholder="0.00"
                                    value={efectivoReportado}
                                    onChange={e => setEfectivoReportado(e.target.value)}
                                />
                            </div>
                            {efectivoReportado && (
                                <p className={`text-xs mt-2 text-right font-bold flex justify-end items-center gap-1 ${diferencia === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {diferencia === 0 
                                        ? <span>✅ Cuadre Perfecto</span> 
                                        : <span>{diferencia > 0 ? '⚠️ Sobra dinero:' : '🚨 Faltante:'} ${Math.abs(diferencia).toFixed(2)}</span>
                                    }
                                </p>
                            )}
                        </div>

                        {/* Desglose de Métodos (Informativo) */}
                        <details className="text-xs text-slate-500 cursor-pointer">
                            <summary className="hover:text-blue-600 font-medium">Ver desglose completo de ingresos</summary>
                            <div className="mt-2 pl-2 border-l-2 border-slate-200 space-y-1">
                                <div className="flex justify-between font-bold text-slate-700">
                                    <span>Total Global (Inc. Bancos)</span>
                                    <span>${ingresosTotal.toFixed(2)}</span>
                                </div>
                                {Object.entries(desgloseMetodos).map(([metodo, monto]: any) => (
                                    <div key={metodo} className="flex justify-between">
                                        <span>{metodo}</span>
                                        <span>${monto.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>

                    {/* 🩺 2.1 TRAZABILIDAD POR PROFESIONAL (Auditoría de Ventas) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">TRAZABILIDAD</div>
                        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Detalle de Ingresos por Médico</h3>
                        
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                            {Object.entries(ingresosPorDoctor).length === 0 ? (
                                <p className="text-slate-400 italic text-center text-sm py-4">No hay ventas registradas en este turno.</p>
                            ) : (
                                Object.entries(ingresosPorDoctor)
                                  .sort(([,a]: any, [,b]: any) => b - a) // Ordenamos: El que más generó arriba
                                  .map(([doctor, monto]: any) => (
                                    <div key={doctor} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors px-2 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{doctor}</span>
                                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Producción Total Bruta</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono font-black text-blue-600 text-sm">
                                                ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <p className="text-[9px] text-slate-400 mt-4 italic">
                            * Estos montos incluyen todos los métodos de pago (Efectivo, Tarjetas, Transferencias).
                        </p>
                    </div>

                </div>

                {/* === COLUMNA DERECHA: PRODUCTIVIDAD Y FIRMAS === */}
                <div className="space-y-6 flex flex-col h-full">
                    
                    {/* 3. USO DE WHATSAPP (SANSCE OS Auditoría Digital) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">3. Uso de whatsapp</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
                                <span className="text-2xl block mb-1">📅</span>
                                <span className="text-xl font-bold text-blue-900 block">{msgsConfirmacion}</span>
                                <span className="text-[10px] text-blue-500 uppercase font-bold">Citas confirmadas</span>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
                                <span className="text-2xl block mb-1">💵</span>
                                <span className="text-xl font-bold text-green-900 block">{msgsCobranza}</span>
                                <span className="text-[10px] text-green-500 uppercase font-bold">Mensajes de cobranza</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-200">
                                <span className="text-2xl block mb-1">ℹ️</span>
                                <span className="text-xl font-bold text-slate-700 block">{msgsInfo}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Mensajes de Info</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. CIERRE Y FIRMAS (Obligatorio Restaurado) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">4. Entrega de Guardia</h3>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones / Incidencias</label>
                            <textarea 
                                className="w-full border p-3 rounded-lg text-sm h-24 resize-none bg-slate-50 focus:bg-white transition-colors"
                                placeholder="Ej. Paciente X dejó pendiente pago, se fue la luz 10 min..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="border-b-2 border-slate-200 pb-1 focus-within:border-blue-500 transition-colors">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Entrega (Tu Firma)</label>
                                <input 
                                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-300"
                                    placeholder="Nombre completo..."
                                    value={asistenteEntrega}
                                    onChange={e => setAsistenteEntrega(e.target.value)}
                                />
                            </div>
                            <div className="border-b-2 border-slate-200 pb-1 focus-within:border-blue-500 transition-colors">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recibe (Siguiente)</label>
                                <input 
                                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-300"
                                    placeholder="Nombre completo..."
                                    value={asistenteRecibe}
                                    onChange={e => setAsistenteRecibe(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-auto">
                            <button 
                                onClick={handleCerrarTurno}
                                disabled={procesandoCierre || !efectivoReportado || !asistenteEntrega || !asistenteRecibe}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black hover:scale-[1.01] transition-all disabled:bg-slate-300 disabled:shadow-none disabled:scale-100 flex justify-center items-center gap-2"
                            >
                                {procesandoCierre ? (
                                    <>⏳ Guardando Reporte...</>
                                ) : (
                                    <>🔒 Cerrar Turno y Firmar</>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-slate-400 mt-2">
                                Al cerrar, se generará un reporte inmutable con fecha y hora.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}