"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase"; 
import ProtectedRoute from "../../../components/ProtectedRoute";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cleanPrice, formatCurrency } from "../../../lib/utils";

export default function CambioTurnoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [procesandoCierre, setProcesandoCierre] = useState(false);

  // --- ESTADOS DE DATOS (Fusión de ambos mundos) ---
  
  // 1. Operativo (Pacientes) - Del Código Original
  const [citasHoy, setCitasHoy] = useState<any[]>([]);
  const [statsPacientes, setStatsPacientes] = useState({ total: 0, sansce: 0, renta: 0 });

  // 2. Financiero (Arqueo Ciego) - Del Código Nuevo + Desglose Original
  const [ingresosTotal, setIngresosTotal] = useState(0);
  const [ingresosEfectivo, setIngresosEfectivo] = useState(0); // El sistema sabe cuánto debe haber
  const [gastosTotal, setGastosTotal] = useState(0);
  const [desgloseMetodos, setDesgloseMetodos] = useState<any>({}); // Para ver cuánto fue tarjeta vs transf

  // 3. Productividad (WhatsApp) - Automatizado 🤖
  const [msgsConfirmacion, setMsgsConfirmacion] = useState(0);
  const [msgsCobranza, setMsgsCobranza] = useState(0);
  const [msgsInfo, setMsgsInfo] = useState(0);

  // 4. Inputs Manuales (Responsabilidad) - Del Código Original
  const [efectivoReportado, setEfectivoReportado] = useState(""); // Lo que cuenta la recepcionista
  const [observaciones, setObservaciones] = useState("");
  const [asistenteEntrega, setAsistenteEntrega] = useState("");
  const [asistenteRecibe, setAsistenteRecibe] = useState("");

  // --- CÁLCULOS EN TIEMPO REAL ---
  const efectivoEsperado = ingresosEfectivo - gastosTotal;
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
      // A. PACIENTES (Recuperado del Original)
      const qCitas = query(collection(db, "citas"), where("fecha", "==", hoyStr));
      const snapCitas = await getDocs(qCitas);
      const listaCitas = snapCitas.docs.map(d => d.data());
      
      setCitasHoy(listaCitas);
      setStatsPacientes({
          total: listaCitas.length,
          sansce: listaCitas.filter(c => c.doctorNombre?.toUpperCase().includes("SANSCE") || c.doctorNombre?.includes("Clínica")).length,
          renta: listaCitas.filter(c => !c.doctorNombre?.toUpperCase().includes("SANSCE") && !c.doctorNombre?.includes("Clínica")).length
      });

      // B. INGRESOS Y DESGLOSE (Híbrido)
      const qIngresos = query(
        collection(db, "operaciones"),
        where("estatus", "==", "Pagado"),
        where("fechaPago", ">=", inicioDia),
        where("fechaPago", "<=", finDia)
      );
      const snapIngresos = await getDocs(qIngresos);
      
      let total = 0;
      let efectivo = 0;
      const desglose: any = {};

      snapIngresos.forEach(doc => {
        const data = doc.data();
        const monto = cleanPrice(data.monto);
        const metodo = data.metodoPago || "No especificado";

        total += monto;
        
        // Sumamos al desglose general
        desglose[metodo] = (desglose[metodo] || 0) + monto;

        // Separamos efectivo para el arqueo
        if (metodo === "Efectivo") {
            efectivo += monto;
        }
      });
      
      setIngresosTotal(total);
      setIngresosEfectivo(efectivo);
      setDesgloseMetodos(desglose);

      // C. GASTOS
      const qGastos = query(
        collection(db, "gastos"),
        where("fecha", ">=", inicioDia),
        where("fecha", "<=", finDia)
      );
      const snapGastos = await getDocs(qGastos);
      const totalGastosCalc = snapGastos.docs.reduce((acc, curr) => acc + (parseFloat(curr.data().monto) || 0), 0);
      setGastosTotal(totalGastosCalc);

      // D. WHATSAPP AUTOMÁTICO (Del Nuevo)
      const qMsgs = query(
        collection(db, "historial_mensajes"),
        where("fecha", ">=", Timestamp.fromDate(inicioDia)),
        where("fecha", "<=", Timestamp.fromDate(finDia))
      );
      const snapMsgs = await getDocs(qMsgs);
      
      let confirm = 0, cobro = 0, info = 0;
      snapMsgs.forEach(doc => {
          const tipo = doc.data().tipo || "";
          if (tipo.includes("Confirmación")) confirm++;
          else if (tipo.includes("Cobro") || tipo.includes("Pago")) cobro++;
          else info++;
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
    // Validaciones Híbridas
    if (!efectivoReportado) return toast.warning("⚠️ Faltan datos: Debes ingresar el efectivo contado en caja.");
    if (!asistenteEntrega || !asistenteRecibe) return toast.warning("⚠️ Faltan firmas: Ambas asistentes deben escribir su nombre.");

    if(!confirm("¿Confirmas que el efectivo físico coincide con lo reportado?")) return;
    
    setProcesandoCierre(true);
    try {
        await addDoc(collection(db, "cortes_turno"), {
            fecha: serverTimestamp(),
            fechaLegible: new Date().toLocaleString(),
            
            // Finanzas
            ingresosTotal,
            ingresosEfectivo,
            gastosTotal,
            efectivoEsperado,
            efectivoReportado: parseFloat(efectivoReportado),
            diferencia,
            desgloseMetodos, // Guardamos detalle Tarjeta vs Efectivo
            
            // Operativo
            totalPacientes: statsPacientes.total,
            pacientesDetalle: citasHoy.map(c => ({ paciente: c.paciente, doctor: c.doctorNombre })), // Guardamos snapshot ligero
            
            // Productividad
            mensajes: {
                confirmacion: msgsConfirmacion,
                cobranza: msgsCobranza,
                info: msgsInfo
            },
            
            // Responsabilidad
            observaciones,
            personal: {
                entrega: asistenteEntrega,
                recibe: asistenteRecibe
            },
            usuario: "Sistema SANSCE"
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
                    <Link href="/reportes" className="text-2xl text-slate-400 hover:text-blue-600 transition-colors">←</Link>
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

                        {/* Calculadora Visual */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Ingresos Efectivo (Sistema):</span>
                                <span className="font-mono font-bold text-slate-700">+ ${ingresosEfectivo.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Gastos / Salidas:</span>
                                <span className="font-mono font-bold text-red-500">- ${gastosTotal.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-300 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 text-sm uppercase">Debe haber en cajón:</span>
                                <span className="text-xl font-extrabold text-slate-900">${efectivoEsperado.toFixed(2)}</span>
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

                </div>

                {/* === COLUMNA DERECHA: PRODUCTIVIDAD Y FIRMAS === */}
                <div className="space-y-6 flex flex-col h-full">
                    
                    {/* 3. PRODUCTIVIDAD (Automatización WhatsApp) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">3. Productividad Digital</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
                                <span className="text-2xl block mb-1">📅</span>
                                <span className="text-xl font-bold text-blue-900 block">{msgsConfirmacion}</span>
                                <span className="text-[10px] text-blue-500 uppercase font-bold">Citas</span>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
                                <span className="text-2xl block mb-1">💵</span>
                                <span className="text-xl font-bold text-green-900 block">{msgsCobranza}</span>
                                <span className="text-[10px] text-green-500 uppercase font-bold">Cobranza</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-200">
                                <span className="text-2xl block mb-1">ℹ️</span>
                                <span className="text-xl font-bold text-slate-700 block">{msgsInfo}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Info</span>
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