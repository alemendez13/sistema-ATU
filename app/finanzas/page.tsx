"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import CorteDia from "../../components/finanzas/CorteDia";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Operacion } from "../../types";

export default function FinanzasPage() {
  const [pendientes, setPendientes] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // 1. Cargar las deudas al abrir la página
  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    setLoading(true);
    try {
      // Buscamos en Firebase todo lo que diga "Pendiente de Pago"
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

  // 2. Función para COBRAR (Cerrar la transacción)
  const handleCobrar = async (id: string, metodo: string) => {
    if(!confirm(`¿Confirmas recibir el pago en ${metodo}?`)) return;

    setProcesandoId(id);
    try {
      const docRef = doc(db, "operaciones", id);
      
      await updateDoc(docRef, {
        estatus: "Pagado",
        metodoPago: metodo,
        fechaPago: serverTimestamp() // Guardamos la hora exacta del cobro
      });

      alert("💰 ¡Cobro registrado exitosamente!");
      cargarPendientes(); // Recargamos la lista para que desaparezca el pagado
    } catch (error) {
      console.error("Error al cobrar:", error);
      alert("Error al procesar el cobro.");
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col items-start gap-2">
        <a href="/" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
           <span>←</span> Volver
        </a>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Caja y Finanzas</h1>
          <p className="text-slate-500">Corte del día y registro de movimientos.</p>
        </div>
      </header>

        {/* 👇 AQUÍ SE INSERTA EL COMPONENTE VISUAL 👇 */}
        <CorteDia />

        {/* BOTÓN DE ACCESO A CAJA CHICA */}
        <div className="flex justify-end mb-6">
            <a href="/finanzas/gastos" className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg font-bold hover:bg-red-100 flex items-center gap-2">
                📉 Registrar Gasto / Salida
            </a>
        </div>

        {/* TABLA DE PENDIENTES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-red-600">🔴 Cuentas por Cobrar</h2>
                <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                    {pendientes.length} Pendientes
                </span>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Buscando deudas...</div>
            ) : pendientes.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <p className="text-4xl mb-2">🎉</p>
                    <p>¡Todo al día! No hay cobros pendientes.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 font-bold">
                            <tr>
                                <th className="p-4">Paciente</th>
                                <th className="p-4">Servicio</th>
                                <th className="p-4">Responsable</th>
                                <th className="p-4">Monto</th>
                                <th className="p-4">Fecha Registro</th>
                                <th className="p-4 text-center">Acción (Cobrar)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendientes.map((op) => (
                                <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{op.pacienteNombre}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">
                                            {op.servicioNombre}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 italic">
                                        {op.doctorNombre || "N/A"}
                                    </td>
                                    <td className="p-4 font-mono text-lg font-bold text-slate-900">
                                        {op.monto}
                                    </td>
                                    <td className="p-4 text-xs text-slate-400">
                                        {op.fecha?.seconds ? new Date(op.fecha.seconds * 1000).toLocaleDateString() : 'Hoy'}
                                    </td>
                                    <td className="p-4">
                                        {procesandoId === op.id ? (
                                            <span className="text-slate-400 italic">Procesando...</span>
                                        ) : (
                                            <div className="flex justify-center gap-2">
                                                {/* Botón Efectivo */}
<button 
    onClick={() => handleCobrar(op.id!, 'Efectivo')} // <--- AGREGA EL ! AQUÍ
    className="..."
>
    💵 Efectivo
</button>

{/* Botón Tarjeta */}
<button 
    onClick={() => handleCobrar(op.id!, 'Tarjeta')} // <--- AGREGA EL ! AQUÍ
    className="..."
>
    💳 Tarjeta
</button>

{/* Botón Transferencia */}
<button 
    onClick={() => handleCobrar(op.id!, 'Transferencia')} // <--- AGREGA EL ! AQUÍ
    className="..."
>
    🏦 Transf.
</button>
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