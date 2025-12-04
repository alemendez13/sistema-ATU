"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function CorteDia() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Definir el inicio del día (00:00 hrs)
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    // 1. Escuchar INGRESOS (Pagados hoy)
    const qIngresos = query(
      collection(db, "operaciones"),
      where("estatus", "==", "Pagado"),
      where("fechaPago", ">=", inicioDia),
      orderBy("fechaPago", "desc")
    );

    // 2. Escuchar GASTOS (De hoy)
    const qGastos = query(
      collection(db, "gastos"),
      where("fecha", ">=", inicioDia),
      orderBy("fecha", "desc")
    );

    // Suscripciones en tiempo real
    const unsubscribeIngresos = onSnapshot(qIngresos, (snap) => {
      setIngresos(snap.docs.map(d => d.data()));
    });

    const unsubscribeGastos = onSnapshot(qGastos, (snap) => {
      setGastos(snap.docs.map(d => d.data()));
      setLoading(false);
    });

    return () => {
      unsubscribeIngresos();
      unsubscribeGastos();
    };
  }, []);

  // --- CÁLCULOS MATEMÁTICOS ---
  // Función auxiliar para limpiar precios
  const limpiarPrecio = (precio: any) => {
      if (typeof precio === 'number') return precio;
      if (!precio) return 0;
      return parseFloat(precio.toString().replace(/[$,]/g, '')) || 0;
  };

  // 1. Total Ingresos (Todo)
  const totalVendido = ingresos.reduce((acc, curr) => acc + limpiarPrecio(curr.monto), 0);

  // 2. Ingresos Efectivo
  const efectivoEntrada = ingresos
    .filter(i => i.metodoPago === 'Efectivo')
    .reduce((acc, curr) => acc + limpiarPrecio(curr.monto), 0);

  // 3. Ingresos Digitales (Lo que va al banco directo)
const dineroBanco = totalVendido - efectivoEntrada;

  // 4. Total Gastos
  const totalGastos = gastos.reduce((acc, curr) => acc + limpiarPrecio(curr.monto), 0);

  // 5. EL GRAN TOTAL (Lo que debe haber físicamente)
  const balanceCaja = efectivoEntrada - totalGastos;

  if (loading) return <div className="p-4 text-center text-slate-400">Calculando corte...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      
      {/* Tarjeta 1: Ventas Totales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase">Ventas Totales</p>
        <p className="text-2xl font-bold text-slate-800">${totalVendido.toFixed(2)}</p>
        <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>💳 Banco: ${dineroBanco.toFixed(2)}</span>
            <span>💵 Efec: ${efectivoEntrada.toFixed(2)}</span>
        </div>
      </div>

      {/* Tarjeta 2: Salidas (Gastos) */}
      <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
        <p className="text-xs font-bold text-red-400 uppercase">Salidas (Gastos)</p>
        <p className="text-2xl font-bold text-red-600">-${totalGastos.toFixed(2)}</p>
        <p className="text-xs text-red-400 mt-1">{gastos.length} movimientos</p>
      </div>

      {/* Tarjeta 3: BALANCE FINAL (La más importante) */}
      <div className="md:col-span-2 bg-slate-800 p-4 rounded-xl shadow-lg text-white flex justify-between items-center">
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">💰 Efectivo en Caja (Arqueo)</p>
            <p className="text-3xl font-bold">${balanceCaja.toFixed(2)}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
            <p>Entradas Efec: +${efectivoEntrada}</p>
            <p>Salidas Efec: -${totalGastos}</p>
            <div className="border-t border-slate-600 mt-1 pt-1 font-bold text-white">
                Total: ${balanceCaja}
            </div>
        </div>
      </div>

    </div>
  );
}