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
  QueryConstraint,
} from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import SubNavbarGestion from "@/components/SubNavbarGestion";
import { toast } from "sonner";

interface OperacionItem {
  id: string;
  fechaCita: string;
  fechaPago: string;
  pacienteNombre: string;
  elaboradoPor: string;
  servicioNombre: string;
  servicioSku: string;
  doctorNombre: string;
}

type ModoConsulta = "fechaCita" | "fechaPago";

const BATCH_SIZE = 50;

const formatearFechaCita = (fechaCita: unknown): string => {
  if (!fechaCita) return "—";
  if (typeof fechaCita === "string") return fechaCita;
  const ts = fechaCita as { seconds?: number; toDate?: () => Date };
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString("en-CA");
  }
  if (ts.toDate) {
    return ts.toDate().toLocaleDateString("en-CA");
  }
  return String(fechaCita);
};

const formatearFechaPago = (fechaPago: unknown): string => {
  if (!fechaPago) return "—";
  const ts = fechaPago as { seconds?: number; toDate?: () => Date };
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString("es-MX");
  }
  if (ts.toDate) {
    return ts.toDate().toLocaleString("es-MX");
  }
  return String(fechaPago);
};

const fechaPagoEnRango = (
  fechaPago: unknown,
  inicio: string,
  fin: string
): boolean => {
  if (!fechaPago) return false;
  const ts = fechaPago as { seconds?: number; toDate?: () => Date };
  let iso = "";
  if (ts.seconds) {
    iso = new Date(ts.seconds * 1000).toISOString().split("T")[0];
  } else if (ts.toDate) {
    iso = ts.toDate().toISOString().split("T")[0];
  } else {
    return false;
  }
  return iso >= inicio && iso <= fin;
};

const fechaCitaEnRango = (
  fechaCita: unknown,
  inicio: string,
  fin: string
): boolean => {
  const normalizada = formatearFechaCita(fechaCita);
  if (normalizada === "—") return false;
  return normalizada >= inicio && normalizada <= fin;
};

