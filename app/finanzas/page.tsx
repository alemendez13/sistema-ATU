// app/finanzas/page.tsx
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import CorteDia from "@/components/finanzas/CorteDia";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Operacion } from "@/types";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth"; 
import { cleanPrice, formatCurrency, formatDate } from "../../lib/utils";
import { toast } from "sonner";

export default function FinanzasPage() {
  const [pendientes, setPendientes] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const { user } = useAuth() as any; 
  const [verCarteraVencida, setVerCarteraVencida] = useState(false);
  const [opParaTarjeta, setOpParaTarjeta] = useState<Operacion | null>(null);

  // Reacciona al cambio de botones
  useEffect(() => {
    if (!user) return; // 🛡️ Guardia: Si no hay usuario, no intentes cargar datos
    cargarPendientes();
  }, [verCarteraVencida, user]); // ✅ Añadimos 'user' aquí 

  const cargarPendientes = async () => {
    setLoading(true);
    try {
      const hoyISO = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD" local

      const q = query(
        collection(db, "operaciones"),
        where("estatus", "==", "Pendiente de Pago"),
        where("fechaCita", verCarteraVencida ? "<" : "==", hoyISO), 
        orderBy("fechaCita", "desc"), 
        orderBy("doctorNombre", "asc") 
      );
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Operacion[];

      setPendientes(docs);
    } catch (error: any) {
      // Si el error es por permisos denegados al salir, no lo mostramos como error fatal
      if (error.code !== 'permission-denied') {
        console.error("Error cargando finanzas:", error);
        toast.error("Error al filtrar la cobranza.");
      }
    }
      finally {
      setLoading(false);
    }
  };

  const handleCobrar = async (id: string, metodo: string, op: Operacion) => {
    if(!confirm(`¿Confirmas recibir el pago en ${metodo}?`)) return;
    setProcesandoId(id);
    try {
      // 1. 👇 DEFINIMOS LA VARIABLE PRIMERO (Calculamos el monto)
      const montoNumerico = metodo === 'Cortesía' ? 0 : Number(cleanPrice(op.monto));

      // 2. 👇 USAMOS LA VARIABLE EN EL OBJETO
      const datosCobro = {
          estatus: "Pagado",
          metodoPago: metodo,
          fechaPago: new Date(),
          elaboradoPor: user?.email || "Usuario Desconocido", 
          montoPagado: montoNumerico // ✅ Aquí reemplazas la línea anterior
      };

      await updateDoc(doc(db, "operaciones", id), datosCobro);
      cargarPendientes();
      toast.success(`Pago en ${metodo} registrado correctamente`);
    } catch (error) {
      console.error("Error al cobrar:", error);
      toast.error("No se pudo registrar el pago");
    } finally {
      setProcesandoId(null);
    }
  };

  let ultimoDoctor = "";
  let colorAlternado = false;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Módulo 8: Finanzas</h1>
              <p className="text-slate-500 text-sm">Corte del día y registro de movimientos.</p>
            </div>
            
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Link href="/finanzas" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md">💰 Caja</Link>
              <Link href="/reportes" className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg text-xs font-bold transition-all">📈 Reportes</Link>
              <Link href="/finanzas/gastos" className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold transition-all">💸 Gastos</Link>
            </div>
          </header>

          <CorteDia />

          {/* Selector de filtros */}
          <div className="flex gap-2 mb-4 mt-8">
              <button 
                  onClick={() => setVerCarteraVencida(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${!verCarteraVencida ? 'bg-blue-600 text-white shadow-lg border-blue-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                  📅 COBRANZA DEL DÍA
              </button>
              <button 
                  onClick={() => setVerCarteraVencida(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${verCarteraVencida ? 'bg-red-600 text-white shadow-lg border-red-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                  🚨 CARTERA VENCIDA (Anteriores)
              </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className={`text-xl font-bold ${verCarteraVencida ? 'text-red-600' : 'text-blue-600'}`}>
                    {verCarteraVencida ? "⚠️ Cartera Vencida" : "🔴 Cuentas por Cobrar"}
                </h2>
                <span className={`${verCarteraVencida ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} text-xs font-bold px-3 py-1 rounded-full`}>
                    {pendientes.length} Pendientes
                </span>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400 animate-pulse">Buscando deudas...</div>
            ) : pendientes.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                    <p className="text-5xl mb-4">🎉</p>
                    <p className="font-medium text-slate-500">¡Todo al día! No hay cobros en esta sección.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 font-bold uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="p-4">Paciente</th>
                                <th className="p-4">Servicio</th>
                                <th className="p-4">Responsable</th>
                                <th className="p-4">Monto</th>
                                <th className="p-4">Fecha Solicitud</th>
                                <th className="p-4">Fecha Cita</th>
                                <th className="p-4 text-right">Acción (Cobrar)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendientes.map((op) => {
                                // Lógica de agrupación visual
                                if (op.doctorNombre !== ultimoDoctor) {
                                  colorAlternado = !colorAlternado;
                                  ultimoDoctor = op.doctorNombre || "N/A";
                                }
                                const bgClass = colorAlternado ? "bg-white" : "bg-blue-50/40";

                                return (
                                  <tr key={op.id} className={`${bgClass} hover:bg-slate-100 transition-colors`}>
                                      <td className="p-4 font-bold text-slate-800">{op.pacienteNombre}</td>
                                      <td className="p-4">
                                          <span className="bg-white text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-100">
                                              {op.servicioNombre}
                                          </span>
                                      </td>
                                      <td className="p-4 text-xs font-bold text-slate-600 uppercase">
                                          {op.doctorNombre || "N/A"}
                                      </td>
                                      <td className="p-4 font-mono text-base font-bold text-slate-900">
                                          {formatCurrency(op.monto)}
                                      </td>
                                      
                                      {/* 👇 CELDA 5: FECHA SOLICITUD (Registro) */}
                                      <td className="p-4 text-[10px] text-slate-400 font-mono">
                                        {formatDate(op.fecha)}
                                      </td>
                                      {/* 👇 CELDA 6: FECHA CITA (Para el filtro) */}
                                      <td className="p-4 text-[11px] text-blue-600 font-black font-mono">
                                        {op.fechaCita || "S/F"}
                                      </td>
                                      {/* 👇 CELDA 7: ACCIONES DE COBRO */}

                                      <td className="p-4">
                                          {procesandoId === op.id ? (
                                              <div className="text-center text-slate-400 text-xs italic">Procesando...</div>
                                          ) : (
                                              <div className="flex flex-wrap gap-1 justify-end">
                                                  <button onClick={() => handleCobrar(op.id!, 'Efectivo', op)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-green-200 transition">EFECTIVO</button>
                                                  <button onClick={() => setOpParaTarjeta(op)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-200 transition">TARJETA</button>
                                                  <button onClick={() => handleCobrar(op.id!, 'Transferencia', op)} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-purple-200 transition">TRANSF</button>
                                                  <button onClick={() => handleCobrar(op.id!, 'Vale', op)} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-orange-200 transition">🎟️ VALE</button>
                                                  <button onClick={() => {
                                                      if(confirm("¿Aplicar CORTESÍA? El ingreso se registrará en $0.00")) {
                                                          handleCobrar(op.id!, 'Cortesía', op);
                                                      }
                                                  }} className="bg-slate-800 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-black transition">🎁 CORTESÍA</button>
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* 💳 BURBUJA DE SUB-MÉTODOS DE PAGO (Punto 5) */}
      {opParaTarjeta && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xs animate-in zoom-in-95 duration-200">
                <h3 className="text-center font-black text-slate-800 uppercase text-sm mb-4">Seleccionar Tarjeta</h3>
                <div className="grid gap-2">
                    <button 
                        onClick={() => { handleCobrar(opParaTarjeta.id!, 'Tarjeta (Débito)', opParaTarjeta); setOpParaTarjeta(null); }}
                        className="w-full py-3 bg-slate-50 hover:bg-blue-50 text-blue-700 rounded-xl font-bold text-xs border border-slate-100 transition-all flex justify-between px-4 items-center"
                    >
                        💳 DÉBITO <span>→</span>
                    </button>
                    <button 
                        onClick={() => { handleCobrar(opParaTarjeta.id!, 'Tarjeta (Crédito)', opParaTarjeta); setOpParaTarjeta(null); }}
                        className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs border border-slate-100 transition-all flex justify-between px-4 items-center"
                    >
                        💳 CRÉDITO <span>→</span>
                    </button>
                    <button 
                        onClick={() => { handleCobrar(opParaTarjeta.id!, 'Tarjeta (Amex)', opParaTarjeta); setOpParaTarjeta(null); }}
                        className="w-full py-3 bg-slate-50 hover:bg-amber-50 text-amber-700 rounded-xl font-bold text-xs border border-slate-100 transition-all flex justify-between px-4 items-center"
                    >
                        💙 AMEX <span>→</span>
                    </button>
                    <button 
                        onClick={() => setOpParaTarjeta(null)}
                        className="mt-2 w-full py-2 text-slate-400 font-bold text-[10px] uppercase hover:text-slate-600"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
      )}

    </ProtectedRoute> 
  );
}