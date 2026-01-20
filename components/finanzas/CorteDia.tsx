"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";

export default function CorteDia() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 1. Obtenemos el usuario y le decimos a TypeScript que sea flexible (as any)
  const { user } = useAuth() as any; 
  
  // 2. Definimos la lista de correos permitidos
  const admins = ["administracion@sansce.com", "alejandra.mendez@sansce.com"];
  
  // 3. Verificamos: ¿Existe usuario? Y ¿Su correo está en la lista?
  const esAdmin = user?.email && admins.includes(user.email);

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
  // 🛠️ FUNCIÓN DE SUMA ROBUSTA (Corregida para el problema de los ceros)
  const calcularTotal = (arr: any[], filtro?: string) => {
    return arr.reduce((acc, curr) => {
        let montoItem = 0;
        
        // 1. Determinar el monto real de este ítem (Priorizamos 'montoPagado')
        const valorBase = (curr.montoPagado !== undefined && curr.montoPagado !== null) 
            ? Number(curr.montoPagado) 
            : Number(curr.monto);
        
        // 2. Lógica de filtrado
        if (!filtro) {
            montoItem = valorBase;
        } else {
            // A. Revisar desglose (Pagos Mixtos)
            if (curr.desglosePagos && Array.isArray(curr.desglosePagos) && curr.desglosePagos.length > 0) {
                montoItem = curr.desglosePagos
                    .filter((p: any) => p.metodo && p.metodo.includes(filtro))
                    .reduce((a: number, c: any) => a + (Number(c.monto) || 0), 0);
            } 
            // B. Revisar pago simple (Flexible con .includes)
            else if (curr.metodoPago && curr.metodoPago.includes(filtro)) {
                montoItem = valorBase;
            }
        }
        
        return acc + (isNaN(montoItem) ? 0 : montoItem);
    }, 0);
  };

  const totalVendido = calcularTotal(ingresos); 
  const totalGastos = calcularTotal(gastos);
  
  // Filtros flexibles: "Efectivo" suma tanto Recepción como PS
  const efectivo = calcularTotal(ingresos, "Efectivo");
  const tpvMP = calcularTotal(ingresos, "MP");   // Atrapa Cred y Deb MP
  const tpvBAN = calcularTotal(ingresos, "BAN"); // Atrapa Cred y Deb BAN
  
  const dineroBanco = totalVendido - efectivo;
  const balanceCaja = efectivo - totalGastos;

  if (loading) return <div className="p-4 text-center text-slate-400">Calculando corte...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      
      {/* Tarjeta 1: Ventas Totales (CON CANDADO DE PRIVACIDAD) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">HOY</div>
        
        {esAdmin ? (
          /* --- VISTA DE ADMINISTRADOR (MEJORADA) --- */
          <>
            <p className="text-xs font-bold text-slate-400 uppercase">Ventas Totales</p>
            <p className="text-2xl font-bold text-slate-800">${totalVendido.toFixed(2)}</p>
            
            <div className="mt-2 text-[10px] text-slate-500 flex flex-col gap-1">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>💵 Efectivo (Recep + PS):</span> 
                    <span className="font-bold text-slate-700">${efectivo.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-sky-50 px-2 py-1 rounded">
                        <span className="block text-sky-600 font-bold">MP</span>
                        <span className="block text-slate-700">${tpvMP.toFixed(2)}</span>
                    </div>
                    <div className="bg-red-50 px-2 py-1 rounded">
                        <span className="block text-red-600 font-bold">BANORTE</span>
                        <span className="block text-slate-700">${tpvBAN.toFixed(2)}</span>
                    </div>
                </div>
            </div>
          </>
        ) : (

          /* --- VISTA DE RECEPCIÓN (SOLO VE SU CAJA) --- */
          <>
            <p className="text-xs font-bold text-slate-400 uppercase">💵 Efectivo en Caja</p>
            <p className="text-3xl font-bold text-blue-600 mt-2 mb-2">${efectivo.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 italic">Total cobrado en efectivo por recepción el día de hoy.</p>
          </>
        )}
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
            <p>Entradas Efec: +${efectivo.toFixed(2)}</p>
            <p>Salidas Efec: -${totalGastos}</p>
            <div className="border-t border-slate-600 mt-1 pt-1 font-bold text-white">
                Total: ${balanceCaja}
            </div>
        </div>
      </div>

    </div>
  );
}