export default function ConciliacionPagosPage() {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [citaInicio, setCitaInicio] = useState(primerDia);
  const [citaFin, setCitaFin] = useState(ultimoDia);
  const [pagoInicio, setPagoInicio] = useState(primerDia);
  const [pagoFin, setPagoFin] = useState(ultimoDia);
  const [filtrarPorCita, setFiltrarPorCita] = useState(true);
  const [filtrarPorPago, setFiltrarPorPago] = useState(false);

  const [operaciones, setOperaciones] = useState<OperacionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);

  const mapearDocumento = (docSnap: any): OperacionItem => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      fechaCita: formatearFechaCita(data.fechaCita),
      fechaPago: formatearFechaPago(data.fechaPago),
      pacienteNombre: data.pacienteNombre || "Sin nombre",
      elaboradoPor: data.elaboradoPor || "—",
      servicioNombre: data.servicioNombre || "—",
      servicioSku: data.servicioSku || "—",
      doctorNombre: data.doctorNombre || "—",
    };
  };

  const aplicarFiltroSecundario = (docs: any[], modo: ModoConsulta) => {
    if (modo === "fechaCita" && filtrarPorPago) {
      return docs.filter((doc) =>
        fechaPagoEnRango(doc.data().fechaPago, pagoInicio, pagoFin)
      );
    }
    if (modo === "fechaPago" && filtrarPorCita) {
      return docs.filter((doc) =>
        fechaCitaEnRango(doc.data().fechaCita, citaInicio, citaFin)
      );
    }
    return docs;
  };

  const ejecutarConciliacion = async (isLoadMore = false) => {
    if (!filtrarPorCita && !filtrarPorPago) {
      toast.error("Activa al menos un filtro: Fecha de Cita o Fecha de Pago.");
      return;
    }

    const modo: ModoConsulta =
      filtrarPorPago && !filtrarPorCita ? "fechaPago" : "fechaCita";

    setLoading(true);

    if (!isLoadMore) {
      setOperaciones([]);
      setLastVisible(null);
    }

    try {
      const constraints: QueryConstraint[] = [];

      if (modo === "fechaCita") {
        constraints.push(
          where("fechaCita", ">=", citaInicio),
          where("fechaCita", "<=", citaFin),
          orderBy("fechaCita", "desc")
        );
      } else {
        const inicio = new Date(`${pagoInicio}T00:00:00`);
        const fin = new Date(`${pagoFin}T23:59:59.999`);
        constraints.push(
          where("fechaPago", ">=", inicio),
          where("fechaPago", "<=", fin),
          orderBy("fechaPago", "desc")
        );
      }

      constraints.push(limit(BATCH_SIZE));

      let q = query(collection(db, "operaciones"), ...constraints);

      if (isLoadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const docsFiltrados = aplicarFiltroSecundario(snapshot.docs, modo);
      const lista = docsFiltrados.map(mapearDocumento);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      setLastVisible(lastDoc);
      setHasMore(snapshot.docs.length === BATCH_SIZE);
      setOperaciones((prev) => (isLoadMore ? [...prev, ...lista] : lista));

      if (!isLoadMore) {
        if (lista.length === 0) {
          toast.info("No se encontraron operaciones con los criterios seleccionados.");
        } else {
          toast.success(`Se encontraron ${lista.length} operaciones.`);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(
        "Error al consultar operaciones. Verifica que exista el índice de Firestore para el rango seleccionado."
      );
    } finally {
      setLoading(false);
    }
  };

  const descargarCSV = () => {
    const headers =
      "Fecha Cita,Fecha Pago,Paciente,Elaborado Por,Servicio,SKU,Doctor\n";
    const rows = operaciones
      .map(
        (op) =>
          `"${op.fechaCita}","${op.fechaPago}","${op.pacienteNombre}","${op.elaboradoPor}","${op.servicioNombre}","${op.servicioSku}","${op.doctorNombre}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Conciliacion_Operaciones_${citaInicio}_${citaFin}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Sistema de Gestión
        </span>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Conciliación de Pagos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Consulta la colección de operaciones por rango de fecha de cita y/o fecha de pago.
        </p>
      </div>

      <SubNavbarGestion />

      <div className="bg-blue-50 p-5 rounded-xl mb-6 border border-blue-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filtrarPorCita}
                onChange={(e) => setFiltrarPorCita(e.target.checked)}
                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-blue-700 uppercase">
                Rango de Fecha de Cita
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={citaInicio}
                  disabled={!filtrarPorCita}
                  onChange={(e) => setCitaInicio(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={citaFin}
                  disabled={!filtrarPorCita}
                  onChange={(e) => setCitaFin(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filtrarPorPago}
                onChange={(e) => setFiltrarPorPago(e.target.checked)}
                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-blue-700 uppercase">
                Rango de Fecha de Pago
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={pagoInicio}
                  disabled={!filtrarPorPago}
                  onChange={(e) => setPagoInicio(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={pagoFin}
                  disabled={!filtrarPorPago}
                  onChange={(e) => setPagoFin(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => ejecutarConciliacion(false)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-400 transition-all shadow-md active:scale-95"
          >
            {loading ? "Consultando..." : "Iniciar Conciliación"}
          </button>
        </div>
      </div>

      {operaciones.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <p className="text-xs text-slate-400 uppercase font-bold">Operaciones encontradas</p>
          <p className="text-2xl font-bold text-blue-600">{operaciones.length}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">
            Resultados de Conciliación ({operaciones.length})
          </h3>
          {operaciones.length > 0 && (
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
                <th className="p-3 whitespace-nowrap">Fecha de la Cita</th>
                <th className="p-3 whitespace-nowrap">Fecha de Pago</th>
                <th className="p-3">Nombre del Paciente</th>
                <th className="p-3">Elaboró el Registro</th>
                <th className="p-3">Nombre del Servicio</th>
                <th className="p-3">SKU del Servicio</th>
                <th className="p-3">Nombre del Doctor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operaciones.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {op.fechaCita}
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {op.fechaPago}
                  </td>
                  <td className="p-3 font-medium">{op.pacienteNombre}</td>
                  <td className="p-3 text-xs text-slate-600">{op.elaboradoPor}</td>
                  <td className="p-3 text-slate-700">{op.servicioNombre}</td>
                  <td className="p-3 font-mono text-xs text-blue-700">{op.servicioSku}</td>
                  <td className="p-3 text-slate-600">{op.doctorNombre}</td>
                </tr>
              ))}
              {operaciones.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                    Configura el rango de fechas de cita y/o pago e inicia la conciliación.
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
        * Consulta la colección <strong>operaciones</strong> de Firestore. Si activas ambos
        filtros, se cruza el rango secundario sobre los resultados del rango principal.
      </p>
    </div>
  );
}
