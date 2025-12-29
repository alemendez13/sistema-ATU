"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Uso de alias @/
import CorteDia from "@/components/finanzas/CorteDia";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Operacion } from "@/types";
import Link from "next/link";

export default function FinanzasPage() {
  const [pendientes, setPendientes] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    setLoading(true);
    try {
      // Búsqueda de operaciones pendientes
      const q = query(
        collection(db, "operaciones"), 
        where("estatus", "==", "Pendiente de Pago")
      );
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Operacion[];

      setPendientes(docs);
    } catch (error) {
      console.error("Error cargando finanzas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCobrar = async (id: string, metodo: string) => {
    if(!confirm(`¿Confirmas recibir el pago en ${metodo}?`)) return;

    setProcesandoId(id);
    try {
      const docRef = doc(db, "operaciones", id);
      await updateDoc(docRef, {
        estatus: "Pagado",
        metodoPago: metodo,
        fechaPago: serverTimestamp() 
      });
      cargarPendientes();
    } catch (error) {
      console.error("Error al cobrar:", error);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER CON SUB-NAVBAR M8 */}
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

          {/* TABLA DE PENDIENTES (INTEGRIDAD TOTAL) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-red-600">🔴 Cuentas por Cobrar</h2>
                {/* REINSTALACIÓN: Badge de conteo */}
                <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                    {pendientes.length} Pendientes
                </span>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400 animate-pulse">Buscando deudas...</div>
            ) : pendientes.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                    <p className="text-5xl mb-4">🎉</p>
                    <p className="font-medium text-slate-500">¡Todo al día! No hay cobros pendientes.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 font-bold uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="p-4">Paciente</th>
                                <th className="p-4">Servicio</th>
                                <th className="p-4">Responsable</th> {/* REINSTALADA */}
                                <th className="p-4">Monto</th>
                                <th className="p-4">Fecha</th> {/* REINSTALADA */}
                                <th className="p-4 text-center">Acción (Cobrar)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendientes.map((op) => (
                                <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{op.pacienteNombre}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-100">
                                            {op.servicioNombre}
                                        </span>
                                    </td>
                                    {/* REINSTALADA: Lógica de médico */}
                                    <td className="p-4 text-xs text-slate-400 italic">
                                        {op.doctorNombre || "N/A"}
                                    </td>
                                    <td className="p-4 font-mono text-base font-bold text-slate-900">
                                        ${op.monto}
                                    </td>
                                    {/* REINSTALADA: Lógica de fecha formateada */}
                                    <td className="p-4 text-[10px] text-slate-400 font-mono">
                                        {op.fecha?.seconds ? new Date(op.fecha.seconds * 1000).toLocaleDateString() : 'Hoy'}
                                    </td>
                                    <td className="p-4">
                                        {procesandoId === op.id ? (
                                            <div className="text-center text-slate-400 text-xs italic">Registrando...</div>
                                        ) : (
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleCobrar(op.id!, 'Efectivo')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-green-200 transition-colors">💵 EFEC.</button>
                                                <button onClick={() => handleCobrar(op.id!, 'Tarjeta')} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-200 transition-colors">💳 TARJ.</button>
                                                {/* REINSTALADA: Botón Transferencia */}
                                                <button onClick={() => handleCobrar(op.id!, 'Transferencia')} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-purple-200 transition-colors">🏦 TRANSF.</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute> 
  );
}