"use client";
import { pdf } from "@react-pdf/renderer";
import CartaResponsivaPDF from "@/components/documents/CartaResponsivaPDF";
import { generateFolio } from "@/lib/utils";
import { useState } from "react"; // 👈 SE QUEDA: Para el estado de loading

export default function DownloadButton({ pacienteNombre, fecha }: { pacienteNombre: string, fecha: string }) {
  const [loading, setLoading] = useState(false); // Estado para saber si estamos generando

  const datosMock = {
    paciente: pacienteNombre,
    equipo: "HOLTER 24H - DRAGER",
    serie: "H-2024-001",
    fecha: fecha,
    folio: "R-001"
  };

  // 👇 ESTA ES LA MAGIA: Función que solo corre al hacer CLIC
  const handleDownload = async () => {
    setLoading(true);
    try {
      // ADICIÓN: Generamos el folio real usando el ID (aquí asumimos que lo recibes como prop)
      const folioReal = generateFolio("ATU-FR-06", "ID_TEMPORAL"); // Reemplazar con ID real de Firestore

      // 1. Generamos el PDF con el folio real
      const blob = await pdf(<CartaResponsivaPDF {...datosMock} folio={folioReal} />).toBlob();
      
      // 2. Creamos una URL temporal para ese blob
      const url = URL.createObjectURL(blob);
      
      // 3. Forzamos la descarga creando un enlace invisible y haciéndole clic
      const link = document.createElement('a');
      link.href = url;
      link.download = `Carta_Responsiva_${pacienteNombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // 4. Limpiamos
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error generando el documento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload} // Ejecuta la función al hacer clic
      disabled={loading}
      className={`px-4 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-bold transition-all ${
        loading 
          ? "bg-gray-300 text-gray-500 cursor-wait" 
          : "bg-purple-600 text-white hover:bg-purple-700"
      }`}
    >
      {loading ? "Generando..." : "📄 Descargar Responsiva"}
    </button>
  );
}