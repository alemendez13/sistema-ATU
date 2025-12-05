"use client";
import { usePDF } from "@react-pdf/renderer";
import ReciboPagoPDF from "../documents/ReciboPagoPDF";
import { useEffect, useState } from "react";

interface BotonProps {
  datos: {
    folio: string;
    fecha: string;
    paciente: string;
    servicio: string;
    monto: string;
    metodo?: string;
  }
}

export default function DownloadReciboButton({ datos }: BotonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generamos la instancia del PDF
  const [instance, updateInstance] = usePDF({ document: <ReciboPagoPDF {...datos} /> });

  if (!isClient) return <span className="text-xs text-gray-300">...</span>;

  if (instance.error) {
    console.error("Error PDF Recibo:", instance.error);
    return <span className="text-xs text-red-400">Error PDF</span>;
  }

  if (instance.loading) {
    return <span className="text-xs text-gray-400">Creando...</span>;
  }

  return (
    <a 
      href={instance.url || "#"} 
      download={`Recibo_${datos.folio}.pdf`}
      className="text-green-600 hover:text-green-800 text-xs font-bold underline flex items-center gap-1"
      title="Descargar Comprobante"
    >
      📄 Recibo
    </a>
  );
}