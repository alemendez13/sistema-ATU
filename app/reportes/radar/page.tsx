"use client";
import { useState } from "react"; // Quitamos useEffect para evitar ejecución automática
import { collection, query, where, getDocs, orderBy, getDoc, doc, limit } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import WhatsAppButton from "../../../components/ui/WhatsAppButton";
import { toast } from "sonner";

export default function RadarPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [deudores, setDeudores] = useState<any[]>([]);
  const [perdidos, setPerdidos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [reporteGenerado, setReporteGenerado] = useState(false); // Nuevo estado

  const ejecutarRadar = async () => {
      setLoading(true);
      setPendientes([]);
      setDeudores([]);
      setPerdidos([]);
      toast.info("Iniciando escaneo inteligente...");
      
      const hoy = new Date();
      
      // 🗓️ DEFINICIÓN DE VENTANAS
      const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
      const limiteFuturo = new Date(hoy); limiteFuturo.setDate(hoy.getDate() + 5); 
      
      const hace3Meses = new Date(hoy); hace3Meses.setMonth(hoy.getMonth() - 3);
      const hace6Meses = new Date(hoy); hace6Meses.setMonth(hoy.getMonth() - 6);
      const hace2Meses = new Date(hoy); hace2Meses.setMonth(hoy.getMonth() - 2);

      try {
        // --- 🔍 FASE 1: OPERATIVO (Bajo Costo) ---

        // A. Citas Próximas (Limitado a 50 para no saturar)
        const qCitas = query(
            collection(db, "citas"),
            where("fecha", ">=", manana.toISOString().split('T')[0]),
            where("fecha", "<=", limiteFuturo.toISOString().split('T')[0]),
            orderBy("fecha", "asc"),
            limit(50) // 🛡️ PROTECCIÓN
        );
        const snapCitas = await getDocs(qCitas);
        const listaCitas = snapCitas.docs
            .map(d => ({id: d.id, ...d.data() as any}))
            .filter(c => !c.confirmada);

        setPendientes(listaCitas);

        // B. Deudores (Limitado a 50 más recientes)
        const qDeuda = query(
            collection(db, "operaciones"), 
            where("estatus", "==", "Pendiente de Pago"), 
            orderBy("fecha", "desc"),
            limit(50) // 🛡️ PROTECCIÓN
        );
        const snapDeuda = await getDocs(qDeuda);
        setDeudores(snapDeuda.docs.map(d => ({id: d.id, ...d.data()})));


        // --- 🧠 FASE 2: INTELIGENCIA (Alto Costo - Optimizado) ---
        // Estrategia: Solo analizamos muestras representativas, no TODA la historia infinita.
        
        // 1. Grupo A: Pacientes Antiguos (Limitamos a 300 muestras)
        const qPasado = query(
            collection(db, "operaciones"),
            where("fechaPago", ">=", hace6Meses),
            where("fechaPago", "<=", hace3Meses),
            limit(300) // 🛡️ Límite duro para evitar lecturas infinitas
        );
        const snapPasado = await getDocs(qPasado);
        
        const pacientesPasados = new Map();
        snapPasado.forEach(doc => {
            const data = doc.data();
            if (data.pacienteId && data.pacienteId !== "EXTERNO") {
                // Solo guardamos si no lo tenemos ya (evita duplicados en memoria)
                if(!pacientesPasados.has(data.pacienteId)){
                    pacientesPasados.set(data.pacienteId, {
                        id: data.pacienteId,
                        nombre: data.pacienteNombre,
                        ultimoServicio: data.servicioNombre,
                        ultimaFecha: data.fechaPago 
                    });
                }
            }
        });

        if (pacientesPasados.size > 0) {
            // 2. Grupo B: Pacientes Recientes (Limitamos a 300)
            const qReciente = query(
                collection(db, "operaciones"),
                where("fechaPago", ">=", hace2Meses),
                limit(300) // 🛡️ Límite duro
            );
            const snapReciente = await getDocs(qReciente);
            
            const pacientesRecientesIds = new Set();
            snapReciente.forEach(doc => {
                const data = doc.data();
                if (data.pacienteId) pacientesRecientesIds.add(data.pacienteId);
            });

            // 3. RESTA DE CONJUNTOS (A - B)
            const enRiesgo: any[] = [];
            
            pacientesPasados.forEach((datos, id) => {
                if (!pacientesRecientesIds.has(id)) {
                    enRiesgo.push(datos);
                }
            });

            // 4. ENRIQUECIMIENTO (Solo Top 10)
            // Esto solo gasta 10 lecturas extra, es aceptable.
            const topRiesgo = enRiesgo.slice(0, 10);
            
            const completados = await Promise.all(topRiesgo.map(async (p: any) => {
                try {
                    const pacRef = doc(db, "pacientes", p.id);
                    const pacSnap = await getDoc(pacRef);
                    return {
                        ...p,
                        telefono: pacSnap.exists() ? pacSnap.data().telefonoCelular : "" // Usamos telefonoCelular estandarizado
                    };
                } catch (err) { return p; }
            }));

            setPerdidos(completados);
        }
        
        setReporteGenerado(true);
        toast.success("Radar actualizado con éxito");

      } catch (e) {
        console.error("Error en Radar:", e);
        toast.error("Error calculando radar");
      } finally {
        setLoading(false);
      }
    };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            
            {/* ENCABEZADO CON BOTÓN DE ACCIÓN */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <Link href="/reportes" className="text-2xl text-slate-400 hover:text-blue-600 transition-colors">←</Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Radar Estratégico</h1>
                        <p className="text-slate-500 text-sm">Detecta fugas de pacientes y oportunidades de cobro.</p>
                    </div>
                </div>
                
                <button 
                    onClick={ejecutarRadar}
                    disabled={loading}
                    className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 ${
                        loading 
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                        : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
                    }`}
                >
                    {loading ? (
                        <>📡 Escaneando...</>
                    ) : (
                        <>🚀 Ejecutar Análisis</>
                    )}
                </button>
            </div>

            {/* ESTADO INICIAL (SIN DATOS) */}
            {!reporteGenerado && !loading && (
                <div className="text-center py-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300">
                    <p className="text-6xl mb-4">🛰️</p>
                    <h3 className="text-xl font-bold text-slate-700">Radar en Espera</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">
                        Presiona "Ejecutar Análisis" para escanear tus bases de datos en busca de pacientes perdidos, citas por confirmar y deudas pendientes.
                    </p>
                    <p className="text-xs text-slate-400 mt-4 font-mono">
                        Nota: Esta operación consume recursos de lectura. Úsala sabiamente.
                    </p>
                </div>
            )}

            {/* RESULTADOS DEL REPORTE */}
            {reporteGenerado && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up">
                    
                    {/* 🚨 PANEL 1: RETENCIÓN */}
                    <div className="bg-white rounded-xl shadow-lg border-t-4 border-red-500 overflow-hidden flex flex-col">
                        <div className="p-4 bg-red-50 border-b border-red-100">
                            <h3 className="font-bold text-red-800 flex items-center gap-2 text-lg">
                                🚨 Pacientes en Riesgo
                                <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs">
                                    {perdidos.length}
                                </span>
                            </h3>
                            <p className="text-xs text-red-600 mt-1">
                                Clientes frecuentes ausentes +60 días.
                            </p>
                        </div>
                        
                        <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
                            {perdidos.length > 0 ? perdidos.map((p, i) => (
                                <div key={i} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-red-200 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-800">{p.nombre}</p>
                                        <p className="text-xs text-slate-500 mt-1">Última vez: {p.ultimoServicio}</p>
                                        <p className="text-[10px] text-slate-400">Hace +3 meses</p>
                                    </div>
                                    
                                    <WhatsAppButton 
                                        telefono={p.telefono}
                                        mensaje={`Hola ${p.nombre}, notamos que es momento de tu chequeo de seguimiento en SANSCE. ¿Te gustaría agendar?`}
                                        label="Recuperar"
                                        compact
                                        tipo="Información"
                                        pacienteNombre={p.nombre}
                                    />
                                </div>
                            )) : (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-4xl mb-2">💎</p>
                                    <p>¡Tus pacientes son leales!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 📅 PANEL 2: CITAS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                📅 Confirmaciones (Próx 5 días)
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                                    {pendientes.length}
                                </span>
                            </h3>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                            {pendientes.map(c => (
                                <div key={c.id} className="p-3 border rounded-lg bg-white flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-slate-700">{c.paciente}</span>
                                        <span className="text-xs font-mono bg-slate-100 px-2 rounded py-1">{c.fecha}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs text-slate-500">
                                            <p>{c.hora} hrs</p>
                                            <p>{c.doctorNombre}</p>
                                        </div>
                                        <WhatsAppButton 
                                            telefono={c.telefono || ""}
                                            mensaje={`Hola ${c.paciente}, confirmamos tu cita para el ${c.fecha} a las ${c.hora} en SANSCE.`}
                                            label="Confirmar"
                                            compact
                                            tipo="Confirmación"
                                            pacienteNombre={c.paciente}
                                        />
                                    </div>
                                </div>
                            ))}
                            {pendientes.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Agenda al día ✅</p>}
                        </div>
                    </div>

                    {/* 💰 PANEL 3: DEUDAS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                💰 Cartera Vencida (Reciente)
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                                    {deudores.length}
                                </span>
                            </h3>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                            {deudores.map(d => (
                                <div key={d.id} className="p-3 border rounded-lg bg-red-50 flex justify-between items-center group hover:shadow-md transition-all">
                                    <div>
                                        <p className="font-bold text-slate-800">{d.pacienteNombre}</p>
                                        <p className="text-xs text-slate-500 truncate w-32">{d.servicioNombre}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-red-700 font-bold">${d.monto}</p>
                                        <Link href={`/finanzas`} className="text-[10px] text-blue-600 hover:underline">
                                            Ir a cobrar →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                            {deudores.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Sin deuda pendiente ✨</p>}
                        </div>
                    </div>

                </div>
            )}
        </div>
      </div>
    </ProtectedRoute>
  );
}