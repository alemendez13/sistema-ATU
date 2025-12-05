/* app/reportes/conciliacion-lab/ConciliacionClient.tsx */
"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Link from "next/link";
import { toast } from "sonner";
import Button from "../../../components/ui/Button";

interface ReporteItem {
  id: string;
  fecha: string;
  paciente: string;
  estudio: string;
  sku: string;
  precioVenta: number;
  costoProveedor: number;
  utilidad: number;
  esDomicilio: boolean;
}

export default function ConciliacionClient({ catalogo }: { catalogo: any[] }) {
  // Fechas (Default: Mes actual)
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  
  const [movimientos, setMovimientos] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ venta: 0, costo: 0, utilidad: 0 });

  const generarConciliacion = async () => {
    setLoading(true);
    setMovimientos([]);
    setTotales({ venta: 0, costo: 0, utilidad: 0 });

    try {
      const start = new Date(`${fechaInicio}T00:00:00`);
      const end = new Date(`${fechaFin}T23:59:59`);

      // 1. Traer todo lo cobrado en el periodo
      const q = query(
        collection(db, "operaciones"),
        where("estatus", "==", "Pagado"),
        where("fechaPago", ">=", start),
        where("fechaPago", "<=", end),
        orderBy("fechaPago", "desc")
      );

      const snapshot = await getDocs(q);
      const listaTemp: ReporteItem[] = [];
      let sumVenta = 0;
      let sumCosto = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        const skuVenta = data.servicioSku || "";
        const nombreVenta = data.servicioNombre || "";
        
        // 2. CRUCE MÁGICO: Buscamos este ítem en el Catálogo de Laboratorio
        // Intentamos coincidir por SKU primero, si no, por Nombre
        const itemLab = catalogo.find(c => 
            (c.sku === skuVenta) || 
            (c.nombre.trim().toUpperCase() === nombreVenta.trim().toUpperCase())
        );

        // Si encontramos coincidencia en el catálogo de LAB, es un estudio. Si no, lo ignoramos.
        if (itemLab) {
            const precioReal = Number(data.monto) || 0;
            const costoReal = itemLab.costo || 0;
            const utilidad = precioReal - costoReal;

            sumVenta += precioReal;
            sumCosto += costoReal;

            // Detectar si fue domicilio (por si acaso el nombre lo dice)
            const esDomicilio = nombreVenta.toLowerCase().includes("domicilio");

            listaTemp.push({
                id: doc.id,
                fecha: data.fechaPago?.seconds ? new Date(data.fechaPago.seconds * 1000).toLocaleDateString() : "S/F",
                paciente: data.pacienteNombre,
                estudio: nombreVenta,
                sku: skuVenta,
                precioVenta: precioReal,
                costoProveedor: costoReal,
                utilidad: utilidad,
                esDomicilio
            });
        }
      });

      setMovimientos(listaTemp);
      setTotales({ venta: sumVenta, costo: sumCosto, utilidad: sumVenta - sumCosto });

      if (listaTemp.length === 0) {
          toast.info("No se encontraron estudios de laboratorio cobrados en este periodo.");
      } else {
          toast.success(`Se encontraron ${listaTemp.length} estudios.`);
      }

    } catch (error) {
      console.error(error);
      toast.error("Error calculando conciliación");
    } finally {
      setLoading(false);
    }
  };

  // Exportar a CSV (Simple para Excel)
  const descargarCSV = () => {
    const headers = "Fecha,Paciente,Estudio,Precio Venta,Costo Lab,Utilidad\n";
    const rows = movimientos.map(m => 
        `${m.fecha},"${m.paciente}","${m.estudio}",${m.precioVenta},${m.costoProveedor},${m.utilidad}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Conciliacion_Lab_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
            <Link href="/reportes" className="text-slate-400 hover:text-blue-600 text-2xl font-bold">←</Link>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Conciliación de Laboratorio</h1>
                <p className="text-slate-500">Auditoría de costos con proveedor externo</p>
            </div>
        </div>

        {/* CONTROLES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full border p-2 rounded" />
            </div>
            <Button onClick={generarConciliacion} isLoading={loading} className="w-full md:w-auto">
                🔍 Buscar Estudios
            </Button>
        </div>

        {/* TARJETAS DE RESUMEN */}
        {movimientos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-bold">Ventas Totales (Lab)</p>
                    <p className="text-2xl font-bold text-slate-800">${totales.venta.toLocaleString()}</p>
                </div>
                {/* ESTA ES LA TARJETA CLAVE PARA PAGARLE AL PROVEEDOR */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm">
                    <p className="text-xs text-orange-400 uppercase font-bold">A Pagar al Proveedor</p>
                    <p className="text-2xl font-bold text-orange-600">${totales.costo.toLocaleString()}</p>
                    <p className="text-[10px] text-orange-400">Base para factura del Lab</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
                    <p className="text-xs text-green-500 uppercase font-bold">Utilidad Bruta</p>
                    <p className="text-2xl font-bold text-green-700">${totales.utilidad.toLocaleString()}</p>
                </div>
            </div>
        )}

        {/* TABLA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-700">Desglose de Estudios ({movimientos.length})</h3>
                {movimientos.length > 0 && (
                    <button onClick={descargarCSV} className="text-xs text-green-600 font-bold hover:underline">
                        📥 Descargar Excel
                    </button>
                )}
            </div>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold sticky top-0">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Paciente</th>
                            <th className="p-3">Estudio</th>
                            <th className="p-3 text-right">Venta</th>
                            <th className="p-3 text-right bg-orange-100 text-orange-700">Costo</th>
                            <th className="p-3 text-right text-green-700">Ganancia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {movimientos.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-xs text-slate-400">{m.fecha}</td>
                                <td className="p-3 font-medium">{m.paciente}</td>
                                <td className="p-3">
                                    {m.estudio}
                                    {m.esDomicilio && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1 rounded">DOMICILIO</span>}
                                </td>
                                <td className="p-3 text-right font-bold">${m.precioVenta.toLocaleString()}</td>
                                <td className="p-3 text-right bg-orange-50 font-medium text-orange-700">${m.costoProveedor.toLocaleString()}</td>
                                <td className="p-3 text-right font-bold text-green-600">${m.utilidad.toLocaleString()}</td>
                            </tr>
                        ))}
                        {movimientos.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                    Selecciona un rango de fechas y busca para ver resultados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}