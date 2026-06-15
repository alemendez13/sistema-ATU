/* app/configuracion/conciliacion-pagos/page.tsx */

"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
} from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import SubNavbarGestion from "@/components/SubNavbarGestion";
import { toast } from "sonner";
import { cleanPrice, formatCurrency } from "@/lib/utils";

interface PagoItem {
  id: string;
  fechaPago: string;
  folioPaciente: string;
  pacienteNombre: string;
  servicioNombre: string;
  servicioSku: string;
  monto: number;
  montoOriginal: number;
  metodoPago: string;
  estatus: string;
  doctorNombre: string;
  elaboradoPor: string;
}

const BATCH_SIZE = 50;

export default function ConciliacionPagosPage() {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  const [pagos, setPagos] = useState<PagoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totales, setTotales] = useState({
    cobrado: 0,
    operaciones: 0,
    porMetodo: {} as Record<string, number>,
  });

  const formatearFechaPago = (fechaPago: any): string => {
    if (!fechaPago) return "S/F";
    if (fechaPago.seconds) {
      return new Date(fechaPago.seconds * 1000).toLocaleString("es-MX");
    }
    if (fechaPago.toDate) {
      return fechaPago.toDate().toLocaleString("es-MX");
    }
    return String(fechaPago);
  };

  const mapearDocumento = (docSnap: any): PagoItem => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      fechaPago: formatearFechaPago(data.fechaPago),
      folioPaciente: data.folioPaciente || "—",
      pacienteNombre: data.pacienteNombre || "Sin nombre",
      servicioNombre: data.servicioNombre || "—",
      servicioSku: data.servicioSku || "—",
      monto: cleanPrice(data.monto),
      montoOriginal: cleanPrice(data.montoOriginal),
      metodoPago: data.metodoPago || "No especificado",
      estatus: data.estatus || "—",
      doctorNombre: data.doctorNombre || "—",
      elaboradoPor: data.elaboradoPor || "—",
    };
  };

  const acumularTotales = (
    items: PagoItem[],
    base: { cobrado: number; operaciones: number; porMetodo: Record<string, number> }
  ) => {
    const porMetodo = { ...base.porMetodo };
    let cobrado = base.cobrado;

    items.forEach((item) => {
      cobrado += item.monto;
      const metodo = item.metodoPago;
      porMetodo[metodo] = (porMetodo[metodo] || 0) + item.monto;
    });

    return {
      cobrado,
      operaciones: base.operaciones + items.length,
      porMetodo,
    };
  };

  const ejecutarConciliacion = async (isLoadMore = false) => {
    setLoading(true);

    if (!isLoadMore) {
      setPagos([]);
      setTotales({ cobrado: 0, operaciones: 0, porMetodo: {} });
      setLastVisible(null);
    }

    try {
      const inicio = new Date(`${fechaInicio}T00:00:00`);
      const fin = new Date(`${fechaFin}T23:59:59.999`);

      let q = query(
        collection(db, "operaciones"),
        where("estatus", "in", ["Pagado", "Pagado (Cortesía)"]),
        where("fechaPago", ">=", inicio),
        where("fechaPago", "<=", fin),
        orderBy("fechaPago", "desc"),
        limit(BATCH_SIZE)
      );

      if (isLoadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty && !isLoadMore) {
        toast.info("No se encontraron pagos en este periodo.");
        setLoading(false);
        return;
      }

      const lista = snapshot.docs.map(mapearDocumento);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      setLastVisible(lastDoc);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
      setPagos((prev) => (isLoadMore ? [...prev, ...lista] : lista));
      setTotales((prev) =>
        acumularTotales(lista, isLoadMore ? prev : { cobrado: 0, operaciones: 0, porMetodo: {} })
      );

      if (!isLoadMore) {
        toast.success(`Se encontraron ${lista.length} operaciones.`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al consultar la conciliación de pagos.");
    } finally {
      setLoading(false);
    }
  };

  const descargarCSV = () => {
    const headers =
      "Fecha Pago,Folio,Paciente,Servicio,SKU,Monto,Monto Original,Método,Estatus,Médico,Elaborado Por\n";
    const rows = pagos
      .map(
        (p) =>
          `"${p.fechaPago}","${p.folioPaciente}","${p.pacienteNombre}","${p.servicioNombre}","${p.servicioSku}",${p.monto},${p.montoOriginal},"${p.metodoPago}","${p.estatus}","${p.doctorNombre}","${p.elaboradoPor}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Conciliacion_Pagos_${fechaInicio}_${fechaFin}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Sistema de Gestión
        </span>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Conciliación de Pagos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cruce de operaciones cobradas en un periodo específico.
        </p>
      </div>

      <SubNavbarGestion />

      <div className="bg-blue-50 p-5 rounded-xl mb-6 flex flex-col md:flex-row gap-4 items-end border border-blue-200 shadow-sm">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
            Desde
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="block w-full rounded-lg border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="block w-full rounded-lg border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => ejecutarConciliacion(false)}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-400 transition-all shadow-md active:scale-95 w-full md:w-auto"
        >
          {loading ? "Consultando..." : "Iniciar Conciliación"}
        </button>
      </div>

      {pagos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-bold">Total Cobrado</p>
            <p className="text-2xl font-bold text-slate-800">
              {formatCurrency(totales.cobrado)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-bold">Operaciones</p>
            <p className="text-2xl font-bold text-blue-600">{totales.operaciones}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 uppercase font-bold mb-2">
              Por Método de Pago
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {Object.entries(totales.porMetodo).map(([metodo, monto]) => (
                <div key={metodo} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate mr-2">{metodo}</span>
                  <span className="font-bold text-slate-800">{formatCurrency(monto)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">
            Operaciones Conciliadas ({pagos.length})
          </h3>
          {pagos.length > 0 && (
            <button
              onClick={descargarCSV}
              className="text-xs text-green-600 font-bold hover:underline"
            >
              Descargar CSV
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold sticky top-0">
              <tr>
                <th className="p-3">Fecha Pago</th>
                <th className="p-3">Folio</th>
                <th className="p-3">Paciente</th>
                <th className="p-3">Servicio</th>
                <th className="p-3">Método</th>
                <th className="p-3">Estatus</th>
                <th className="p-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                    {p.fechaPago}
                  </td>
                  <td className="p-3 text-xs font-medium text-blue-700">
                    {p.folioPaciente}
                  </td>
                  <td className="p-3 font-medium">{p.pacienteNombre}</td>
                  <td className="p-3 text-xs text-slate-600">
                    {p.servicioNombre}
                    <div className="text-[10px] text-slate-400">{p.servicioSku}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
                      {p.metodoPago}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{p.estatus}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">
                    {formatCurrency(p.monto)}
                    {p.montoOriginal > 0 && p.monto !== p.montoOriginal && (
                      <div className="text-[10px] text-slate-400 line-through">
                        {formatCurrency(p.montoOriginal)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {pagos.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                    Selecciona un rango de fechas e inicia la conciliación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-6 bg-slate-50/30 flex justify-center border-t border-slate-100">
            <button
              onClick={() => ejecutarConciliacion(true)}
              disabled={loading}
              className="bg-white border-2 border-slate-200 text-slate-500 px-10 py-2 rounded-xl text-xs font-black hover:border-blue-500 hover:text-blue-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Cargar más operaciones"}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        * Incluye operaciones con estatus &quot;Pagado&quot; y &quot;Pagado (Cortesía)&quot; según
        fecha de pago.
      </p>
    </div>
  );
}
