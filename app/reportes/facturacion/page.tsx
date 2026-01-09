/* app/reportes/facturacion/page.tsx */
"use client";
import { useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "@/lib/firebase-guard";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";

// 👇 CONFIGURACIÓN: CAMBIA ESTO POR EL LINK REAL DE TU SISTEMA DE FACTURACIÓN
const URL_PORTAL_FACTURACION = "https://portal.facturacion.com/login"; 

export default function ReporteFacturacionPage() {
  // Fechas por defecto: Mes actual
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const cargarFacturasPendientes = async () => {
    setLoading(true);
    setPendientes([]);
    
    try {
      const start = new Date(`${fechaInicio}T00:00:00`);
      const end = new Date(`${fechaFin}T23:59:59`);

      // 1. Buscamos Operaciones en el rango que REQUIERAN FACTURA
      const q = query(
        collection(db, "operaciones"),
        where("fecha", ">=", start),
        where("fecha", "<=", end),
        where("requiereFactura", "==", true), // 👈 EL FILTRO CLAVE
        orderBy("fecha", "desc"),
        limit(100) // Protección de lectura
      );

      const snapshot = await getDocs(q);
      
      // 2. Enriquecimiento de Datos (Traer RFC del paciente)
      // Nota: Aunque la operación dice "requiereFactura", a veces necesitamos confirmar el RFC fresco del paciente
      const listaProcesada = await Promise.all(snapshot.docs.map(async (d) => {
        const dataOp = d.data();
        let datosFiscales = null;

        // Intentamos obtener datos fiscales frescos del paciente
        if (dataOp.pacienteId) {
            try {
                const pacSnap = await getDoc(doc(db, "pacientes", dataOp.pacienteId));
                if (pacSnap.exists()) {
                    datosFiscales = pacSnap.data().datosFiscales;
                }
            } catch (e) {
                console.log("Error leyendo paciente", e);
            }
        }

        return {
            id: d.id,
            fecha: dataOp.fecha?.seconds ? new Date(dataOp.fecha.seconds * 1000).toLocaleDateString('es-MX') : "S/F",
            monto: dataOp.monto,
            concepto: dataOp.servicioNombre,
            paciente: dataOp.pacienteNombre,
            rfc: datosFiscales?.rfc || "SIN RFC REGISTRADO",
            razonSocial: datosFiscales?.razonSocial || dataOp.pacienteNombre,
            usoCFDI: datosFiscales?.usoCFDI || "G03",
            email: datosFiscales?.emailFacturacion || "No registrado"
        };
      }));

      setPendientes(listaProcesada);
      setBusquedaRealizada(true);

      if (listaProcesada.length === 0) {
        toast.info("No hay solicitudes de factura en este periodo.");
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al buscar datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <Link href="/pacientes" className="text-slate-400 hover:text-blue-600 font-bold text-2xl">←</Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Control de Facturación</h1>
                    <p className="text-slate-500">Gestión de solicitudes de factura de pacientes.</p>
                </div>
            </div>
            
            {/* BOTÓN EXTERNO AL SAT / SISTEMA */}
            <a 
                href={URL_PORTAL_FACTURACION} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            >
                🚀 Ir al Portal de Facturación
            </a>
          </div>

          {/* Filtros */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <button 
                onClick={cargarFacturasPendientes} 
                disabled={loading} 
                className="bg-blue-600 text-white font-bold py-2 px-8 rounded-lg h-[42px] shadow hover:bg-blue-700 transition-colors w-full md:w-auto"
             >
                {loading ? "Buscando..." : "🔍 Buscar Solicitudes"}
             </button>
          </div>

          {/* TABLA DE RESULTADOS */}
          {!busquedaRealizada && !loading ? (
             <div className="text-center py-16 border-2 border-dashed border-slate-300 rounded-xl bg-slate-100">
                <p className="text-5xl mb-4">🧾</p>
                <p className="text-slate-500 font-medium">Selecciona un rango de fechas para ver quién solicitó factura.</p>
             </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Listado de Solicitudes</h3>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                        {pendientes.length} Pendientes
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Paciente / Razón Social</th>
                                <th className="p-4">RFC / Uso CFDI</th>
                                <th className="p-4">Concepto</th>
                                <th className="p-4 text-right">Monto</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendientes.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50 transition-colors group">
                                    <td className="p-4 font-mono text-slate-500 text-xs">{item.fecha}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{item.razonSocial}</div>
                                        <div className="text-xs text-slate-500">{item.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono font-bold text-blue-700 bg-blue-50 inline-block px-1 rounded">{item.rfc}</div>
                                        <div className="text-xs text-slate-400 mt-1">{item.usoCFDI}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">{item.concepto}</td>
                                    <td className="p-4 text-right font-bold text-slate-800">${item.monto}</td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${item.rfc} | ${item.razonSocial} | ${item.usoCFDI} | ${item.email}`);
                                                toast.success("Datos copiados al portapapeles");
                                            }}
                                            className="text-xs border border-slate-300 px-3 py-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
                                            title="Copiar datos para facturar"
                                        >
                                            📋 Copiar Datos
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {pendientes.length === 0 && (
                        <div className="p-10 text-center text-slate-400 italic">
                            No se encontraron operaciones que requieran factura en este periodo.
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}