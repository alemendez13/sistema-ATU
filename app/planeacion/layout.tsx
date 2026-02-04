"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Presentation, // Para Introducción
  ShieldCheck,  // Para Roles
  Scale,        // Para Fundamentos (Misión/Visión)
  ScanEye,      // Para FODA
  Target        // Para OKRs
} from "lucide-react";

export default function PlaneacionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Definimos tus 5 sub-módulos estratégicos
  const tabs = [
    { 
      name: "Introducción", 
      href: "/planeacion/introduccion", 
      icon: <Presentation size={18} />,
      exact: true 
    },
    { 
      name: "Roles y Autoridad", 
      href: "/planeacion/roles", 
      icon: <ShieldCheck size={18} /> 
    },
    { 
      name: "Fundamentos", 
      href: "/planeacion/fundamentos", 
      icon: <Scale size={18} /> 
    },
    { 
      name: "FODA", 
      href: "/planeacion/foda", 
      icon: <ScanEye size={18} /> 
    },
    { 
      name: "Tablero OKR's", 
      href: "/planeacion/tablero-okr", 
      icon: <Target size={18} /> 
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      {/* Encabezado del Módulo */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planeación Estratégica</h1>
        <p className="text-slate-500 text-sm">Sistema de Gestión y Metas Corporativas (SANSCE v2)</p>
      </div>

      {/* Barra de Navegación Interna (Pestañas) */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }
                `}
              >
                <span className={`transition-transform group-hover:scale-110 ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                  {tab.icon}
                </span>
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Aquí se renderizará el contenido de cada sub-página */}
      <div className="min-h-[500px] bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        {children}
      </div>
    </div>
  );
}