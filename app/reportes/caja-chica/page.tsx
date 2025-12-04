"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";

export default function ReporteCajaChicaPage() {
  // Por defecto, mostramos el mes actual completo
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalGasto, setTotalGasto] = useState(0);

  const cargarGastos = async () => {
    setLoading(true);
    setGastos([]);
    setTotalGasto(0);

    try {
      // Ajustamos las fechas para cubrir todo el día
      // "T00:00:00" para el inicio y "T23:59:59" para el final
      const start = new Date(`${fechaInicio}T00:00:00`);
      const end = new Date(`${fechaFin}T23:59:59`);

      // Consulta a la colección 'gastos' (Asumiendo que GastosManager guarda ahí)
      // Si tu colección se llama diferente (ej. 'egresos'), cambia "gastos" por el nombre real.
      const q = query(
        collection(db, "gastos"), 
        where("fecha", ">=", start),
        where("fecha", "<=", end),
        orderBy("fecha", "desc")
      );

      const snapshot = await getDocs(q);
      
      let suma = 0;
      const datos = snapshot.docs.map(doc => {
        const data = doc.data();
        const monto = Number(data.monto) || 0;
        suma += monto;

        return {
          id: doc.id,
          ...data,
          monto: monto,
          // Formateamos la fecha para que sea legible
          fechaLegible: data.fecha?.seconds 
            ? new Date(data.fecha.seconds * 1000).toLocaleDateString('es-MX') 
            : 'S/F'
        };
      });

      setGastos(datos);
      setTotalGasto(suma);

      if (datos.length === 0) {
        toast.info("No hay gastos registrados en este periodo.");
      }

    } catch (error: any) {
      console.error("Error cargando caja chica:", error);
      if (error.message && error.message.includes("Quota")) {
        toast.error("Límite de lectura excedido. Intenta mañana.");
      } else {
        // Si falla, es probable que falte el índice compuesto en Firebase
        toast.error("Error cargando datos (Verifica índices en Firebase).");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar al inicio y cuando cambien las fechas (opcional, o solo con botón)
  useEffect(() => {
    cargarGastos();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/reportes" className="text-slate-500 hover:text-blue-600 font-bold text-xl">
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reporte de Caja Chica</h1>
              <p className="text-sm text-slate-500">Control de gastos operativos y salidas de efectivo</p>
            </div>
          </div>

          {/* Filtros de Fecha */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                    <input 
                        type="date" 
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="border border-slate-300 rounded-lg p-2 text-slate-700 w-full md:w-auto"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                    <input 
                        type="date" 
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="border border-slate-300 rounded-lg p-2 text-slate-700 w-full md:w-auto"
                    />
                </div>
                <button 
                    onClick={cargarGastos}
                    disabled={loading}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors h-10 w-full md:w-auto"
                >
                    {loading ? "Buscando..." : "🔍 Filtrar Gastos"}
                </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase">Total Egresos</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">
                        -${totalGasto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-4xl opacity-20">💸</div>
             </div>
             
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase">Movimientos</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{gastos.length}</p>
                </div>
                <div className="text-4xl opacity-20">🧾</div>
             </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
               <h3 className="font-bold text-slate-700">Detalle de Gastos</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Concepto / Descripción</th>
                            <th className="px-4 py-3">Categoría</th>
                            <th className="px-4 py-3">Responsable</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {gastos.length > 0 ? (
                            gastos.map((gasto) => (
                                <tr key={gasto.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                        {gasto.fechaLegible}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {gasto.descripcion || gasto.concepto || "Sin descripción"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                                            {gasto.categoria || "General"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {gasto.autorizadoPor || gasto.responsable || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-red-600">
                                        -${Number(gasto.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                    No hay gastos en este rango de fechas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}