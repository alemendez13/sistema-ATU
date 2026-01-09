// ARCHIVO: app/portal/page.tsx
"use client";
import { useState } from "react";
import { collection, query, where, getDocs, orderBy } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";
import { toast } from "sonner";
// 👇 AQUÍ ESTÁ LA CORRECCIÓN DE LA RUTA
import DownloadReciboButton from "../../components/pdf/DownloadReciboButton";

export default function PortalPacientePage() {
  const [busqueda, setBusqueda] = useState({
    nombre: "",
    fechaNacimiento: ""
  });
  const [loading, setLoading] = useState(false);
  const [recibos, setRecibos] = useState<any[]>([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busqueda.nombre || !busqueda.fechaNacimiento) {
      toast.warning("Ingresa nombre y fecha de nacimiento");
      return;
    }

    setLoading(true);
    setRecibos([]);
    setBusquedaRealizada(false);

    try {
      // 1. PRIMER PASO DE SEGURIDAD: Validar identidad en colección 'pacientes'
      // Buscamos coincidencia exacta de Nombre + Fecha de Nacimiento
      const qPacientes = query(
        collection(db, "pacientes"),
        where("nombreCompleto", "==", busqueda.nombre.toUpperCase().trim()),
        where("fechaNacimiento", "==", busqueda.fechaNacimiento)
      );

      const snapshotPacientes = await getDocs(qPacientes);

      if (snapshotPacientes.empty) {
        toast.error("No encontramos un paciente con esos datos exactos.");
        setLoading(false);
        setBusquedaRealizada(true);
        return;
      }

      // Si encontramos al paciente, obtenemos su ID real
      const pacienteId = snapshotPacientes.docs[0].id;

      // 2. SEGUNDO PASO: Buscar recibos usando el ID validado
      const qRecibos = query(
        collection(db, "operaciones"),
        where("pacienteId", "==", pacienteId),
        where("estatus", "==", "Pagado"), // Solo mostrar lo pagado
        orderBy("fecha", "desc")
      );

      const snapshotRecibos = await getDocs(qRecibos);
      
      const datos = snapshotRecibos.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convertir Timestamp a Date legible
        fecha: doc.data().fecha?.toDate() || new Date()
      }));

      setRecibos(datos);
      setBusquedaRealizada(true);

      if (datos.length === 0) {
        toast.info("Identidad verificada, pero no tienes recibos disponibles.");
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al buscar información.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Portal de Pacientes 🏥</h1>
          <p className="text-slate-500">Consulta y descarga tus recibos de honorarios médicos.</p>
        </div>

        {/* Formulario de Búsqueda Segura */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={handleBuscar} className="flex flex-col md:flex-row gap-4 items-end">
            
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nombre Completo
              </label>
              <input 
                type="text"
                placeholder="Como aparece en tu expediente"
                className="w-full border p-3 rounded-lg uppercase"
                value={busqueda.nombre}
                onChange={e => setBusqueda(prev => ({...prev, nombre: e.target.value}))}
                required
              />
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fecha Nacimiento
              </label>
              <input 
                type="date"
                className="w-full border p-3 rounded-lg"
                value={busqueda.fechaNacimiento}
                onChange={e => setBusqueda(prev => ({...prev, fechaNacimiento: e.target.value}))}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {loading ? "Verificando..." : "Consultar"}
            </button>
          </form>
          
          <p className="text-xs text-slate-400 mt-3 text-center">
            🔒 Tus datos están protegidos. Solo se mostrará información si el nombre y la fecha coinciden.
          </p>
        </div>

        {/* Resultados */}
        {busquedaRealizada && recibos.length > 0 && (
    <div className="space-y-4 animate-fade-in">
        <h3 className="font-bold text-slate-700 text-lg">📄 Tus Recibos Disponibles</h3>
        {recibos.map(recibo => (
            <div key={recibo.id} className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow">
                <div>
                    <p className="font-bold text-slate-800">{recibo.servicioNombre}</p>
                    <p className="text-sm text-slate-500">
                        Fecha: {recibo.fecha.toLocaleDateString()} • Monto: ${recibo.monto}
                    </p>
                </div>
                
                {/* --- AQUÍ ESTÁ LA CORRECCIÓN CLAVE --- */}
                {/* En lugar de operacion={recibo}, pasamos datos={{...}} */}
                <DownloadReciboButton 
                    datos={{
                        folio: recibo.id.slice(0, 6).toUpperCase(),
                        fecha: recibo.fecha.toLocaleDateString(),
                        paciente: busqueda.nombre, // Usamos el nombre que ya validamos
                        servicio: recibo.servicioNombre || "Consulta Médica",
                        monto: recibo.monto?.toString() || "0",
                        metodo: "Efectivo/Transferencia" // Dato por defecto si no existe
                    }} 
                />
                
            </div>
        ))}
    </div>
        )}

        {busquedaRealizada && recibos.length === 0 && !loading && (
            <div className="text-center text-slate-400 py-10 bg-white rounded-xl border border-dashed">
                <p>No se encontraron recibos pagados para este paciente.</p>
            </div>
        )}

      </div>
    </div>
  );
}