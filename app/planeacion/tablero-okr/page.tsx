"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
interface UserData {
  email: string | null;
  uid: string;
}
import { fetchOkrDataAction } from "@/lib/actions"; // El puente que creamos
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement 
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { AlertCircle, ArrowUp, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";

// 1. REGISTRO DE GRÁFICAS (Obligatorio en React)
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function TableroOkrPage() {
  // Le decimos a TS: "Confía en mí, esto devuelve un UserData"
  const { user } = useAuth() as { user: UserData | null };
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. EFECTO: Carga de datos al entrar
  useEffect(() => {
    async function loadData() {
      if (!user?.email) return;

      try {
        setLoading(true);
        // Llamamos al Server Action (Puente)
        const okrTree = await fetchOkrDataAction(user.email);
        
        if (!okrTree || okrTree.length === 0) {
          toast.warning("No se encontraron OKRs asignados a tu perfil.");
        }
        setData(okrTree);
      } catch (error) {
        console.error("Error cargando OKRs:", error);
        toast.error("Error de conexión con Google Sheets");
      } finally {
        setLoading(false);
      }
    }

    if (user) loadData();
  }, [user]);

  // 3. RENDERIZADO DE CARGA
  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 text-slate-400">
        <RefreshCw className="animate-spin h-10 w-10 text-blue-500" />
        <p className="text-sm font-medium">Sincronizando con Google Sheets...</p>
      </div>
    );
  }

  // 4. RENDERIZADO VACÍO
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <Target className="mb-2 h-10 w-10 opacity-20" />
        <p>No tienes Objetivos asignados o visibles.</p>
      </div>
    );
  }

  // 5. RENDERIZADO PRINCIPAL (El Tablero)
  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      
      {/* BUCLE DE OBJETIVOS (Nivel 1) */}
      {data.map((obj: any) => (
        <section key={obj.Objective_ID} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          
          {/* ENCABEZADO DEL OBJETIVO */}
          <div 
            className="flex items-center justify-between border-b px-6 py-4"
            style={{ borderLeft: `6px solid ${obj.Color || '#3b82f6'}` }}
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">{obj.Nombre}</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Objetivo Estratégico</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              <span className="text-xs font-bold text-slate-600">Avance Global:</span>
              <span className={`text-sm font-black ${getScoreColor(obj.Promedio)}`}>
                {obj.Promedio}%
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 p-6">
            {/* BUCLE DE RESULTADOS CLAVE (Nivel 2) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {obj.ResultadosClave.map((kr: any) => (
                <div key={kr.KR_ID} className="flex flex-col rounded-xl bg-white p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                  
                  {/* Título del KR */}
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 line-clamp-2" title={kr.Nombre_KR}>
                      {kr.Nombre_KR}
                    </h3>
                    {/* Badge de Promedio KR */}
                    <span className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${getBadgeColor(kr.KR_Average)}`}>
                      {kr.KR_Average}%
                    </span>
                  </div>

                  {/* BUCLE DE KPIs (Nivel 3 - Gráficas) */}
                  <div className="mt-auto space-y-4 divide-y divide-slate-100">
                    {kr.KPIs.map((kpi: any) => (
                      <div key={kpi.KPI_ID} className="pt-4 first:pt-0">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500 truncate max-w-[70%]">
                            {kpi.NombreKPI}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {kpi.latestValue} <span className="text-[9px] text-slate-400 font-normal">/ {kpi.Meta_Anual || 'N/A'}</span>
                          </span>
                        </div>
                        
                        {/* RENDERIZADO CONDICIONAL DE GRÁFICA */}
                        <div className="h-24 w-full relative">
                           {/* Usamos una gráfica de barra simple para representar el progreso del KPI individual */}
                           <KpiProgressBar progress={kpi.progress} history={kpi.history} color={obj.Color} />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      
      <div className="text-center text-xs text-slate-300">
        Datos sincronizados en tiempo real desde SANSCE Google Sheets
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES VISUALES ---

// Helper para colores de texto según calificación
function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

// Helper para badges de fondo
function getBadgeColor(score: number) {
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// Componente Mini-Gráfica (Reemplaza al Gauge complejo por limpieza visual)
function KpiProgressBar({ progress, history, color }: { progress: number, history: any[], color: string }) {
  // Datos para Chart.js
  const data = {
    labels: history.map((h: any) => h.Periodo),
    datasets: [
      {
        label: 'Desempeño',
        data: history.map((h: any) => parseFloat(h.Valor)),
        backgroundColor: color || '#3b82f6',
        borderRadius: 4,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        enabled: true,
        backgroundColor: '#1e293b',
        padding: 8,
        titleFont: { size: 10 },
        bodyFont: { size: 10 }
      }
    },
    scales: {
      x: { display: false }, // Ocultamos ejes para diseño limpio "Sparkline"
      y: { display: false, min: 0 }
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-end">
       {/* 1. Barra de progreso acumulado */}
       <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Progreso Anual</span>
          <span>{Math.round(progress)}%</span>
       </div>
       <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000" 
            style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color || '#3b82f6' }}
          />
       </div>

       {/* 2. Mini Histograma (Sparkline) de los periodos */}
       <div className="h-10 w-full opacity-50">
          <Bar data={data} options={options} />
       </div>
    </div>
  );
}