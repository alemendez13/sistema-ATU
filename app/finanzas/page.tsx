// app/finanzas/page.tsx
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "@/lib/firebase-guard";
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
  const [opParaPagoMixto, setOpParaPagoMixto] = useState<Operacion | null>(null);
  const [montosMixtos, setMontosMixtos] = useState({ efectivo: 0, mp: 0, ban: 0, transf: 0 });

  // Reacciona al cambio de botones
  useEffect(() => {
    if (!user) return; // 🛡️ Guardia: Si no hay usuario, no intentes cargar datos
    cargarPendientes();
  }, [verCarteraVencida, user]); // ✅ Añadimos 'user' aquí 

  const cargarPendientes = async () => {
  setLoading(true);
  try {
    const hoyISO = new Date().toLocaleDateString('en-CA'); // Formato "YYYY-MM-DD"

    const q = query(
      collection(db, "operaciones"),
      where("estatus", "==", "Pendiente de Pago"),
      // Mantenemos tu diseño: Filtramos por la fecha de la CITA
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
    console.error("Error en finanzas:", error);
    toast.error("Error al cargar la cobranza.");
  } finally {
    setLoading(false);
  }
};

  const handleCobrar = async (id: string, metodo: string, op: Operacion) => {
    // 1. REGLA DE NEGOCIO: Definimos el monto real a cobrar (Cortesía = $0.00)
    // Extraído de tu lógica original en VSC
    const montoBase = Number(cleanPrice(op.monto));
    const montoAFacturar = metodo === 'Cortesía' ? 0 : montoBase; 

    // 2. VALIDACIÓN MATEMÁTICA (Exclusiva para Pago Mixto)
    if (metodo === 'Mixto') {
        const sumaIngresada = Object.values(montosMixtos).reduce((a, b) => a + b, 0);
        // Usamos una tolerancia de $0.01 para evitar errores de punto flotante
        if (Math.abs(sumaIngresada - montoAFacturar) > 0.01) {
            toast.error(`La suma ($${sumaIngresada}) no coincide con el total ($${montoAFacturar})`);
            return;
        }
    }

    // 3. CONFIRMACIÓN MEJORADA (Usa formatCurrency de utils.ts) [cite: 12]
    if (!confirm(`¿Confirmas recibir el pago de ${formatCurrency(montoAFacturar)} en ${metodo}?`)) return;
    
    setProcesandoId(id);
    try {
        const datosCobro: any = {
            estatus: "Pagado",
            metodoPago: metodo,
            fechaPago: new Date(),
            elaboradoPor: user?.email || "Usuario Desconocido", 
            montoPagado: montoAFacturar, // Aseguramos el 0 si es cortesía
        };

        // 4. ESTRUCTURA DE DESGLOSE (Sincronizada con Fase 1)
        if (metodo === 'Mixto') {
            datosCobro.desglosePagos = [
                { metodo: 'Efectivo', monto: montosMixtos.efectivo },
                { metodo: 'Tarjeta (TPV MP)', monto: montosMixtos.mp },
                { metodo: 'Tarjeta (TPV BAN)', monto: montosMixtos.ban },
                { metodo: 'Transferencia', monto: montosMixtos.transf }
            ].filter(p => p.monto > 0); 
        }

        // 5. PERSISTENCIA EN FIRESTORE 
        await updateDoc(doc(db, "operaciones", id), datosCobro);
        
        // 6. LIMPIEZA DE ESTADOS DE INTERFAZ (Vital para evitar bugs visuales)
        setOpParaPagoMixto(null);
        setOpParaTarjeta(null); // Cerramos también el modal de tarjetas por si acaso
        setMontosMixtos({ efectivo: 0, mp: 0, ban: 0, transf: 0 });
        
        cargarPendientes();
        toast.success(`Pago ${metodo} registrado con éxito.`);
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
                                <th className="p-4 text-center">Registro</th>
                                <th className="p-4 text-center">Fecha Cita</th>
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
                                          <div className="flex flex-col gap-1">
                                              <span className="bg-white text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 w-fit">
                                                  {op.servicioNombre}
                                              </span>
                                              {/* ✅ AGREGADO: Aviso visual para el cajero */}
                                              {op.requiereFactura && (
                                                  <span className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                                                      📄 Requiere Factura
                                                  </span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="p-4 font-medium text-slate-700">
                                          {op.doctorNombre || "No asignado"}
                                      </td>
                                      <td className="p-4 font-mono text-base font-bold text-slate-900">
                                          {formatCurrency(op.monto)}
                                      </td>
                                      
                                      {/* Registro (Trazabilidad) */}
                                      <td className="p-4 text-[10px] text-slate-400 font-mono text-center">
                                        {formatDate(op.fecha)}
                                      </td>

                                      {/* Fecha de la Cita (Control de Cobro) */}
                                      <td className="p-4 text-center">
                                        {op.fechaCita ? (
                                          <span className="text-[11px] text-blue-600 font-black font-mono bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                            {op.fechaCita}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-red-500 font-bold animate-pulse">
                                            ⚠️ SIN FECHA CITA
                                          </span>
                                        )}
                                      </td>

                                      {/* 👇 CELDA 7: ACCIONES DE COBRO */}

                                      <td className="p-4">
                                          {procesandoId === op.id ? (
                                              <div className="text-center text-slate-400 text-xs italic">Procesando...</div>
                                          ) : (
                                              <div className="flex flex-wrap gap-1 justify-end">
                                                  <button onClick={() => handleCobrar(op.id!, 'Efectivo', op)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-green-200 transition">EFECTIVO</button>
                                                  <button onClick={() => handleCobrar(op.id!, 'Efectivo PS', op)} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-200 transition border border-indigo-200"title="Cobrado directamente por el Profesional">EFECTIVO PS</button>
                                                  <button onClick={() => setOpParaTarjeta(op)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-200 transition">TARJETA</button>
                                                  <button onClick={() => { setOpParaPagoMixto(op); setMontosMixtos({efectivo:0, mp:0, ban:0, transf:0}); }} className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-amber-200 transition">🔀 MIXTO</button>
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

      {/* 💳 BURBUJA DE SUB-MÉTODOS DE PAGO ACTUALIZADA */}
{opParaTarjeta && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xs animate-in zoom-in-95 duration-200">
      <h3 className="text-center font-black text-slate-800 uppercase text-sm mb-4 tracking-tighter">
        Seleccionar Tarjeta
      </h3>
      <div className="grid gap-2">
        {/* OPCIONES EXISTENTES */}
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

        {/* --- NUEVAS OPCIONES SOLICITADAS --- */}
        <button 
          onClick={() => { handleCobrar(opParaTarjeta.id!, 'TPV Cred BAN', opParaTarjeta); setOpParaTarjeta(null); }}
          className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 transition-all flex justify-between px-4 items-center"
        >
          📟 TPV Cred BAN <span>→</span>
        </button>
        <button 
          onClick={() => { handleCobrar(opParaTarjeta.id!, 'TPV Deb BAN', opParaTarjeta); setOpParaTarjeta(null); }}
          className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 transition-all flex justify-between px-4 items-center"
        >
          📟 TPV Deb BAN <span>→</span>
        </button>

        {/* MERCADO PAGO */}
        <button 
          onClick={() => { handleCobrar(opParaTarjeta.id!, 'TPV Cred MP', opParaTarjeta); setOpParaTarjeta(null); }}
          className="w-full py-3 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl font-bold text-xs border border-sky-200 transition-all flex justify-between px-4 items-center"
        >
          🧲 TPV Cred MP <span>→</span>
        </button>
        <button 
          onClick={() => { handleCobrar(opParaTarjeta.id!, 'TPV Deb MP', opParaTarjeta); setOpParaTarjeta(null); }}
          className="w-full py-3 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl font-bold text-xs border border-sky-200 transition-all flex justify-between px-4 items-center"
        >
          🧲 TPV Deb MP <span>→</span>
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

{/* 🔀 MODAL DE PAGO MIXTO (FASE 2) */}
{opParaPagoMixto && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Encabezado del Modal */}
      <div className="bg-amber-500 p-6 text-white">
        <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            🔀 Pago Mixto SANSCE
        </h3>
        <p className="text-amber-100 text-[10px] font-bold opacity-90 uppercase tracking-widest">
            Distribución de cobro por folio
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Resumen de la Deuda */}
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">Total a Cubrir:</span>
          <span className="text-xl font-black text-slate-800">
            {formatCurrency(opParaPagoMixto.monto)}
          </span>
        </div>

        {/* Campos de Entrada de Montos */}
        <div className="space-y-3">
          {[
            { id: 'efectivo', label: '💵 Efectivo', key: 'efectivo' },
            { id: 'mp', label: '🧲 TPV Mercado Pago', key: 'mp' },
            { id: 'ban', label: '📟 TPV Banorte', key: 'ban' },
            { id: 'transf', label: '🏦 Transferencia', key: 'transf' }
          ].map((input) => (
            <div key={input.id} className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                {input.label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold">$</span>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 pl-8 font-mono font-bold focus:border-amber-400 focus:bg-white outline-none transition-all"
                  value={montosMixtos[input.key as keyof typeof montosMixtos] || ''}
                  onChange={(e) => setMontosMixtos({
                    ...montosMixtos, 
                    [input.key]: Number(e.target.value) 
                  })}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Validador Matemático en Tiempo Real */}
        {(() => {
          const suma = Object.values(montosMixtos).reduce((a, b) => a + b, 0);
          const totalDeuda = Number(cleanPrice(opParaPagoMixto.monto));
          const diferencia = totalDeuda - suma;
          const esExacto = Math.abs(diferencia) < 0.01;

          return (
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              esExacto ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-100'
            }`}>
              <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                <span className={esExacto ? 'text-green-600' : 'text-red-400'}>Suma Actual:</span>
                <span className={esExacto ? 'text-green-700' : 'text-red-600'}>
                    {formatCurrency(suma)}
                </span>
              </div>
              {!esExacto && (
                <p className="text-[10px] font-bold text-red-500 italic">
                  {diferencia > 0 
                    ? `Faltan ${formatCurrency(diferencia)}` 
                    : `Exceso de ${formatCurrency(Math.abs(diferencia))}`}
                </p>
              )}
              {esExacto && (
                <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1">
                  ✅ Monto coincidente
                </p>
              )}
            </div>
          );
        })()}

        {/* Botones de Acción */}
        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => {
                setOpParaPagoMixto(null);
                setMontosMixtos({ efectivo: 0, mp: 0, ban: 0, transf: 0 });
            }}
            className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => handleCobrar(opParaPagoMixto.id!, 'Mixto', opParaPagoMixto)}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-amber-200 transition-all disabled:opacity-30 disabled:grayscale"
            disabled={Math.abs(Object.values(montosMixtos).reduce((a, b) => a + b, 0) - Number(cleanPrice(opParaPagoMixto.monto))) > 0.01}
          >
            Confirmar Cobro
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </ProtectedRoute> 
  );
}