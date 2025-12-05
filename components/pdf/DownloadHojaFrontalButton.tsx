/* components/pdf/DownloadHojaFrontalButton.tsx */
"use client";
import { usePDF } from "@react-pdf/renderer";
import HojaFrontalPDF from "../documents/HojaFrontalPDF";
import { useEffect, useState } from "react";
import Button from "../ui/Button";

export default function DownloadHojaFrontalButton({ paciente }: { paciente: any }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Creamos el documento
  const [instance] = usePDF({ document: <HojaFrontalPDF paciente={paciente} /> });

  if (!isClient) return null;

  if (instance.loading) return <span className="text-xs text-gray-400">Generando...</span>;
  if (instance.error) return <span className="text-xs text-red-400">Error</span>;

  return (
    <a 
      href={instance.url || "#"} 
      download={`Expediente_${paciente.nombreCompleto}.pdf`}
      className="inline-flex"
    >
      <Button variant="success" className="text-sm">
        🖨️ Descargar Hoja Frontal
      </Button>
    </a>
  );
}