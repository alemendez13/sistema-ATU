// INICIO DEL ARCHIVO: app/configuracion/conocimiento/page.tsx
"use client";
import React, { useState } from 'react';
import { Pencil, Trash2, Plus, ExternalLink, FileText, AppWindow } from 'lucide-react';

// Datos iniciales basados en tu PDF GEC-FR-02
const initialDocs = [
  { id: 1, codigo: "GEC-FR-01", nombre: "Listado de documentos y conocimiento", edicion: "1", responsable: "Coordinación administrativa", modulo: "Módulo 1", estado: "Integrado" },
  { id: 2, codigo: "ATU-FR-02", nombre: "Calendario de Google", edicion: "0", responsable: "Auxiliar administrativa", modulo: "Módulo 4", estado: "App Externa" },
  { id: 3, codigo: "FIN-FR-05", nombre: "Caja chica", edicion: "0", responsable: "Coordinación administrativa", modulo: "Módulo 8", estado: "Documento" },
  { id: 4, codigo: "CLI-PR-MED-01", nombre: "Protocolo de medicina", edicion: "0", responsable: "Coordinación clínica", modulo: "Módulo 3", estado: "Documento" },
];

export default function ListadoConocimiento() {
  const [docs, setDocs] = useState(initialDocs);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-800">Listado de Conocimiento</h1>
          <p className="text-gray-500 mt-2 text-sm italic">Cerebro de codificación y versiones del sistema</p>
        </div>
        <button className="bg-[#78c9cf] hover:bg-[#65b1b7] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all shadow-sm">
          <Plus size={18} /> AGREGAR DOCUMENTO / CONTROL
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-medium">
              <th className="p-4 uppercase tracking-wider">Código</th>
              <th className="p-4 uppercase tracking-wider">Nombre del Documento</th>
              <th className="p-4 uppercase tracking-wider text-center">Ed.</th>
              <th className="p-4 uppercase tracking-wider text-center">Módulo</th>
              <th className="p-4 uppercase tracking-wider">Estado / Formato</th>
              <th className="p-4 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                <td className="p-4 font-semibold text-gray-700">{doc.codigo}</td>
                <td className="p-4 text-gray-600">{doc.nombre}</td>
                <td className="p-4 text-center text-gray-500">{doc.edicion}</td>
                <td className="p-4 text-center">
                   <span className="px-2 py-1 bg-gray-100 rounded text-[10px] text-gray-500 font-bold">{doc.modulo}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {doc.estado === "Integrado" && <span className="flex items-center gap-1 text-green-600 font-medium"><AppWindow size={14}/> Integrado</span>}
                    {doc.estado === "App Externa" && <span className="flex items-center gap-1 text-blue-500 font-medium"><ExternalLink size={14}/> App Externa</span>}
                    {doc.estado === "Documento" && <span className="flex items-center gap-1 text-orange-400 font-medium"><FileText size={14}/> Excel/Word</span>}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button className="text-[#78c9cf] hover:text-[#5fa3a8] p-1"><Pencil size={18} /></button>
                    <button className="text-red-300 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// FIN DEL ARCHIVO: app/configuracion/conocimiento/page.tsx