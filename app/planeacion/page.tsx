// ARCHIVO: app/planeacion/page.tsx
"use client";
import React, { useState } from 'react';
import { Target, Eye, Star, Map, Edit3, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PlaneacionEstrategica() {
  // Estado para simular la edición (en el futuro conectará a Firebase)
  const [isEditing, setIsEditing] = useState(false);

  // Datos del Recorrido del Usuario (Basado en MG-Recorrido del usuario)
  const userSteps = [
    { id: 1, etapa: "Contacto Inicial", desc: "Primer contacto vía WhatsApp o Conmutador", status: "completado" },
    { id: 2, etapa: "Agendamiento", desc: "Registro en Agenda Google / CRM ATU", status: "completado" },
    { id: 3, etapa: "Recepción", desc: "Llegada a clínica y apertura de expediente", status: "actual" },
    { id: 4, etapa: "Consulta Clínica", desc: "Atención por profesional de la salud", status: "pendiente" },
    { id: 5, etapa: "Cierre y Pago", desc: "Liquidación en caja y seguimiento", status: "pendiente" },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      {/* Encabezado */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-light text-gray-800 uppercase tracking-widest">Módulo 2: Planeación</h1>
          <div className="h-1 w-20 bg-[#78c9cf] mt-2"></div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#78c9cf] transition-colors"
        >
          <Edit3 size={16} /> {isEditing ? "GUARDAR CAMBIOS" : "EDITAR INFORMACIÓN"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECCIÓN: IDENTIDAD (Misión, Visión, Valores) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#78c9cf]">
            <div className="flex items-center gap-3 mb-4 text-[#78c9cf]">
              <Target size={20} />
              <h2 className="font-bold text-gray-700 uppercase text-xs tracking-tighter">Misión</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              "Brindar servicios de salud integrales con un enfoque humano y profesional, 
              garantizando la excelencia en cada proceso administrativo y clínico."
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-300">
            <div className="flex items-center gap-3 mb-4 text-gray-400">
              <Eye size={20} />
              <h2 className="font-bold text-gray-700 uppercase text-xs tracking-tighter">Visión</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              "Ser el referente líder en gestión clínica digital, transformando la experiencia 
              del paciente a través de la innovación y la calidez humana."
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#78c9cf]">
            <div className="flex items-center gap-3 mb-4 text-[#78c9cf]">
              <Star size={20} />
              <h2 className="font-bold text-gray-700 uppercase text-xs tracking-tighter">Valores Core</h2>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2 italic">• Ética Profesional</li>
              <li className="flex items-center gap-2 italic">• Innovación Constante</li>
              <li className="flex items-center gap-2 italic">• Empatía con el Usuario</li>
            </ul>
          </div>
        </div>

        {/* SECCIÓN: RECORRIDO DEL USUARIO (Visual) */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-xl shadow-sm h-full">
            <div className="flex items-center gap-3 mb-8">
              <Map className="text-[#78c9cf]" size={24} />
              <h2 className="text-xl font-light text-gray-800">Recorrido del Usuario (Service Blueprint)</h2>
            </div>

            <div className="relative">
              {/* Línea conectora */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100 lg:left-0 lg:top-1/2 lg:w-full lg:h-0.5 lg:-translate-y-1/2"></div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 relative">
                {userSteps.map((step, index) => (
                  <div key={step.id} className="relative flex flex-col items-start lg:items-center text-left lg:text-center group">
                    {/* Indicador de Círculo */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 mb-4 transition-all ${
                      step.status === 'completado' ? 'bg-[#78c9cf] text-white' : 
                      step.status === 'actual' ? 'bg-white border-2 border-[#78c9cf] text-[#78c9cf] scale-110 shadow-md' : 
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {step.status === 'completado' ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{index + 1}</span>}
                    </div>
                    
                    <h3 className={`text-xs font-bold uppercase mb-1 ${step.status === 'actual' ? 'text-[#78c9cf]' : 'text-gray-700'}`}>
                      {step.etapa}
                    </h3>
                    <p className="text-[11px] text-gray-500 px-2 leading-tight">
                      {step.desc}
                    </p>

                    {/* Flecha visual entre pasos (solo desktop) */}
                    {index < userSteps.length - 1 && (
                      <div className="hidden lg:block absolute top-4 -right-2 text-gray-200">
                        <ArrowRight size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Zona de Metas e Indicadores Rápidos */}
            <div className="mt-12 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Meta Mensual</span>
                <p className="text-2xl font-light text-gray-700">120 <span className="text-sm">Pacientes Nuevos</span></p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Satisfacción</span>
                <p className="text-2xl font-light text-[#78c9cf]">98% <span className="text-sm text-gray-700">NPS</span></p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}