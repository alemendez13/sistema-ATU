/* app/reportes/ingresos-sansce/page.tsx */
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "@/lib/firebase-guard"; 
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency, cleanPrice, formatDate } from "../../../lib/utils";
import { addDoc, serverTimestamp } from "@/lib/firebase-guard"; // Asegúrate de tener addDoc

export default function ReporteIngresosPage() {
  // Estado para la fecha (por defecto HOY)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 });
  const ejecutarCierreCaja = async () => {
    if(!confirm("¿Deseas realizar el Cierre de Caja? Los totales se guardarán de forma permanente.")) return;
    
      try {
          await addDoc(collection(db, "cortes_caja"), {
              fechaCorte: fechaSeleccionada,
              creadoEn: serverTimestamp(),
              totales: totales,
              detalleTerminales: {
                  tpvCredBAN: sumarPorMetodo(ingresos, 'TPV Cred BAN'),
                  tpvDebBAN: sumarPorMetodo(ingresos, 'TPV Deb BAN'),
                  tpvCredMP: sumarPorMetodo(ingresos, 'TPV Cred MP'),
                  tpvDebMP: sumarPorMetodo(ingresos, 'TPV DebMP'),
              },
              cerradoPor: "Admin SANSCE" // Aquí podrías usar el email del usuario logueado
          });
          toast.success("✅ Caja cerrada y guardada con éxito.");
      } catch (error) {
          toast.error("Error al procesar el cierre.");
      }
  };

  // 1. Definición de la función de suma técnica para pagos mixtos
  const sumarPorMetodo = (arr: any[], metodoDeseado: string) => 
    arr.reduce((acc, curr) => {
        // Caso A: Si la operación es un Pago Mixto
        if (curr.desglosePagos && Array.isArray(curr.desglosePagos)) {
            const parcial = curr.desglosePagos
                .filter((p: any) => p.metodo === metodoDeseado)
                .reduce((a: number, c: any) => a + c.monto, 0);
            return acc + parcial;
        }
        // Caso B: Si es un pago tradicional
        const metodoOperacion = curr.metodoPago || "";
        // Soporte para Tarjetas (agrupa MP y BAN en el total de tarjeta)
        if (metodoDeseado === "Tarjeta") {
            return acc + (metodoOperacion.includes("Tarjeta") || metodoOperacion.includes("TPV") ? (curr.monto || 0) : 0);
        }
        return acc + (metodoOperacion === metodoDeseado ? (curr.monto || 0) : 0);
    }, 0);

  // Función para cargar datos (MEJORADA)
  /* app/reportes/ingresos-sansce/page.tsx - Versión Corregida */

// ... (imports y sumarPorMetodo se mantienen igual)

  const cargarReporte = async () => {
    setLoading(true);
    try {
      // 1. Consulta principal
      // 1. Definir rango de tiempo (00:00:00 a 23:59:59 del día seleccionado)
      const inicioDia = new Date(fechaSeleccionada);
      inicioDia.setHours(0, 0, 0, 0);
      const finDia = new Date(fechaSeleccionada);
      finDia.setHours(23, 59, 59, 999);

      // 2. Consulta corregida: Filtrar por FECHA DE PAGO real
      const q = query(
        collection(db, "operaciones"),
        where("estatus", "in", ["Pagado", "Pagado (Cortesía)"]),
        where("fechaPago", ">=", inicioDia),
        where("fechaPago", "<=", finDia),
        orderBy("fechaPago", "desc")
      );

      const snapshot = await getDocs(q);
      
      // 2. Mapeo y Enriquecimiento
      const datosCompletos = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const montoLimpio = cleanPrice(data.monto);

        // Lógica de Nombre del PS
        let nombrePS = "SANSCE (General)";
        if (data.servicioNombre?.includes("Consulta con")) {
            nombrePS = data.servicioNombre.replace("Consulta con", "").trim();
        } else if (data.servicioSku === "CONSULTA") {
            nombrePS = "Consulta General";
        }

        // Lógica de Factura (Consulta asíncrona)
        let requiereFactura = "No";
        if (data.pacienteId) {
            try {
                const pacienteRef = doc(db, "pacientes", data.pacienteId);
                const pacienteSnap = await getDoc(pacienteRef);
                if (pacienteSnap.exists() && pacienteSnap.data().datosFiscales?.rfc?.length > 3) {
                    requiereFactura = "Sí";
                }
            } catch (err) { console.error("Error factura:", err); }
        }

        return {
          id: docSnap.id,
          ...data,
          monto: montoLimpio,
          nombrePS,
          requiereFactura,
          concepto: data.servicioNombre || "Atención",
          hora: data.fecha ? (formatDate(data.fecha).split(' ')[1] || "00:00") : "--:--"
        };
      }));

      // 3. CÁLCULO DE TOTALES (Única fuente de verdad)
      const efecFinal  = sumarPorMetodo(datosCompletos, 'Efectivo');
      const tarjFinal  = sumarPorMetodo(datosCompletos, 'Tarjeta');
      const transFinal = sumarPorMetodo(datosCompletos, 'Transferencia');
      const totalFinal = datosCompletos.reduce((acc, curr) => acc + curr.monto, 0);

      // Seteo de estados
      setIngresos(datosCompletos);
      setTotales({ 
          efectivo: efecFinal, 
          tarjeta: tarjFinal, 
          transferencia: transFinal, 
          total: totalFinal 
      });

      if (datosCompletos.length === 0) toast.info("No hubo ingresos registrados.");

    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar automáticamente al cambiar la fecha
  useEffect(() => {
    cargarReporte();
  }, [fechaSeleccionada]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header de Navegación */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/reportes" className="text-slate-500 hover:text-blue-600 font-bold text-xl">
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reporte Diario de Ingresos (SANSCE)</h1>
              <p className="text-sm text-slate-500">Desglose detallado de cobranza por día</p>
            </div>
          </div>

          {/* Filtro de Fecha */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="font-bold text-slate-700">📅 Fecha del Reporte:</span>
              <input 
                type="date" 
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="border border-slate-300 rounded-lg p-2 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <button 
              onClick={cargarReporte} 
              disabled={loading}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors"
            >
              🔄 Actualizar Datos
            </button>
          </div>

          {/* Tarjetas de Totales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Día</p>
              <p className="text-2xl font-bold text-green-600">${totales.total.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Efectivo 💵</p>
              <p className="text-lg font-bold text-slate-700">${totales.efectivo.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Tarjeta 💳</p>
              <p className="text-lg font-bold text-slate-700">${totales.tarjeta.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Transferencia 🏦</p>
              <p className="text-lg font-bold text-slate-700">${totales.transferencia.toLocaleString()}</p>
            </div>
          </div>

          <button 
              onClick={ejecutarCierreCaja}
              className="mb-6 w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex justify-center items-center gap-2"
          >
              🔒 Realizar Cierre de Caja (Finalizar Jornada)
          </button>

          {/* Tabla de Detalle */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Detalle de Movimientos</h3>
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {ingresos.length} Operaciones
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400">Cargando movimientos...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-blue-600 text-white uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Nombre del PS</th>
                      <th className="px-4 py-3">Nombre del Paciente</th>
                      <th className="px-4 py-3">Concepto / Producto</th>
                      <th className="px-4 py-3">Forma de Pago</th>
                      <th className="px-4 py-3 text-center">¿Factura?</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">Monto Cobrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ingresos.length > 0 ? (
                      ingresos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          {/* COLUMNA 1: PS (Médico) */}
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {item.nombrePS}
                          </td>
                          
                          {/* COLUMNA 2: PACIENTE */}
                          <td className="px-4 py-3 text-slate-600">
                             {item.pacienteNombre}
                             <div className="text-[10px] text-slate-400">{item.hora} hrs</div>
                          </td>

                          {/* COLUMNA 3: CONCEPTO */}
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {item.concepto}
                          </td>

                          {/* COLUMNA 4: FORMA DE PAGO */}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold border 
                              ${item.metodoPago === 'Efectivo' ? 'bg-green-50 text-green-700 border-green-200' : 
                                item.metodoPago === 'Transferencia' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {item.metodoPago || "No especificado"}
                            </span>
                          </td>

                          {/* COLUMNA 5: FACTURA */}
                          <td className="px-4 py-3 text-center">
                             {item.requiereFactura === "Sí" ? (
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">SÍ</span>
                             ) : (
                                <span className="text-xs text-slate-400">No</span>
                             )}
                          </td>

                          {/* COLUMNA 6: MONTO */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                            ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          No hay registros para la fecha seleccionada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center text-xs text-slate-400">
            * Este reporte muestra únicamente operaciones con estatus "Pagado".
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}