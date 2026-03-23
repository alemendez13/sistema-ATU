/* components/DashboardKPIs.tsx */
"use client";
import { useEffect, useState } from 'react';
// 👇 ESTA ES LA ÚNICA LÍNEA QUE CAMBIA (Agregamos getCountFromServer y limit)
import { collection, getDocs, query, where, getCountFromServer, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // 👈 ESTA SE QUEDA
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // 👈 ESTA SE QUEDA
import { useAuth } from "../../hooks/useAuth";

export default function DashboardKPIs() {
  const { user } = useAuth();
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [dataMarketing, setDataMarketing] = useState<any[]>([]);
  const [ingresosPorMedico, setIngresosPorMedico] = useState<any[]>([]); // <--- NUEVO ESTADO
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        // 1. KPI: Total de Pacientes (OPTIMIZADO: Solo pide el número, costo mínimo)
        const collPacientes = collection(db, "pacientes");
        const snapshotTotal = await getCountFromServer(collPacientes);
        setTotalPacientes(snapshotTotal.data().count);

        // 2. Gráfica: Origen de Marketing (Muestra de los últimos 100 registrados)
        // Esto evita descargar miles de datos viejos, manteniendo la app rápida.
        const qMarketing = query(collPacientes, limit(100)); 
        const snapshotMuestra = await getDocs(qMarketing);

        const conteoMarketing: Record<string, number> = {};
        snapshotMuestra.forEach(doc => {
          // Usamos "any" temporalmente aquí hasta que completemos el tipado estricto
          const data = doc.data() as any; 
          const fuente = data.medioMarketing || "Desconocido";
          conteoMarketing[fuente] = (conteoMarketing[fuente] || 0) + 1;
        });
        
        const marketingArray = Object.keys(conteoMarketing).map(key => ({
          name: key,
          value: conteoMarketing[key]
        }));
        setDataMarketing(marketingArray);

        // 3. KPI: Ingresos del Mes (Solo Pagados)
        const inicioMes = new Date();
        inicioMes.setDate(1); // Primer día del mes actual
        inicioMes.setHours(0,0,0,0);

        const qPagos = query(
          collection(db, "operaciones"),
          where("estatus", "==", "Pagado"),
          where("fecha", ">=", inicioMes)
        );
        
        const snapshotPagos = await getDocs(qPagos);
        
        let totalDinero = 0;
        const desgloseMedico: Record<string, number> = {};

        snapshotPagos.docs.forEach(doc => {
          const data = doc.data();
          const montoSucio = data.monto; 
          const montoLimpio = typeof montoSucio === 'string' 
            ? parseFloat(montoSucio.replace(/[$,]/g, '')) 
            : Number(montoSucio);
            
          if (!isNaN(montoLimpio)) {
            totalDinero += montoLimpio;

            // Agrupar por Médico (Extraemos el nombre del servicio "Consulta con...")
            // Si el servicio es "Consulta con Dr. Juan", extraemos "Dr. Juan"
            // Si es un producto genérico, lo ponemos en "Clínica / Farmacia"
            let nombreMedico = "Clínica / Farmacia";
            if (data.servicioNombre && data.servicioNombre.includes("Consulta con")) {
                nombreMedico = data.servicioNombre.replace("Consulta con ", "").trim();
            } else if (data.servicioSku === "CONSULTA") {
                nombreMedico = "Consultas Generales"; // Fallback
            }

            desgloseMedico[nombreMedico] = (desgloseMedico[nombreMedico] || 0) + montoLimpio;
          }
        });
        
        setIngresosMes(totalDinero);
        
        // Convertir objeto a array para la tabla
        const arrayMedicos = Object.keys(desgloseMedico).map(key => ({
            nombre: key,
            total: desgloseMedico[key]
        })).sort((a, b) => b.total - a.total); // Ordenar de mayor a menor venta

        setIngresosPorMedico(arrayMedicos);

      } catch (error: any) {
        // 4. EVITA MOSTRAR EL ERROR EN CONSOLA SI ES POR CIERRE DE SESIÓN
        if (error.code !== 'permission-denied') {
            console.error("Error cargando dashboard:", error);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando inteligencia de negocio...</div>;

  return (
    <div className="space-y-6 mb-10">
      
      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase">Pacientes Totales</p>
          <p className="text-4xl font-bold text-slate-800 mt-2">{totalPacientes}</p>
          <p className="text-xs text-green-600 mt-1">Expedientes activos</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase">Ingresos este Mes</p>
          <p className="text-4xl font-bold text-green-600 mt-2">${ingresosMes.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Cobros confirmados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICA MARKETING */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-6">Origen de Pacientes (Marketing)</h3>
            <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataMarketing}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Pacientes" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* TABLA DE INGRESOS POR MÉDICO (NUEVO) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">🏆 Producción por Médico (Mes Actual)</h3>
            <div className="overflow-y-auto max-h-64">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                        <tr>
                            <th className="px-4 py-2">Profesional / Área</th>
                            <th className="px-4 py-2 text-right">Total Generado</th>
                        </tr>
                    </thead>
                                <tbody className="divide-y divide-slate-100">
                    {ingresosPorMedico.length > 0 ? (
                        ingresosPorMedico.map((item, index) => (
                            // 👇 AQUÍ ABRE LA FILA
                            <tr key={index}> 
                                <td className="px-4 py-3 font-medium text-slate-700">{item.nombre}</td>
                                <td className="px-4 py-3 text-right font-bold text-green-600">${item.total.toFixed(2)}</td>
                            </tr> 
                            // 👆 ¡ESTO ES LO QUE FALTABA! (La etiqueta de cierre </tr>)
                        ))
                    ) : (
                        <tr>
                            <td colSpan={2} className="text-center py-4 text-slate-400">Sin movimientos este mes</td>
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