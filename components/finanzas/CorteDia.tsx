"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "@/lib/firebase-guard";
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
  where("estatus", "in", ["Pagado", "Pagado (Cortesía)"]), // 🎯 Ahora detecta ambos
  where("fechaPago", ">=", inicioDia),
  orderBy("fechaPago", "desc")
      // 💡 Nota: Si quieres agrupar también aquí por doctor, 
      // debes añadir orderBy("doctorNombre", "asc") y crear el índice.
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
    }, (error) => console.error("Error en Ingresos:", error));

    const unsubscribeGastos = onSnapshot(qGastos, (snap) => {
      setGastos(snap.docs.map(d => d.data()));
      setLoading(false);
    }, (error) => console.error("Error en Gastos:", error));

    return () => {
      unsubscribeIngresos();
      unsubscribeGastos();
    };
  }, []);

  // --- CÁLCULOS MATEMÁTICOS ---
  // Función para limpiar precios
  // 1. Definición de la función de suma técnica
  const sumarMonto = (arr: any[]) => 
    arr.reduce((acc, curr) => {
        // 🎯 Verificamos si existe el cobro final (montoPagado), incluso si es 0.
        // Si no existe (está pendiente), usamos el monto base de la cita.
        const valorFinal = (curr.montoPagado !== undefined && curr.montoPagado !== null) 
            ? Number(curr.montoPagado) 
            : Number(curr.monto);
            
        // Sumamos solo si es un número válido para evitar el error "NaN"
        return acc + (isNaN(valorFinal) ? 0 : valorFinal);
    }, 0);

  // 2. Mantenimiento de variables originales para el reporte
  const totalVendido    = sumarMonto(ingresos);
  const efectivoEntrada = sumarMonto(ingresos.filter(i => i.metodoPago === 'Efectivo'));
  const dineroBanco     = totalVendido - efectivoEntrada;
  const totalGastos     = sumarMonto(gastos);
  const balanceCaja     = efectivoEntrada - totalGastos;

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