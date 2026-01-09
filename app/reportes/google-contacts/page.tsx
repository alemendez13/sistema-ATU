/* app/reportes/google-contacts/page.tsx */
"use client";
import { useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "@/lib/firebase-guard";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Link from "next/link";
import { toast } from "sonner";

export default function GoogleContactsPage() {
  // Fechas por defecto: Mes actual
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generado, setGenerado] = useState(false);

  const generarArchivo = async () => {
    setLoading(true);
    setGenerado(false);
    setPacientes([]);

    try {
      const start = new Date(`${fechaInicio}T00:00:00`);
      const end = new Date(`${fechaFin}T23:59:59`);

      // 1. Buscamos pacientes nuevos en el rango
      const q = query(
        collection(db, "pacientes"),
        where("fechaRegistro", ">=", start),
        where("fechaRegistro", "<=", end),
        orderBy("fechaRegistro", "desc"),
        limit(500) // Límite seguro para exportación
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.info("No se encontraron pacientes registrados en esas fechas.");
        setLoading(false);
        return;
      }

      // 2. Formatear datos para Google Contacts CSV
      // Google espera cabeceras específicas en Inglés para detectar automáticamante
      const csvRows = [];
      
      // Cabeceras Estándar de Google
      csvRows.push(["Name", "Given Name", "Phone 1 - Type", "Phone 1 - Value", "E-mail 1 - Type", "E-mail 1 - Value", "Notes"]);

      const listaPreview: any[] = [];

      snapshot.docs.forEach(doc => {
        const d = doc.data();
        
        // Limpieza de datos
        const nombre = d.nombreCompleto || "Sin Nombre";
        const telefono = d.telefonoCelular || d.celular || "";
        const email = d.email || "";
        const id = doc.id;

        // Agregar al CSV
        csvRows.push([
            `"${nombre}"`,          // Name (Completo)
            `"${nombre}"`,          // Given Name (Repetimos para asegurar visualización)
            "Mobile",               // Phone Type
            `"${telefono}"`,        // Phone Value
            "Home",                 // Email Type
            `"${email}"`,           // Email Value
            `"ID SANSCE: ${id}"`    // Notes
        ]);

        // Agregar a la vista previa
        listaPreview.push({ id, nombre, telefono, email });
      });

      setPacientes(listaPreview);

      // 3. Crear y Descargar el BLOB
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Respaldo_Google_SANSCE_${fechaInicio}_al_${fechaFin}.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);

      setGenerado(true);
      toast.success(`✅ Exportados ${snapshot.docs.length} contactos exitosamente.`);

    } catch (error) {
      console.error(error);
      toast.error("Error al generar archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex items-center gap-4 mb-8">
            <Link href="/reportes" className="text-slate-400 hover:text-blue-600 font-bold text-2xl">←</Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Respaldo Google Contacts</h1>
                <p className="text-slate-500">Exporta pacientes nuevos para sincronizar con tu celular.</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
             <div className="flex flex-col md:flex-row gap-6 items-end mb-8">
                 <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha Inicial</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                 </div>
                 <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha Final</label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                 </div>
             </div>

             <button 
                onClick={generarArchivo} 
                disabled={loading} 
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex justify-center items-center gap-3 ${
                    loading 
                    ? "bg-slate-100 text-slate-400 cursor-wait" 
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02]"
                }`}
             >
                {loading ? "Generando Archivo..." : "📥 Descargar Respaldo CSV"}
             </button>
             
             <p className="text-xs text-center text-slate-400 mt-4">
                El archivo descargado es compatible directamente con contacts.google.com
             </p>
          </div>

          {generado && (
            <div className="mt-8 animate-fade-in-up">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    ✅ Vista Previa de Exportación 
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{pacientes.length} Contactos</span>
                </h3>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                            <tr>
                                <th className="p-3">Nombre (Google)</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Email</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pacientes.map(p => (
                                <tr key={p.id}>
                                    <td className="p-3 font-bold text-slate-700">{p.nombre}</td>
                                    <td className="p-3 text-slate-600">{p.telefono}</td>
                                    <td className="p-3 text-slate-500">{p.email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <strong>💡 ¿Qué hago ahora?</strong>
                    <ol className="list-decimal ml-5 mt-2 space-y-1">
                        <li>Ve a <a href="https://contacts.google.com" target="_blank" className="underline font-bold">contacts.google.com</a></li>
                        <li>En el menú izquierdo, haz clic en <strong>"Importar"</strong>.</li>
                        <li>Selecciona el archivo <strong>.csv</strong> que se acaba de descargar.</li>
                        <li>¡Listo! Tus contactos nuevos aparecerán en tu cuenta y celular.</li>
                    </ol>
                </div>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}