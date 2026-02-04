/* app/planeacion/tablero-okt/page.tsx */
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
import { AlertCircle, ArrowUp, RefreshCw, Target, ChevronDown, ChevronUp, User, Layers, Activity, X, Filter } from "lucide-react";
import { toast } from "sonner";

// 1. REGISTRO DE GRÁFICAS (Obligatorio en React)
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function TableroOkrPage() {
  // Le decimos a TS: "Confía en mí, esto devuelve un UserData"
  const { user } = useAuth() as { user: UserData | null };
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Estado para el Modal de KPI (La "Burbuja")
  const [selectedKpi, setSelectedKpi] = useState<any>(null);

  // --- FILTROS INTELIGENTES ---
  const [filterResponsable, setFilterResponsable] = useState<string>('all');
  const [filterProceso, setFilterProceso] = useState<string>('all');

  // 1. Extraemos las opciones únicas para los selectores (dropdowns)
  const responsablesUnicos = Array.from(new Set(data.flatMap(obj => obj.ResultadosClave.flatMap((kr: any) => kr.KPIs.map((k: any) => k.Responsable))))).filter(Boolean).sort();
  const procesosUnicos = Array.from(new Set(data.flatMap(obj => obj.ResultadosClave.flatMap((kr: any) => kr.KPIs.map((k: any) => k.Proceso))))).filter(Boolean).sort();

  // 2. El "Motor de Filtrado": Crea una copia limpia de los datos según los filtros
  const filteredData = data.map((obj: any) => {
      // Filtramos los KRs
      const krsFiltrados = obj.ResultadosClave.map((kr: any) => {
          // Filtramos los KPIs dentro del KR
          const kpisFiltrados = kr.KPIs.filter((kpi: any) => {
              const matchResp = filterResponsable === 'all' || kpi.Responsable === filterResponsable;
              const matchProc = filterProceso === 'all' || kpi.Proceso === filterProceso;
              return matchResp && matchProc;
          });
          return { ...kr, KPIs: kpisFiltrados };
      }).filter((kr: any) => kr.KPIs.length > 0); // Si el KR se queda sin KPIs, lo ocultamos

      return { ...obj, ResultadosClave: krsFiltrados };
  }).filter((obj: any) => obj.ResultadosClave.length > 0); // Si el Objetivo se queda sin KRs, lo ocultamos

  const toggleAccordion = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id) // Si está abierto, lo cerramos
        : [...prev, id] // Si está cerrado, lo abrimos
    );
  };

  // 2. EFECTO: Carga de datos al entrar
  useEffect(() => {
    async function loadData() {
      if (!user?.email) return;

      try {
        setLoading(true);
        // Llamamos al Server Action (Puente)
        const rawTree = await fetchOkrDataAction(user.email);
        
        if (!rawTree || rawTree.length === 0) {
          toast.warning("No se encontraron OKRs asignados a tu perfil.");
        }

        // --- PATCH: Auto-Cálculo de Metas Faltantes ---
        // Si el catálogo no tiene Meta Anual, sumamos las metas mensuales del historial
        const smartTree = rawTree.map((obj: any) => ({
          ...obj,
          ResultadosClave: obj.ResultadosClave.map((kr: any) => ({
            ...kr,
            KPIs: kr.KPIs.map((kpi: any) => {
              // 1. Limpiamos la meta actual para ver si es válida (quita $, %, comas)
              const metaActual = parseFloat(String(kpi.Meta_Anual || 0).replace(/[^0-9.-]+/g,""));
              
              // 2. Si ya tiene meta, la dejamos intacta. Si es 0/NaN, calculamos.
              if (metaActual > 0) return kpi;

              // 3. Sumamos todas las metas mensuales definidas en 'history'
              const sumaMetas = kpi.history.reduce((acc: number, h: any) => {
                  const val = parseFloat(String(h.Meta || 0).replace(/[^0-9.-]+/g,""));
                  return acc + (isNaN(val) ? 0 : val);
              }, 0);

              if (sumaMetas > 0) {
                 // ¡Encontramos metas mensuales! Actualizamos el KPI.
                 // Formateamos bonito (ej. 12000 -> "12,000")
                 const nuevaMetaStr = sumaMetas.toLocaleString('es-MX', { maximumFractionDigits: 2 });
                 
                 // Recalculamos el progreso visual (Valor Actual / Nueva Meta Sumada)
                 const nuevoProgreso = (kpi.latestValue / sumaMetas) * 100;

                 return { 
                   ...kpi, 
                   Meta_Anual: nuevaMetaStr, 
                   progress: nuevoProgreso 
                 };
              }
              
              return kpi; // Si tampoco hay metas mensuales, se queda igual
            })
          }))
        }));
        // --- FIN PATCH ---

        setData(smartTree);
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
      
      {/* --- BARRA DE HERRAMIENTAS Y FILTROS --- */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="flex items-center gap-2 text-slate-500">
            <Filter size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Filtrar Tablero</span>
         </div>
         
         <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Selector de Responsable */}
            <select 
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="text-sm border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 bg-slate-50 min-w-[150px]"
            >
              <option value="all">Todos los Responsables</option>
              {responsablesUnicos.map((resp: any) => <option key={resp} value={resp}>{resp}</option>)}
            </select>

            {/* Selector de Proceso */}
            <select 
              value={filterProceso}
              onChange={(e) => setFilterProceso(e.target.value)}
              className="text-sm border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 bg-slate-50 min-w-[150px]"
            >
              <option value="all">Todos los Procesos</option>
              {procesosUnicos.map((proc: any) => <option key={proc} value={proc}>{proc}</option>)}
            </select>
            
            {/* Botón de Limpiar */}
            {(filterResponsable !== 'all' || filterProceso !== 'all') && (
               <button 
                 onClick={() => { setFilterResponsable('all'); setFilterProceso('all'); }}
                 className="text-xs font-bold text-red-600 hover:text-red-800 underline px-2"
               >
                 Borrar Filtros
               </button>
            )}
         </div>
      </div>

      {/* BUCLE DE OBJETIVOS (Nivel 1) */}
      {filteredData.map((obj: any) => {
        const isOpen = expandedIds.includes(obj.Objective_ID);
        
        return (
          <section key={obj.Objective_ID} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
            
            {/* ENCABEZADO DEL OBJETIVO (Ahora es clicable) */}
            <div 
              onClick={() => toggleAccordion(obj.Objective_ID)}
              className="flex items-center justify-between border-b px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ borderLeft: `6px solid ${obj.Color || '#3b82f6'}` }}
            >
              <div className="flex items-center gap-4">
                {/* Icono de Flecha Dinámico */}
                <div className="text-slate-400">
                  {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
                
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{obj.Nombre}</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Objetivo Estratégico</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                <span className="text-xs font-bold text-slate-600">Avance:</span>
                <span className={`text-sm font-black ${getScoreColor(obj.Promedio)}`}>
                  {obj.Promedio}%
                </span>
              </div>
            </div>

            {/* CONTENIDO (Solo se muestra si isOpen es true) */}
            {isOpen && (
              <div className="bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-300">
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

                      {/* BUCLE DE KPIs (Ahora como Tarjetas Interactivas) */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {kr.KPIs.map((kpi: any) => (
                        <div 
                          key={kpi.KPI_ID} 
                          onClick={(e) => { 
                            e.stopPropagation(); // Evita que el acordeón se cierre al dar clic aquí
                            setSelectedKpi({ ...kpi, color: obj.Color }); // Pasamos el color del objetivo
                          }} 
                          className="cursor-pointer rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-white hover:shadow-md transition-all group relative overflow-hidden"
                        >
                          {/* Barra de color lateral decorativa */}
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: obj.Color || '#cbd5e1' }}></div>

                          <div className="pl-2">
                            <div className="flex items-start justify-between mb-2">
                               <h4 className="text-xs font-bold text-slate-700 line-clamp-2 leading-tight pr-2" title={kpi.NombreKPI}>
                                 {kpi.NombreKPI}
                               </h4>
                               <Activity size={14} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
                            </div>
                            
                            <div className="flex flex-wrap gap-2 items-center mt-2">
                              {/* Badge de Nivel */}
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getLevelBadgeStyle(kpi.Tipo)}`}>
                                 <Layers size={10} /> {kpi.Tipo || 'KPI'}
                              </span>
                              {/* Responsable */}
                              <span className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500 font-medium truncate max-w-[100px]">
                                 <User size={10} /> {kpi.Responsable || 'Sin asignar'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
      
      <div className="text-center text-xs text-slate-300">
        Datos sincronizados en tiempo real desde SANSCE Google Sheets
      </div>
      {selectedKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedKpi(null)}>
          <div 
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()} // Para no cerrar si das clic dentro de la tarjeta
          >
             {/* Encabezado Modal */}
             <div className="mb-6 flex items-start justify-between pr-8">
                <div>
                   <span className="mb-1 inline-block text-[10px] font-bold uppercase tracking-widest text-slate-400">Detalle del Indicador</span>
                   <h3 className="text-xl font-bold text-slate-900 leading-snug">{selectedKpi.NombreKPI}</h3>
                   <p className="mt-1 text-xs text-slate-500">{selectedKpi.Descripcion || 'Sin descripción disponible.'}</p>
                </div>
                <button onClick={() => setSelectedKpi(null)} className="absolute top-4 right-4 rounded-full bg-slate-100 p-2 hover:bg-slate-200 transition-colors">
                   <X size={20} className="text-slate-600" />
                </button>
             </div>
             
             {/* Datos Numéricos Destacados */}
             <div className="mb-6 flex items-baseline gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Valor Actual</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{selectedKpi.latestValue}</span>
                </div>
                <span className="text-xl text-slate-300 font-light">/</span>
                <div className="flex flex-col">
                   <span className="text-xs text-slate-400 font-semibold uppercase">Meta Anual</span>
                   <span className="text-xl font-bold text-slate-500">{selectedKpi.Meta_Anual}</span>
                </div>
             </div>

             {/* La Gráfica (Reutilizada, pero ahora en grande) */}
             <div className="h-64 w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
                 <KpiProgressBar progress={selectedKpi.progress} history={selectedKpi.history} color={selectedKpi.color} />
             </div>

             {/* NUEVO: Ficha Técnica del Catálogo (Desplegable) */}
             <details className="mt-4 group rounded-lg border border-slate-200 bg-white open:ring-1 open:ring-blue-100 transition-all">
                <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg select-none">
                   <div className="flex items-center gap-2">
                      <Layers size={14} />
                      <span>VER FICHA TÉCNICA DEL INDICADOR</span>
                   </div>
                   <span className="transition-transform group-open:rotate-180 text-slate-400">
                      <ChevronDown size={16} />
                   </span>
                </summary>
                
                {/* Rejilla de Datos del Catálogo */}
                <div className="grid grid-cols-2 gap-4 p-4 pt-2 text-xs text-slate-600 sm:grid-cols-4 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                   <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Frecuencia</p>
                      <p className="mt-1 font-semibold text-slate-800 capitalize">{selectedKpi.Frecuencia || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Proceso Origen</p>
                      <p className="mt-1 font-semibold text-slate-800">{selectedKpi.Proceso || 'General'}</p>
                   </div>
                   <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Método de Cálculo</p>
                      <p className="mt-1 font-semibold text-slate-800">{selectedKpi.MetodoAgregacion || 'Último Valor'}</p>
                   </div>
                   <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">ID Sistema</p>
                      <p className="mt-1 font-mono text-slate-400 bg-white border border-slate-200 rounded px-1 inline-block">
                        {selectedKpi.KPI_ID}
                      </p>
                   </div>

                   {/* NUEVO: Descripción completa del KPI */}
                   <div className="col-span-2 sm:col-span-4 mt-2 border-t border-slate-200 pt-2">
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Descripción Técnica / Objetivo del Indicador</p>
                      <p className="mt-1 font-medium text-slate-600 text-sm italic leading-relaxed">
                        "{selectedKpi.Descripcion || 'Sin descripción disponible en el catálogo.'}"
                      </p>
                   </div>
                </div>
             </details>
          </div>
        </div>
      )}
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

// Helper para estilos de badges de nivel
function getLevelBadgeStyle(tipo: string) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('estrat')) return "bg-purple-100 text-purple-700";
  if (t.includes('táctico') || t.includes('tactico')) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600"; // Operativo o Default
}