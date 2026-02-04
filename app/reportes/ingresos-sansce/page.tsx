/* app/reportes/ingresos-sansce/page.tsx */
"use client";
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from "@/lib/firebase-guard"; 
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency, cleanPrice, formatDate } from "../../../lib/utils";
import { addDoc, serverTimestamp } from "@/lib/firebase-guard"; // Asegúrate de tener addDoc

export default function ReporteIngresosPage() {
  // Estado para la fecha (por defecto HOY)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [ingresos, setIngresos] = useState<any[]>([]); // Producción del día
  const [recuperacion, setRecuperacion] = useState<any[]>([]); // Pagos de citas anteriores
  const [pendientes, setPendientes] = useState<any[]>([]); // Cartera Vencida
  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 });
  // Nuevo estado para controlar el criterio de agrupación
  const [criterioAgrupacion, setCriterioAgrupacion] = useState<'ninguno' | 'medico' | 'concepto'>('ninguno');
  // Estado para controlar qué grupos están expandidos
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});

  // Función para agrupar los datos dinámicamente
  const obtenerDatosAgrupados = () => {
    if (criterioAgrupacion === 'ninguno') return { "Todos los movimientos": ingresos };
    
    return ingresos.reduce((acc: any, item) => {
      const llave = criterioAgrupacion === 'medico' ? item.nombrePS : item.concepto;
      if (!acc[llave]) acc[llave] = [];
      acc[llave].push(item);
      return acc;
    }, {});
  };

  const toggleGrupo = (nombreGrupo: string) => {
    setGruposAbiertos(prev => ({ ...prev, [nombreGrupo]: !prev[nombreGrupo] }));
  };
  const expandirTodos = () => {
    const grupos = Object.keys(obtenerDatosAgrupados());
    const nuevoEstado = grupos.reduce((acc, curr) => ({ ...acc, [curr]: true }), {});
    setGruposAbiertos(nuevoEstado);
  };

  const colapsarTodos = () => {
    setGruposAbiertos({});
  };
  const ejecutarCierreCaja = async () => {
    if(!confirm("¿Deseas realizar el Cierre de Caja? Los totales se guardarán de forma permanente.")) return;
    
      try {
          // Unificamos ambos flujos para el cierre financiero real
          const todosLosCobros = [...ingresos, ...recuperacion];

          await addDoc(collection(db, "cortes_caja"), {
              fechaCorte: fechaSeleccionada,
              creadoEn: serverTimestamp(),
              totales: totales,
              detalleTerminales: {
                  tpvCredBAN: sumarPorMetodo(todosLosCobros, 'TPV Cred BAN'),
                  tpvDebBAN: sumarPorMetodo(todosLosCobros, 'TPV Deb BAN'),
                  tpvCredMP: sumarPorMetodo(todosLosCobros, 'TPV Cred MP'),
                  tpvDebMP: sumarPorMetodo(todosLosCobros, 'TPV DebMP'),
              },
              cerradoPor: "Admin SANSCE" 
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
      const inicioDia = new Date(fechaSeleccionada + 'T00:00:00');
      const finDia = new Date(fechaSeleccionada + 'T23:59:59.999');

      // 1. TRAER TODO LO PAGADO HOY
      const q = query(
        collection(db, "operaciones"),
        where("estatus", "in", ["Pagado", "Pagado (Cortesía)"]),
        where("fechaPago", ">=", inicioDia),
        where("fechaPago", "<=", finDia),
        orderBy("fechaPago", "desc")
      );

      const snapshot = await getDocs(q);
      
      const datosCrudos = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        
        let nombrePS = data.profesionalNombre || data.doctorNombre || "SANSCE (General)";
        if (nombrePS === "SANSCE (General)" && data.servicioNombre?.includes("Consulta con")) {
            nombrePS = data.servicioNombre.replace("Consulta con", "").trim();
        }

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
          monto: cleanPrice(data.monto),
          nombrePS,
          requiereFactura,
          concepto: data.servicioNombre || "Atención",
          hora: data.fecha ? (formatDate(data.fecha).split(' ')[1] || "00:00") : "--:--",
          fechaCita: data.fecha // Guardamos el objeto fecha original para comparar
        };
      }));

      // 2. SEPARAR PRODUCCIÓN VS RECUPERACIÓN
      const produccionDia: any[] = [];
      const recuperacionCartera: any[] = [];

      datosCrudos.forEach(item => {
          // Convertimos la fecha de la cita a YYYY-MM-DD para comparar con fechaSeleccionada
          // Nota: item.fechaCita es Timestamp de Firebase
          const fechaCitaDate = item.fechaCita ? item.fechaCita.toDate() : new Date();
          // Ajuste simple de zona horaria local para la comparación de string
          const fechaCitaStr = fechaCitaDate.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD local

          if (fechaCitaStr === fechaSeleccionada) {
              produccionDia.push(item);
          } else {
              recuperacionCartera.push(item);
          }
      });

      // 3. TOTALES (La suma de ambas bolsas)
      const todos = [...produccionDia, ...recuperacionCartera];
      setTotales({ 
          efectivo: sumarPorMetodo(todos, 'Efectivo'), 
          tarjeta: sumarPorMetodo(todos, 'Tarjeta'), 
          transferencia: sumarPorMetodo(todos, 'Transferencia'), 
          total: todos.reduce((acc, curr) => acc + curr.monto, 0) 
      });

      setIngresos(produccionDia);
      setRecuperacion(recuperacionCartera);

      if (todos.length === 0) toast.info("No hubo ingresos registrados.");

      // --- BLOQUE CARTERA VENCIDA (FINAL) ---
      try {
        const qPendientes = query(
          collection(db, "operaciones"),
          where("estatus", "in", ["Pendiente", "Agendada", "Pendiente de Pago"]), 
          where("fecha", ">=", inicioDia),
          where("fecha", "<=", finDia),
          orderBy("fecha", "desc")
        );
        const snapshotPendientes = await getDocs(qPendientes);
        // ... (Procesamiento de pendientes idéntico al anterior) ...
        const datosPendientes = snapshotPendientes.docs.map((docSnap) => {
             const data = docSnap.data();
             let nombrePS = data.profesionalNombre || data.doctorNombre || "SANSCE (General)";
             if (nombrePS === "SANSCE (General)" && data.servicioNombre?.includes("Consulta con")) {
                 nombrePS = data.servicioNombre.replace("Consulta con", "").trim();
             }
             return {
                 id: docSnap.id, ...data, monto: data.monto ? cleanPrice(data.monto) : 0,
                 nombrePS, concepto: data.servicioNombre || "Atención",
                 hora: data.fecha ? (formatDate(data.fecha).split(' ')[1] || "00:00") : "--:--"
             };
        });
        setPendientes(datosPendientes);
      } catch (error) { console.error("Error pendientes:", error); }

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
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-700">Detalle de Movimientos</h3>
                <p className="text-[10px] text-slate-400 uppercase font-black">Agrupar por:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <button onClick={() => setCriterioAgrupacion('ninguno')} className={`px-2 py-1 rounded text-[10px] font-bold ${criterioAgrupacion === 'ninguno' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>LISTA SIMPLE</button>
                  <button onClick={() => setCriterioAgrupacion('medico')} className={`px-2 py-1 rounded text-[10px] font-bold ${criterioAgrupacion === 'medico' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>POR MÉDICO</button>
                  <button onClick={() => setCriterioAgrupacion('concepto')} className={`px-2 py-1 rounded text-[10px] font-bold ${criterioAgrupacion === 'concepto' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>POR CONCEPTO</button>
                  
                  {criterioAgrupacion !== 'ninguno' && (
                    <div className="flex gap-2 ml-2 pl-2 border-l border-slate-300">
                      <button onClick={expandirTodos} className="text-[10px] font-bold text-blue-600 hover:underline">📂 Expandir todos</button>
                      <button onClick={colapsarTodos} className="text-[10px] font-bold text-slate-500 hover:underline">📁 Colapsar todos</button>
                    </div>
                  )}
                </div>
              </div>
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
                      Object.entries(obtenerDatosAgrupados()).map(([nombreGrupo, items]: [string, any]) => (
                        <React.Fragment key={nombreGrupo}>
                          {/* Fila de Encabezado de Grupo (Solo si hay agrupación activa) */}
                          {criterioAgrupacion !== 'ninguno' && (
                            <tr 
                              onClick={() => toggleGrupo(nombreGrupo)}
                              className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors border-y border-slate-200"
                            >
                              <td colSpan={6} className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs">{gruposAbiertos[nombreGrupo] ? '▼' : '▶'}</span>
                                  <span className="font-black text-slate-700 uppercase text-[11px] tracking-wider">{nombreGrupo}</span>
                                  <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 border border-slate-200">
                                    {items.length} {items.length === 1 ? 'movimiento' : 'movimientos'}
                                  </span>
                                  <span className="ml-auto font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                    Subtotal: ${items.reduce((acc: number, curr: any) => acc + curr.monto, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Filas de Datos (Se muestran si el grupo está abierto o si no hay agrupación) */}
                          {(criterioAgrupacion === 'ninguno' || gruposAbiertos[nombreGrupo]) && items.map((item: any) => (
                            <tr key={item.id} className="hover:bg-blue-50/50 transition-colors border-b border-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-700">{item.nombrePS}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.pacienteNombre}
                                <div className="text-[10px] text-slate-400">{item.hora} hrs</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 text-xs italic">{item.concepto}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold border 
                                  ${item.metodoPago === 'Efectivo' ? 'bg-green-50 text-green-700 border-green-200' : 
                                    item.metodoPago === 'Transferencia' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                    'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                  {item.metodoPago || "No especificado"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.requiereFactura === "Sí" ? (
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">FACTURAR</span>
                                ) : (
                                  <span className="text-[10px] text-slate-300">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
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

          {/* SECCIÓN: REGULARIZACIÓN (RECUPERACIÓN DE CARTERA) */}
          {recuperacion.length > 0 && (
            <div className="mt-8 border-t-4 border-purple-400 bg-purple-50 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🦄</span>
                <div>
                  <h3 className="font-bold text-purple-900 text-lg">Regularización de Pagos (Recuperación)</h3>
                  <p className="text-sm text-purple-700">Pagos recibidos hoy correspondientes a citas de fechas pasadas.</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-purple-400 uppercase">Total Recuperado</p>
                  <p className="text-xl font-black text-purple-800">
                    ${recuperacion.reduce((acc, curr) => acc + curr.monto, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-purple-100 text-purple-900 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-2">Paciente</th>
                      <th className="px-4 py-2">Concepto Original</th>
                      <th className="px-4 py-2">Fecha Cita</th>
                      <th className="px-4 py-2">Fecha Pago (Hoy)</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {recuperacion.map((item) => (
                      <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-purple-900">{item.pacienteNombre}</td>
                        <td className="px-4 py-2 text-purple-700 text-xs">{item.concepto}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs">
                          {item.fechaCita ? formatDate(item.fechaCita).split(' ')[0] : 'S/D'}
                        </td>
                        <td className="px-4 py-2 text-green-600 font-bold text-xs">
                          {formatDate(item.fechaPago).split(' ')[1]} hrs
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-purple-900">
                          ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECCIÓN: CARTERA VENCIDA (PENDIENTES) */}
          {pendientes.length > 0 && (
            <div className="mt-8 border-t-4 border-red-400 bg-red-50 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-red-800 text-lg">Cartera Vencida del Día (Pendientes de Pago)</h3>
                  <p className="text-sm text-red-600">Pacientes atendidos hoy que NO registraron pago.</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-red-400 uppercase">Monto por Cobrar</p>
                  <p className="text-xl font-black text-red-700">
                    ${pendientes.reduce((acc, curr) => acc + curr.monto, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-red-100 text-red-800 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-2">Médico / PS</th>
                      <th className="px-4 py-2">Paciente</th>
                      <th className="px-4 py-2">Concepto</th>
                      <th className="px-4 py-2 text-right">Monto Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {pendientes.map((item) => (
                      <tr key={item.id} className="hover:bg-red-50 transition-colors">
                        <td className="px-4 py-2 font-medium text-red-900">{item.nombrePS}</td>
                        <td className="px-4 py-2 text-red-700">
                          {item.pacienteNombre} <span className="text-xs opacity-70">({item.hora})</span>
                        </td>
                        <td className="px-4 py-2 text-red-600 text-xs italic">{item.concepto}</td>
                        <td className="px-4 py-2 text-right font-bold text-red-800">
                          ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}