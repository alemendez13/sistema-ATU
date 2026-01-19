"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";

export default function CorteDia() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔒 ESTRATEGIA: Rango de tiempo estricto (00:00 a 23:59 de HOY)
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    // 1. Escuchar INGRESOS (Estrictamente Pagados HOY)
    const qIngresos = query(
      collection(db, "operaciones"),
      where("estatus", "in", ["Pagado", "Pagado (Cortesía)"]),
      where("fechaPago", ">=", inicioDia),
      where("fechaPago", "<=", finDia), // 🛡️ Bloqueo de fechas futuras o errores
      orderBy("fechaPago", "desc")
    );

    // 2. Escuchar GASTOS (Estrictamente de HOY)
    const qGastos = query(
      collection(db, "gastos"),
      where("fecha", ">=", inicioDia),
      where("fecha", "<=", finDia),
      orderBy("fecha", "desc")
    );

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

    const sumarPorMetodo = (arr: any[], metodoDeseado: string) => 
    arr.reduce((acc, curr) => {
        // 1. Si la operación tiene desglose (Pago Mixto)
        if (curr.desglosePagos && Array.isArray(curr.desglosePagos)) {
            const parcial = curr.desglosePagos
                .filter((p: any) => p.metodo === metodoDeseado)
                .reduce((a: number, c: any) => a + c.monto, 0);
            return acc + parcial;
        }
        // 2. Si es un pago tradicional (Efectivo, Tarjeta, etc.)
        return acc + (curr.metodoPago === metodoDeseado ? (curr.montoPagado || 0) : 0);
    }, 0);

  // 2. Mantenimiento de variables originales para el reporte
  const totalVendido    = sumarMonto(ingresos);
  const efectivoEntrada = sumarPorMetodo(ingresos, 'Efectivo');
  const efectivoPS = sumarPorMetodo(ingresos, 'Efectivo PS');
  // Usamos .includes() para capturar 'TPV MP', 'TPV Cred MP', 'TPV DebMP', etc.
  const tpvMP = ingresos.reduce((acc, curr) => {
      if (curr.desglosePagos) {
          // Suma las partes de MP dentro de un pago mixto
          return acc + curr.desglosePagos
              .filter((p: any) => p.metodo.includes('MP'))
              .reduce((a: number, c: any) => a + c.monto, 0);
      }
      // Suma pagos directos
      return acc + (curr.metodoPago?.includes('MP') ? (curr.montoPagado || 0) : 0);
  }, 0);

  const tpvBAN = ingresos.reduce((acc, curr) => {
      if (curr.desglosePagos) {
          // Suma las partes de BANORTE dentro de un pago mixto
          return acc + curr.desglosePagos
              .filter((p: any) => p.metodo.includes('BAN'))
              .reduce((a: number, c: any) => a + c.monto, 0);
      }
      return acc + (curr.metodoPago?.includes('BAN') ? (curr.montoPagado || 0) : 0);
  }, 0);
  const dineroBanco = totalVendido - efectivoEntrada - efectivoPS;
  const totalGastos     = sumarMonto(gastos);
  const balanceCaja     = efectivoEntrada - totalGastos;

  if (loading) return <div className="p-4 text-center text-slate-400">Calculando corte...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      
      {/* Tarjeta 1: Ventas Totales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">HOY</div>
        <p className="text-xs font-bold text-slate-400 uppercase">Ventas Totales</p>
        <p className="text-2xl font-bold text-slate-800">${totalVendido.toFixed(2)}</p>
        {/* Desglose visual actualizado */}
        <div className="mt-2 text-[10px] text-slate-500 flex flex-col gap-1">
            <div className="flex justify-between"><span>💳 Banco:</span> <span>${dineroBanco.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>💵 Caja Recep:</span> <span>${efectivoEntrada.toFixed(2)}</span></div>
            {/* ✅ Mostramos explícitamente cuánto tienen los médicos */}
            <div className="flex justify-between text-indigo-600 font-bold">
                <span>👨‍⚕️ Efectivo PS:</span> 
                <span>${efectivoPS.toFixed(2)}</span>
            </div>
        </div>

        {/* 📊 MINI-DESGLOSE TÉCNICO DE TERMINALES */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            <div className="flex justify-between pr-2 border-r border-slate-100">
                <span className="text-sky-600">MP:</span>
                <span className="text-slate-700">${tpvMP.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pl-2">
                <span className="text-emerald-700">BAN:</span>
                <span className="text-slate-700">${tpvBAN.toFixed(2)}</span>
            </div>
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