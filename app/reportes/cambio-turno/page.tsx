/* app/reportes/cambio-turno/page.tsx */
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Button from "../../../components/ui/Button";
import Link from "next/link";
import { toast } from "sonner";

export default function CambioTurnoPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  // DATOS AUTOMÁTICOS (Lo que el sistema ya sabe)
  const [citasHoy, setCitasHoy] = useState<any[]>([]);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  
  // DATOS MANUALES (Lo que la asistente debe llenar)
  const [observaciones, setObservaciones] = useState("");
  const [asistenteEntrega, setAsistenteEntrega] = useState("");
  const [asistenteRecibe, setAsistenteRecibe] = useState("");
  
  // Contadores manuales (Hasta que automaticemos la Fase 4)
  const [msgsConfirmacion, setMsgsConfirmacion] = useState(0);
  const [msgsCobranza, setMsgsCobranza] = useState(0);

  // Cargar datos al iniciar
  useEffect(() => {
    async function cargarCorte() {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      
      try {
        // 1. Traer Citas de Hoy (Agenda)
        // Nota: Aquí asumimos que la fecha se guarda como string YYYY-MM-DD en 'citas'
        const hoyStr = inicioDia.toISOString().split('T')[0];
        const qCitas = query(collection(db, "citas"), where("fecha", "==", hoyStr));
        const snapCitas = await getDocs(qCitas);
        setCitasHoy(snapCitas.docs.map(d => d.data()));

        // 2. Traer Ingresos de Hoy (Operaciones Pagadas)
        const qIngresos = query(
            collection(db, "operaciones"), 
            where("estatus", "==", "Pagado"),
            where("fechaPago", ">=", inicioDia)
        );
        const snapIngresos = await getDocs(qIngresos);
        setIngresos(snapIngresos.docs.map(d => d.data()));

        // 3. Traer Gastos de Hoy (Caja Chica)
        const qGastos = query(
            collection(db, "gastos"), 
            where("fecha", ">=", inicioDia)
        );
        const snapGastos = await getDocs(qGastos);
        setGastos(snapGastos.docs.map(d => d.data()));

      } catch (e) {
        console.error(e);
        toast.error("Error cargando datos del turno");
      } finally {
        setLoading(false);
      }
    }
    cargarCorte();
  }, []);

  // --- CÁLCULOS AUTOMÁTICOS ---
  
  // 1. Desglose de Cobranza
  const totalCobrado = ingresos.reduce((sum, i) => sum + Number(i.monto), 0);
  
  const desgloseMetodo = ingresos.reduce((acc: any, curr) => {
    const metodo = curr.metodoPago || "No especificado";
    acc[metodo] = (acc[metodo] || 0) + Number(curr.monto);
    return acc;
  }, {});

  // 2. Caja Chica
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
  const efectivoEnCaja = (desgloseMetodo['Efectivo'] || 0) - totalGastos;

  // 3. Pacientes (Totalización)
  const totalPacientes = citasHoy.length;
  // Filtramos por profesionales (esto es un ejemplo, ajusta los nombres según tu realidad)
  const pacientesSansce = citasHoy.filter(c => c.doctorNombre?.includes("SANSCE") || c.doctorNombre?.includes("Clínica")).length;
  const pacientesRenta = totalPacientes - pacientesSansce;


  // GUARDAR EL CORTE
  const handleCerrarTurno = async () => {
    if (!asistenteEntrega || !asistenteRecibe) {
        return toast.warning("Ambas asistentes deben firmar (escribir nombre) para cerrar.");
    }

    if(!confirm("¿Estás segura de cerrar el turno? Esto guardará el reporte histórico.")) return;

    setGuardando(true);
    try {
        // Guardamos un "Snapchot" (Foto) de cómo estaba todo en este momento
        await addDoc(collection(db, "cortes_turno"), {
            fecha: serverTimestamp(),
            fechaLegible: new Date().toLocaleString(),
            estadisticas: {
                totalPacientes,
                pacientesSansce,
                pacientesRenta,
                totalCobrado,
                totalGastos,
                efectivoEnCaja
            },
            comunicacion: {
                mensajesConfirmacion: msgsConfirmacion,
                mensajesCobranza: msgsCobranza
            },
            personal: {
                entrega: asistenteEntrega,
                recibe: asistenteRecibe
            },
            observaciones,
            // Guardamos detalle técnico por seguridad
            detalleIngresos: ingresos.length,
            detalleGastos: gastos.length
        });
        
        toast.success("✅ Turno cerrado y reporte guardado.");
        // Aquí podrías redirigir o limpiar
        
    } catch (e) {
        toast.error("Error al guardar cierre");
    } finally {
        setGuardando(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando datos del turno...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-4">
                <Link href="/reportes" className="text-2xl text-slate-400 hover:text-blue-600">←</Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Corte de Turno</h1>
                    <p className="text-slate-500">Resumen operativo y entrega de guardia</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Fecha Actual</p>
                <p className="text-xl font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. ESTATUS PACIENTES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">1. Pacientes y Actividad</h3>
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div className="bg-blue-50 p-2 rounded">
                        <span className="block text-2xl font-bold text-blue-600">{totalPacientes}</span>
                        <span className="text-[10px] uppercase text-blue-400 font-bold">Total Agendados</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                        <span className="block text-2xl font-bold text-slate-600">{pacientesSansce}</span>
                        <span className="text-[10px] uppercase text-slate-400 font-bold">SANSCE</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                        <span className="block text-2xl font-bold text-slate-600">{pacientesRenta}</span>
                        <span className="text-[10px] uppercase text-slate-400 font-bold">Externos</span>
                    </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto text-sm">
                    {citasHoy.length === 0 && <p className="text-slate-400 italic text-center">Sin citas hoy</p>}
                    {citasHoy.map((c, i) => (
                        <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-700">{c.paciente}</span>
                            <span className="text-slate-400 text-xs">{c.hora} hrs ({c.doctorNombre})</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. CORTE DE CAJA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">2. Finanzas (Corte Parcial)</h3>
                
                {/* Arqueo Rápido */}
                <div className="flex justify-between items-end mb-4 bg-slate-800 text-white p-4 rounded-lg">
                    <div>
                        <p className="text-xs opacity-50 uppercase">Efectivo en Caja Chica</p>
                        <p className="text-2xl font-bold">${efectivoEnCaja.toFixed(2)}</p>
                    </div>
                    <div className="text-right text-xs opacity-70">
                        <p>Entradas Efec: +${(desgloseMetodo['Efectivo'] || 0).toFixed(2)}</p>
                        <p>Salidas/Gastos: -${totalGastos.toFixed(2)}</p>
                    </div>
                </div>

                {/* Desglose General */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-bold text-slate-700">
                        <span>Total Cobrado (Global)</span>
                        <span>${totalCobrado.toFixed(2)}</span>
                    </div>
                    {Object.entries(desgloseMetodo).map(([metodo, monto]: any) => (
                        <div key={metodo} className="flex justify-between text-slate-500 pl-4 border-l-2 border-slate-100">
                            <span>• {metodo}</span>
                            <span>${monto.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. COMUNICACIÓN (Fase Híbrida) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">3. Estatus Comunicación</h3>
                <p className="text-xs text-slate-500 mb-4">
                    Ingresa manualmente el conteo de mensajes enviados durante tu turno. 
                    <br/><span className="italic text-orange-400">(Próximamente: Conteo automático)</span>
                </p>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-600">Confirmaciones enviadas:</label>
                        <input 
                            type="number" 
                            className="border rounded p-2 w-24 text-right"
                            value={msgsConfirmacion}
                            onChange={e => setMsgsConfirmacion(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-600">Recordatorios de pago:</label>
                        <input 
                            type="number" 
                            className="border rounded p-2 w-24 text-right"
                            value={msgsCobranza}
                            onChange={e => setMsgsCobranza(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* 4. OBSERVACIONES Y VALIDACIÓN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">4. Cierre y Firmas</h3>
                
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones / Incidencias</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded p-2 text-sm h-24"
                        placeholder="Escribe aquí cualquier pendiente, incidencia o nota para el siguiente turno..."
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                    ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Entrega (Tu nombre)</label>
                        <input 
                            className="w-full border-b-2 border-slate-300 bg-transparent py-1 text-sm focus:border-blue-500 outline-none"
                            placeholder="Firma..."
                            value={asistenteEntrega}
                            onChange={e => setAsistenteEntrega(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recibe (Siguiente turno)</label>
                        <input 
                            className="w-full border-b-2 border-slate-300 bg-transparent py-1 text-sm focus:border-blue-500 outline-none"
                            placeholder="Firma..."
                            value={asistenteRecibe}
                            onChange={e => setAsistenteRecibe(e.target.value)}
                        />
                    </div>
                </div>

                <Button 
                    onClick={handleCerrarTurno} 
                    isLoading={guardando} 
                    className="w-full py-4 text-lg shadow-lg"
                >
                    🔐 Cerrar Turno y Guardar
                </Button>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}