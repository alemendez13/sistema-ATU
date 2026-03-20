//components/finanzas/CorteDia.tsx
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";

export default function CorteDia() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Control de visibilidad para los desgloses de cuentas
  const [verDetalles, setVerDetalles] = useState(false);
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
  // 🛠️ FUNCIÓN DE SUMA MULTICRITERIO (SANSCE OS)
  const calcularTotal = (arr: any[], filtro?: string, sucursalFiltro?: string) => {
    return arr.reduce((acc, curr) => {
        // 🛡️ FILTRO DE SUCURSAL: Si pedimos una sucursal específica, ignoramos el resto.
        if (sucursalFiltro && curr.sucursal !== sucursalFiltro) return acc;

        let montoItem = 0;
        
        // 1. Determinar el monto real (Vales y Cortesías siempre computan como $0 en flujo de caja)
        const esGastoCero = curr.metodoPago?.includes("Cortesía") || curr.metodoPago?.includes("Vale PS");
        
        const valorBase = esGastoCero ? 0 : (
            (curr.montoPagado !== undefined && curr.montoPagado !== null) 
                ? Number(curr.montoPagado) 
                : Number(curr.monto)
        );
        
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
  // 🛰️ Totales segregados por punto de venta
  const totalSatelite = calcularTotal(ingresos, undefined, "Satelite");
  const totalCentral = calcularTotal(ingresos, undefined, "Central");

  // --- NUEVA LÓGICA DE CAJA CHICA (Inyecciones vs Gastos) ---
  const sumaInyecciones = gastos
    .filter(g => g.tipo === "Ingreso")
    .reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);

  const sumaGastosReales = gastos
    .filter(g => g.tipo !== "Ingreso")
    .reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);

  // Mantenemos totalGastos para no romper la compatibilidad con el resto del archivo por ahora
  const totalGastos = sumaGastosReales; 
  
  // --- DESGLOSE DETALLADO DE MÉTODOS DE PAGO ---
  const efectivoTotal = calcularTotal(ingresos, "Efectivo"); // Suma total de cash
  const efecPS = calcularTotal(ingresos, "Efectivo PS");
  const efecRecep = efectivoTotal - efecPS; // Separamos para evitar duplicidad visual
  
  const tDebito = calcularTotal(ingresos, "Débito");
  const tCredito = calcularTotal(ingresos, "Crédito");
  const tAmex = calcularTotal(ingresos, "AMEX");
  const tTransfer = calcularTotal(ingresos, "Transferencia");
  
  // Desglose por terminal (Auditoría cruzada)
  const tpvMP = calcularTotal(ingresos, "MP");
  const tpvBAN = calcularTotal(ingresos, "BAN");
  const tpvCreditoBan = calcularTotal(ingresos, "TPV cred BAN");
  
  const dineroBanco = totalVendido - efectivoTotal;
  const diferenciaAuditoria = dineroBanco - (tTransfer + tpvMP + tpvBAN);

  if (esAdmin && Math.abs(diferenciaAuditoria) > 1) {
    console.warn("⚠️ ALERTA SANSCE: Hay montos en banco sin método específico: $", diferenciaAuditoria);
  }

  // 🛡️ INDEPENDENCIA SANSCE: Calculamos los saldos por separado (Sin mezclarlos)
  const saldoCajaChica = sumaInyecciones - sumaGastosReales;
  const efectivoVentas = efectivoTotal; // (Recepción + PS)

  if (loading) return <div className="p-4 text-center text-slate-400">Calculando corte...</div>;

  return (
    <div className="space-y-4 mb-8">
      
      {/* 1. RESUMEN EJECUTIVO (VENTAS VS OPERACIÓN SEPARADOS) */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center border-b-4 border-blue-600">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="border-r border-white/10 pr-6">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Efectivo Ventas (Caja A)</p>
            <p className="text-4xl font-black text-emerald-50">${efectivoVentas.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-1">Saldo Caja Chica (Caja B)</p>
            <p className="text-4xl font-black text-orange-50">${saldoCajaChica.toFixed(2)}</p>
          </div>
          
          {/* BOTÓN DE CONTROL DE VISIBILIDAD */}
          <button 
            onClick={() => setVerDetalles(!verDetalles)}
            className={`mt-2 md:mt-0 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all flex items-center gap-2 ${
              verDetalles ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {verDetalles ? '▲ Ocultar Desglose' : '▼ Ver Desglose de Cuentas'}
          </button>
        </div>

        <div className="mt-4 md:mt-0 text-right bg-white/5 p-3 rounded-xl border border-white/10">
          <p className="text-[10px] text-slate-400 uppercase font-bold mb-2 border-b border-white/10 pb-1">Validación Rápida</p>
          <div className="text-[11px] space-y-1">
            <p className="flex justify-between gap-8 text-slate-300"><span>Ventas Efec:</span> <span className="font-mono text-white">${efectivoTotal.toFixed(2)}</span></p>
            <p className="flex justify-between gap-8 text-slate-300"><span>Saldo Caja:</span> <span className="font-mono text-white">${(sumaInyecciones - sumaGastosReales).toFixed(2)}</span></p>
          </div>
        </div>
      </div>

      {/* 2. CUENTAS DETALLADAS (OCULTAS POR DEFECTO) */}
      {verDetalles && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* COLUMNA A: CUENTA DE VENTAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black text-blue-600 uppercase tracking-wider">🟢 Cuenta de Ventas</p>
            </div>
            <div className="border-b border-slate-50 pb-4 mb-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Ventas Totales (Bruto)</p>
                  <p className="text-3xl font-black text-slate-800">${totalVendido.toFixed(2)}</p>
                </div>
                
                {/* 🛰️ DESGLOSE POR SUCURSAL (SANSCE OS) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm animate-fade-in">
                    <span className="block text-[10px] text-blue-600 font-black uppercase tracking-widest">🛰️ Satélite</span>
                    <span className="text-lg font-black text-slate-700">${totalSatelite.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">🏥 Central</span>
                    <span className="text-lg font-black text-slate-700">${totalCentral.toFixed(2)}</span>
                  </div>
                </div>
            </div>

            {esAdmin && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[9px] text-emerald-600 font-bold uppercase">💵 Recepción</span>
                    <span className="text-sm font-bold text-slate-700">${efecRecep.toFixed(2)}</span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[9px] text-emerald-600 font-bold uppercase">🧠 Psicología</span>
                    <span className="text-sm font-bold text-slate-700">${efecPS.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Débito</span>
                    <span className="text-xs font-bold text-slate-700">${tDebito.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Crédito</span>
                    <span className="text-xs font-bold text-slate-700">${tCredito.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">AMEX</span>
                    <span className="text-xs font-bold text-slate-700">${tAmex.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                  <div className="col-span-2">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase mb-1 underline">Liquidación Bancaria</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-blue-600 font-bold uppercase tracking-tighter">Transferencias</span>
                    <span className="text-xs font-bold text-slate-700">${tTransfer.toFixed(2)}</span>
                  </div>
                  <div className="bg-orange-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-orange-600 font-bold uppercase tracking-tighter">TPV MP</span>
                    <span className="text-xs font-bold text-slate-700">${tpvMP.toFixed(2)}</span>
                  </div>
                  <div className="bg-red-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-red-600 font-bold uppercase tracking-tighter">TPV BAN</span>
                    <span className="text-xs font-bold text-slate-700">${tpvBAN.toFixed(2)}</span>
                  </div>
                  <div className="bg-red-50 p-2 rounded-lg">
                    <span className="block text-[9px] text-red-600 font-bold uppercase tracking-tighter">TPV Cred BAN</span>
                    <span className="text-xs font-bold text-slate-700">${tpvCreditoBan.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA B: CAJA CHICA */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-black text-orange-600 uppercase tracking-wider">🟠 Caja Chica</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 italic">Inyecciones (Ingresos):</span>
                  <span className="text-sm font-bold text-emerald-600">+${sumaInyecciones.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 italic">Gastos (Salidas):</span>
                  <span className="text-sm font-bold text-red-500">-${sumaGastosReales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center mt-4">
              <span className="text-xs font-bold text-slate-400 uppercase">Resultado Neto Operativo:</span>
              <span className={`text-lg font-black ${(sumaInyecciones - sumaGastosReales) >= 0 ? 'text-slate-700' : 'text-red-700'}`}>
                ${(sumaInyecciones - sumaGastosReales).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}