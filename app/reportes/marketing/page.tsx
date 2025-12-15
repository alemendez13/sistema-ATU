"use client";
import { useState } from "react"; // Quitamos useEffect
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Colores para la gráfica
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function ReporteMarketingPage() {
  // Fechas por defecto: Mes actual
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [dataGrafica, setDataGrafica] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reporteGenerado, setReporteGenerado] = useState(false); // Estado para controlar visualización

  const cargarReporte = async () => {
    setLoading(true);
    setPacientes([]);
    setDataGrafica([]);

    try {
      // Ajuste de fechas para cubrir el día completo
      const start = new Date(`${fechaInicio}T00:00:00`);
      const end = new Date(`${fechaFin}T23:59:59`);

      // Consultamos pacientes registrados en ese rango
      // 🛡️ PROTECCIÓN: Agregamos limit(1000) para evitar desastres si seleccionan un rango muy amplio
      const q = query(
        collection(db, "pacientes"),
        where("fechaRegistro", ">=", start),
        where("fechaRegistro", "<=", end),
        orderBy("fechaRegistro", "desc"),
        limit(1000) 
      );

      const snapshot = await getDocs(q);
      
      const conteo: Record<string, number> = {};
      const listaPacientes: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // 1. Procesar para la Tabla
        listaPacientes.push({
            id: doc.id,
            nombre: data.nombreCompleto,
            medio: data.medioMarketing || "No especificado",
            referido: data.referidoPor || "-",
            fecha: data.fechaRegistro?.seconds 
                ? new Date(data.fechaRegistro.seconds * 1000).toLocaleDateString('es-MX')
                : "S/F"
        });

        // 2. Procesar para la Gráfica (Agrupación)
        const origen = data.medioMarketing || "No especificado";
        conteo[origen] = (conteo[origen] || 0) + 1;
      });

      // Transformar objeto conteo a array para Recharts
      const datosChart = Object.keys(conteo).map(key => ({
        name: key,
        value: conteo[key]
      })).sort((a, b) => b.value - a.value); // Ordenar del más popular al menos

      setPacientes(listaPacientes);
      setDataGrafica(datosChart);
      setReporteGenerado(true);

      if (listaPacientes.length === 0) {
        toast.info("No se encontraron nuevos pacientes en este periodo.");
      } else if (listaPacientes.length === 1000) {
        toast.warning("⚠️ Se alcanzó el límite de 1000 registros. Acorta el rango de fechas para ver todo.");
      }

    } catch (error: any) {
      console.error("Error marketing:", error);
      if (error.message && error.message.includes("Quota")) {
        toast.error("Límite de lectura excedido. Intenta mañana.");
      } else {
        toast.error("Error generando reporte. Verifica índices.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ❌ ELIMINADO: useEffect ya no ejecuta la carga automática al entrar.
  // useEffect(() => {
  //   cargarReporte();
  // }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/reportes" className="text-slate-500 hover:text-blue-600 font-bold text-xl">
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Origen de Pacientes</h1>
              <p className="text-sm text-slate-500">Análisis de efectividad de canales de marketing</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
             <div className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="w-full md:w-auto flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
                 <div className="w-full md:w-auto flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-2 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
                 <button 
                    onClick={cargarReporte} 
                    disabled={loading} 
                    className={`font-bold py-2 px-6 rounded-lg w-full md:w-auto h-[42px] transition-all ${
                        loading ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                    }`}
                 >
                    {loading ? "Analizando..." : "📊 Generar Análisis"}
                 </button>
             </div>
             <p className="text-[10px] text-slate-400 mt-2 text-right">* Protegido: Máximo 1000 registros por consulta.</p>
          </div>

          {!reporteGenerado && !loading ? (
             <div className="text-center py-20 border-2 border-dashed border-slate-300 rounded-xl bg-slate-100">
                <p className="text-4xl mb-2">📈</p>
                <p className="text-slate-500 font-medium">Selecciona un rango de fechas y presiona "Generar Análisis"</p>
             </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* COLUMNA IZQUIERDA: GRÁFICA */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4">Distribución por Canal</h3>
                    <div className="h-80 w-full">
                        {dataGrafica.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataGrafica} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" name="Pacientes" radius={[0, 4, 4, 0]} barSize={30}>
                                        {dataGrafica.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 italic">
                                Sin datos para graficar
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: KPI RESUMEN */}
                <div className="space-y-4">
                    <div className="bg-blue-600 p-6 rounded-xl shadow-md text-white">
                        <p className="text-blue-100 text-sm font-bold uppercase">Nuevos Pacientes</p>
                        <p className="text-4xl font-extrabold mt-2">{pacientes.length}</p>
                        <p className="text-xs text-blue-200 mt-1">Registrados en el periodo</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[240px] overflow-y-auto">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 border-b pb-2">Top Canales</h4>
                        <ul className="space-y-3">
                            {dataGrafica.map((item, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                                        <span className="text-slate-600">{item.name}</span>
                                    </span>
                                    <span className="font-bold text-slate-800">{item.value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

              </div>

              {/* TABLA DETALLADA */}
              <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                 <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Detalle de Registros</h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{pacientes.length} registros</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-4 py-3">Fecha Registro</th>
                                <th className="px-4 py-3">Nombre Paciente</th>
                                <th className="px-4 py-3">Medio / Canal</th>
                                <th className="px-4 py-3">Referido Por</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pacientes.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.fecha}</td>
                                    <td className="px-4 py-3 font-bold text-slate-700">{p.nombre}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                                            {p.medio}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 italic">{p.referido}</td>
                                </tr>
                            ))}
                            {pacientes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay datos en este rango.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
              </div>
            </>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}