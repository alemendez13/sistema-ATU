"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import WhatsAppButton from "../../../components/ui/WhatsAppButton";
// import { MENSAJES } from "../../../lib/whatsappTemplates"; 

export default function RadarPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [deudores, setDeudores] = useState<any[]>([]);
  const [perdidos, setPerdidos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ejecutarRadar = async () => {
      console.log("🔥 LECTURA RADAR EJECUTADA - " + new Date().toLocaleTimeString());
      
      const hoy = new Date();
      
      // 🗓️ DEFINICIÓN DE VENTANAS DE TIEMPO
      const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
      const limiteFuturo = new Date(hoy); limiteFuturo.setDate(hoy.getDate() + 5); 
      
      const hace3Meses = new Date(hoy); hace3Meses.setMonth(hoy.getMonth() - 3);
      const hace6Meses = new Date(hoy); hace6Meses.setMonth(hoy.getMonth() - 6);
      const hace2Meses = new Date(hoy); hace2Meses.setMonth(hoy.getMonth() - 2);

      try {
        // --- 🔍 FASE 1: OPERATIVO ---

        // A. Citas Próximas
        const qCitas = query(
            collection(db, "citas"),
            where("fecha", ">=", manana.toISOString().split('T')[0]),
            where("fecha", "<=", limiteFuturo.toISOString().split('T')[0]),
            orderBy("fecha", "asc")
        );
        const snapCitas = await getDocs(qCitas);
        const listaCitas = snapCitas.docs
            .map(d => ({id: d.id, ...d.data() as any}))
            .filter(c => !c.confirmada);

        setPendientes(listaCitas);

        // B. Deudores
        const qDeuda = query(
            collection(db, "operaciones"), 
            where("estatus", "==", "Pendiente de Pago"), 
            orderBy("fecha", "desc")
        );
        const snapDeuda = await getDocs(qDeuda);
        setDeudores(snapDeuda.docs.map(d => ({id: d.id, ...d.data()})));


        // --- 🧠 FASE 2: INTELIGENCIA (Radar) ---

        // 1. Obtener pacientes de hace 3-6 meses
        const qPasado = query(
            collection(db, "operaciones"),
            where("fechaPago", ">=", hace6Meses),
            where("fechaPago", "<=", hace3Meses)
        );
        const snapPasado = await getDocs(qPasado);
        
        const pacientesPasados = new Map();
        snapPasado.forEach(doc => {
            const data = doc.data();
            if (data.pacienteId && data.pacienteId !== "EXTERNO") {
                pacientesPasados.set(data.pacienteId, {
                    id: data.pacienteId,
                    nombre: data.pacienteNombre,
                    ultimoServicio: data.servicioNombre,
                    ultimaFecha: data.fechaPago 
                });
            }
        });

        if (pacientesPasados.size > 0) {
            // 2. Obtener lista de pacientes RECIENTES
            const qReciente = query(
                collection(db, "operaciones"),
                where("fechaPago", ">=", hace2Meses)
            );
            const snapReciente = await getDocs(qReciente);
            
            const pacientesRecientesIds = new Set();
            snapReciente.forEach(doc => {
                const data = doc.data();
                if (data.pacienteId) pacientesRecientesIds.add(data.pacienteId);
            });

            // 3. LA RESTA MATEMÁTICA (Corregido para ES5) 🛠️
            const enRiesgo: any[] = [];
            
            // Usamos .forEach en lugar de for...of para evitar el error de TypeScript
            pacientesPasados.forEach((datos, id) => {
                if (!pacientesRecientesIds.has(id)) {
                    enRiesgo.push(datos);
                }
            });

            // 4. Enriquecer con Teléfonos (Top 10)
            const topRiesgo = enRiesgo.slice(0, 10);
            
            const completados = await Promise.all(topRiesgo.map(async (p: any) => {
                try {
                    const pacRef = doc(db, "pacientes", p.id);
                    const pacSnap = await getDoc(pacRef);
                    return {
                        ...p,
                        telefono: pacSnap.exists() ? pacSnap.data().telefono : ""
                    };
                } catch (err) { return p; }
            }));

            setPerdidos(completados);
        }

      } catch (e) {
        console.error("Error en Radar:", e);
      } finally {
        setLoading(false);
      }
    };

    ejecutarRadar();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/reportes" className="text-2xl text-slate-400 hover:text-blue-600 transition-colors">←</Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Radar Estratégico</h1>
                        <p className="text-slate-500 text-sm">Inteligencia de negocio y retención de pacientes</p>
                    </div>
                </div>
                {loading && <span className="text-blue-600 font-bold animate-pulse">📡 Escaneando base de datos...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* 🚨 PANEL 1: PACIENTES EN RIESGO */}
                <div className="bg-white rounded-xl shadow-lg border-t-4 border-red-500 overflow-hidden flex flex-col">
                    <div className="p-4 bg-red-50 border-b border-red-100">
                        <h3 className="font-bold text-red-800 flex items-center gap-2 text-lg">
                            🚨 Radar de Retención
                            <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs">
                                {perdidos.length} detectados
                            </span>
                        </h3>
                        <p className="text-xs text-red-600 mt-1">
                            Pacientes habituales ausentes +60 días.
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
                                    tipo="Información" // 👈 CORREGIDO: Usamos un tipo válido
                                    pacienteNombre={p.nombre}
                                />
                            </div>
                        )) : (
                            !loading && <div className="text-center py-8 text-slate-400">
                                <p className="text-4xl mb-2">💎</p>
                                <p>¡Tus pacientes son leales!</p>
                                <p className="text-xs">No hay fugas detectadas en este periodo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📅 PANEL 2: PRÓXIMAS CITAS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            📅 Confirmaciones Pendientes
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                                {pendientes.length}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Próximos 5 días</p>
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
                         {pendientes.length === 0 && !loading && <p className="text-slate-400 text-sm text-center py-4">Agenda al día ✅</p>}
                    </div>
                </div>

                {/* 💰 PANEL 3: CUENTAS POR COBRAR */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            💰 Cartera Vencida
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                                {deudores.length}
                            </span>
                        </h3>
                         <p className="text-xs text-slate-500 mt-1">Servicios realizados sin pago</p>
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
                        {deudores.length === 0 && !loading && <p className="text-slate-400 text-sm text-center py-4">Sin deuda pendiente ✨</p>}
                    </div>
                </div>

            </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}