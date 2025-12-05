"use client";
import { usePDF } from "@react-pdf/renderer"; // Usamos el hook avanzado
import CartaResponsivaPDF from "../documents/CartaResponsivaPDF";
import { useEffect, useState } from "react";

export default function DownloadButton({ pacienteNombre, fecha }: { pacienteNombre: string, fecha: string }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const datosMock = {
    paciente: pacienteNombre,
    equipo: "HOLTER 24H - DRAGER",
    serie: "H-2024-001",
    fecha: fecha,
    folio: "R-001"
  };

  // Generamos la instancia del PDF manualmente
  const [instance, updateInstance] = usePDF({ document: <CartaResponsivaPDF {...datosMock} /> });

  if (!isClient) return <div className="text-gray-400 text-sm font-bold px-4 py-2">Cargando...</div>;

  // 🚨 AQUÍ ESTÁ EL DETECTIVE DE ERRORES
  if (instance.error) {
    console.error("Error generando PDF:", instance.error); // Mándalo a la consola
    return <div className="text-red-500 text-xs border border-red-200 p-2 rounded">Error en PDF: {instance.error.toString()}</div>;
  }

  if (instance.loading) {
    return <div className="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm font-bold cursor-wait">Generando documento...</div>;
  }

  // Si todo sale bien, mostramos el botón real con el link ya generado
  return (
    <a 
      href={instance.url || "#"} 
      download={`Carta_Responsiva_${pacienteNombre}.pdf`}
      className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 flex items-center gap-2 text-sm font-bold transition-all"
    >
      📄 Descargar Responsiva
    </a>
  );
}