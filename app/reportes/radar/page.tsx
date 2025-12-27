"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, getDoc, doc, limit } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import WhatsAppButton from "../../../components/ui/WhatsAppButton";
import { toast } from "sonner";
import { getMensajesConfigAction } from "../../../lib/actions"; 
import { parseWhatsAppTemplate } from "../../../lib/utils"; 

export default function RadarPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [deudores, setDeudores] = useState<any[]>([]);
  const [perdidos, setPerdidos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [reporteGenerado, setReporteGenerado] = useState(false);
  const [plantillas, setPlantillas] = useState<any[]>([]);

  useEffect(() => {
    const fetchConfig = async () => {
      const data = await getMensajesConfigAction();
      setPlantillas(data);
    };
    fetchConfig();
  }, []);

  const obtenerMensajeDinamico = (idMensaje: string, datos: any) => {
    const template = plantillas.find(p => p.id === idMensaje)?.texto || "";
    return parseWhatsAppTemplate(template, datos);
  };

  const ejecutarRadar = async () => {
      setLoading(true);
      // --- RESTABLECIMIENTO: LIMPIEZA TOTAL DE MEMORIA ---
      setReporteGenerado(false);
      setPendientes([]);
      setDeudores([]);
      setPerdidos([]);
      
      toast.info("Iniciando escaneo inteligente...");
      const hoy = new Date();
      
      // 🗓️ DEFINICIÓN DE VENTANAS (PRESERVADO)
      const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
      const limiteFuturo = new Date(hoy); limiteFuturo.setDate(hoy.getDate() + 5); 
      const hace3Meses = new Date(hoy); hace3Meses.setMonth(hoy.getMonth() - 3);
      const hace6Meses = new Date(hoy); hace6Meses.setMonth(hoy.getMonth() - 6);
      const hace2Meses = new Date(hoy); hace2Meses.setMonth(hoy.getMonth() - 2);

      try {
        // --- 🔍 FASE 1: OPERATIVO ---
        const qCitas = query(
            collection(db, "citas"),
            where("fecha", ">=", manana.toISOString().split('T')[0]),
            where("fecha", "<=", limiteFuturo.toISOString().split('T')[0]),
            orderBy("fecha", "asc"),
            limit(50) 
        );
        const snapCitas = await getDocs(qCitas);
        setPendientes(snapCitas.docs.map(d => ({id: d.id, ...d.data() as any})).filter(c => !c.confirmada));

        const qDeuda = query(
            collection(db, "operaciones"), 
            where("estatus", "==", "Pendiente de Pago"), 
            orderBy("fecha", "desc"),
            limit(50) 
        );
        const snapDeuda = await getDocs(qDeuda);
        setDeudores(snapDeuda.docs.map(d => ({id: d.id, ...d.data()})));

        // --- 🧠 FASE 2: INTELIGENCIA ---
        const qPasado = query(
            collection(db, "operaciones"),
            where("fechaPago", ">=", hace6Meses),
            where("fechaPago", "<=", hace3Meses),
            limit(300) 
        );
        const snapPasado = await getDocs(qPasado);
        
        const pacientesPasados = new Map();
        snapPasado.forEach(doc => {
            const data = doc.data();
            if (data.pacienteId && data.pacienteId !== "EXTERNO") {
                if(!pacientesPasados.has(data.pacienteId)){
                    pacientesPasados.set(data.pacienteId, {
                        id: data.pacienteId,
                        nombre: data.pacienteNombre,
                        ultimoServicio: data.servicioNombre,
                        ultimaFecha: data.fechaPago, // RESTAURADO
                        doctorNombre: data.doctorNombre // ADICIÓN ÚTIL
                    });
                }
            }
        });

        if (pacientesPasados.size > 0) {
            const qReciente = query(
                collection(db, "operaciones"),
                where("fechaPago", ">=", hace2Meses),
                limit(300) 
            );
            const snapReciente = await getDocs(qReciente);
            const pacientesRecientesIds = new Set(snapReciente.docs.map(d => d.data().pacienteId));

            const enRiesgo: any[] = [];
            pacientesPasados.forEach((datos, id) => {
                if (!pacientesRecientesIds.has(id)) enRiesgo.push(datos);
            });

            const topRiesgo = enRiesgo.slice(0, 10);
            const completados = await Promise.all(topRiesgo.map(async (p: any) => {
                try {
                    const pacSnap = await getDoc(doc(db, "pacientes", p.id));
                    return { ...p, telefono: pacSnap.exists() ? pacSnap.data().telefonoCelular : "" };
                } catch { return p; }
            }));
            setPerdidos(completados);
        }
        
        setReporteGenerado(true);
        toast.success("Radar actualizado con éxito");
      } catch (e) {
        console.error("Error en Radar:", e);
        toast.error("Error calculando radar");
      } finally { setLoading(false); }
    };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <Link href="/reportes" className="text-2xl text-slate-400 hover:text-blue-600 transition-colors">←</Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Radar Estratégico</h1>
                        <p className="text-slate-500 text-sm">Fugas de pacientes y oportunidades de cobro.</p>
                    </div>
                </div>
                <button onClick={ejecutarRadar} disabled={loading} className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 ${loading ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"}`}>
                    {loading ? "📡 Escaneando..." : "🚀 Ejecutar Análisis"}
                </button>
            </div>

            {/* RESTABLECIMIENTO: BLOQUE DE ESTADO INICIAL */}
            {!reporteGenerado && !loading && (
                <div className="text-center py-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 animate-in fade-in">
                    <p className="text-6xl mb-4">🛰️</p>
                    <h3 className="text-xl font-bold text-slate-700">Radar en Espera</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">Presiona "Ejecutar Análisis" para escanear tus bases de datos.</p>
                </div>
            )}

            {reporteGenerado && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up">
                    {/* PANEL 1: RETENCIÓN */}
                    <div className="bg-white rounded-xl shadow-lg border-t-4 border-red-500 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 bg-red-50 border-b border-red-100">
                            <h3 className="font-bold text-red-800 flex justify-between">🚨 Pacientes en Riesgo <span>{perdidos.length}</span></h3>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-3">
                            {perdidos.map((p, i) => (
                                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="font-bold text-slate-800">{p.nombre}</p>
                                    <p className="text-xs text-slate-500 mb-3">Última vez: {p.ultimoServicio}</p>
                                    <WhatsAppButton 
                                        telefono={p.telefono}
                                        mensaje={obtenerMensajeDinamico("MENS-005", { pacienteNombre: p.nombre })}
                                        label="Recuperar"
                                        compact tipo="Información"
                                        pacienteNombre={p.nombre}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PANEL 2: CONFIRMACIONES */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex justify-between">📅 Confirmaciones <span>{pendientes.length}</span></h3>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            {pendientes.map(c => (
                                <div key={c.id} className="p-3 border rounded-lg bg-white shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-slate-700 text-sm">{c.paciente}</span>
                                        <span className="text-xs font-mono bg-slate-100 px-2 rounded">{c.fecha}</span>
                                    </div>
                                    <WhatsAppButton 
                                        telefono={c.telefono || ""}
                                        mensaje={obtenerMensajeDinamico("MENS-002", { pacienteNombre: c.paciente, fecha: c.fecha, hora: c.hora, doctorNombre: c.doctorNombre })}
                                        label="Confirmar"
                                        compact tipo="Confirmación"
                                        pacienteNombre={c.paciente}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PANEL 3: DEUDAS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex justify-between">💰 Cartera Vencida <span>{deudores.length}</span></h3>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            {deudores.map(d => (
                                <div key={d.id} className="p-3 border rounded-lg bg-red-50 flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-slate-800">{d.pacienteNombre}</p>
                                        <p className="text-red-700 font-bold">${d.monto}</p>
                                    </div>
                                    <Link href={`/finanzas`} className="text-[10px] text-blue-600 hover:underline">Cobrar →</Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </ProtectedRoute>
  );
}