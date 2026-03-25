//app/operacion/v4-gestion/page.tsx
import { fetchTareasV4Action } from '@/lib/actions';
import { HierarchicalProvider } from '@/components/v4/core/HierarchicalProvider';
import MainViewSwitcher from '@/app/operacion/v4-gestion/MainViewSwitcher';

export const revalidate = 60; // Actualización automática cada minuto

export default async function GestionV4Page() {
  // 1. Obtención de datos desde el servidor (Google Sheets)
  const tasks = await fetchTareasV4Action();

  return (
    <HierarchicalProvider initialTasks={tasks}>
      <div className="h-full flex flex-col">
        {/* 🏛️ CABECERA ESTRATÉGICA SANSCE OS */}
        <header className="bg-sansce-surface border-b border-sansce-border px-8 py-6 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-sansce-text tracking-tight">
              Torre de Control <span className="text-sansce-brand italic">v4.0</span>
            </h1>
            <p className="text-[10px] text-sansce-muted font-black uppercase tracking-[0.2em] mt-1">
              Gobernanza Operativa • SANSCE OS
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
             <div className="text-right border-l border-sansce-bg pl-6">
                <p className="text-[9px] font-black text-sansce-muted uppercase tracking-widest mb-1">Estado de Red</p>
                <p className="text-[11px] font-bold text-emerald-500 flex items-center justify-end bg-emerald-50/50 px-3 py-1 rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                  Sincronizado
                </p>
             </div>
          </div>
        </header>

        {/* CONTENEDOR DE VISTAS DINÁMICAS */}
        <div className="flex-1 relative overflow-hidden">
          <MainViewSwitcher />
        </div>
      </div>
    </HierarchicalProvider>
  );
}