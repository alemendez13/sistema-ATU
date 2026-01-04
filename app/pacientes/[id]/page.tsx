// app/pacientes/[id]/page.tsx
"use client"; // 👈 ESTO ES LA CLAVE: Le dice a Next.js que esto corre en el navegador

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";
// Ajusta esta importación si tus tipos están en otro lado, según tu estructura es correcto:
import { Paciente, Operacion } from "../../../types"; 
import Link from "next/link";
import DownloadReciboButton from "../../../components/pdf/DownloadReciboButton";
import PatientActions from "../../../components/pacientes/PatientActions";
import { toast } from "sonner"; // Opcional: para notificar errores

// --- HELPERS (Conservados igual) ---
function calcularEdad(fechaNacimiento?: string) {
  if (!fechaNacimiento) return "?";
  const hoy = new Date();
  const cumpleanos = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const mes = hoy.getMonth() - cumpleanos.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : "?";
}

function serializarPaciente(data: any): Paciente {
  return {
    ...data,
    fechaNacimiento: typeof data.fechaNacimiento === 'string' ? data.fechaNacimiento : data.fechaNacimiento?.toDate?.().toISOString() || null,
    fechaRegistro: data.fechaRegistro?.toDate?.().toISOString() || null,
    datosFiscales: data.datosFiscales || null
  };
}

// --- COMPONENTE PRINCIPAL (Ahora es Client Component) ---
export default function ExpedientePage({ params }: { params: { id: string } }) {
  // 1. Manejo de Estado (Loading, Datos, Error)
  const [datos, setDatos] = useState<Paciente | null>(null);
  const [historial, setHistorial] = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 2. Efecto de Carga (Se ejecuta al montar el componente en el navegador)
  useEffect(() => {
    const cargarExpediente = async () => {
      try {
        setLoading(true);
        const id = params.id;

        // A. Cargar Paciente
        const docRef = doc(db, "pacientes", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError(true);
          setLoading(false);
          return;
        }

        const rawData = { id: docSnap.id, ...docSnap.data() };
        const datosLimpios = serializarPaciente(rawData);
        setDatos(datosLimpios);

        // B. Cargar Historial (Pagos)
        const qPagos = query(
          collection(db, "operaciones"),
          where("pacienteId", "==", id),
          orderBy("fecha", "desc")
        );
        const snapPagos = await getDocs(qPagos);
        
        const historialData = snapPagos.docs.map(d => {
          const data = d.data();
          return {
              id: d.id,
              ...data,
              fecha: data.fecha?.toDate ? { seconds: data.fecha.seconds } : null,
              monto: data.monto,
          };
        }) as Operacion[];
        
        setHistorial(historialData);

      } catch (err) {
        console.error("Error cargando expediente:", err);
        setError(true);
        toast.error("No tienes permiso para ver este expediente o no existe.");
      } finally {
        setLoading(false);
      }
    };

    cargarExpediente();
  }, [params.id]);

  // 3. Renderizado Condicional (Loading / Error)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 flex justify-center">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Cargando expediente seguro...</p>
        </div>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 flex justify-center">
         <div className="text-center p-8 bg-white rounded-xl shadow border border-red-100">
            <p className="text-4xl mb-2">🔒</p>
            <h3 className="text-xl font-bold text-red-600 mb-2">Acceso Restringido</h3>
            <p className="text-slate-500 mb-4">No se pudo cargar el paciente. Verifica tu conexión o permisos.</p>
            <Link href="/pacientes" className="text-blue-600 hover:underline">Volver al Directorio</Link>
         </div>
      </div>
    );
  }

  // --- VARIABLES DERIVADAS ---
  const edadReal = calcularEdad(datos.fechaNacimiento);
  const labelStyle = "text-xs font-bold text-slate-400 uppercase";
  const valueStyle = "text-slate-700 font-medium";
  const sectionTitle = "text-lg font-bold text-slate-800 border-b pb-2 mb-4";

  // 4. UI PRINCIPAL (Idéntica a tu diseño original)
  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-28">
      <div className="max-w-6xl mx-auto animate-fade-in">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex gap-4 items-center">
             <Link href="/" className="text-slate-400 hover:text-slate-600 text-xs font-medium">
                🏠 Inicio
             </Link>
             <span className="text-slate-300">/</span>
             <Link href="/pacientes" className="text-slate-500 hover:text-blue-600 text-sm font-bold">
                🗂️ Directorio
             </Link>
             <span className="text-slate-300">/</span>
             <span className="text-slate-800 text-sm font-bold">Expediente: {datos.nombreCompleto}</span>
          </div>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 flex flex-col lg:flex-row gap-8 items-start">
            
            <div className="flex flex-col items-center gap-4 w-full lg:w-auto shrink-0">
                <div className={`h-32 w-32 rounded-full flex items-center justify-center text-5xl font-bold shadow-inner ${datos.genero === 'Femenino' ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'}`}>
                    {datos.nombreCompleto?.charAt(0)}
                </div>
                
                <div className="w-full space-y-3">
                    <Link href={`/pacientes/${params.id}/venta`} className="block">
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2">
                            🛒 Nueva Venta
                        </button>
                    </Link>
                    
                    {/* ACCIONES: EDITAR / ELIMINAR */}
                    <PatientActions 
                        pacienteId={params.id} 
                        datosActuales={datos} 
                    />
                </div>
            </div>

            <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">{datos.nombreCompleto}</h1>
                        <p className="text-slate-400 text-sm">ID Interno: {datos.id}</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                         <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-medium">Edad: {edadReal} años</span>
                         <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-medium">{datos.genero}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                        <h3 className={sectionTitle}>👤 Datos Personales</h3>
                        <div className="space-y-3 text-sm">
                            <div><p className={labelStyle}>Ocupación</p><p className={valueStyle}>{datos.ocupacion || "No registrada"}</p></div>
                            <div><p className={labelStyle}>Estado Civil</p><p className={valueStyle}>{datos.estadoCivil || "No registrado"}</p></div>
                            <div><p className={labelStyle}>Religión</p><p className={valueStyle}>{datos.religion || "No registrada"}</p></div>
                        </div>
                    </div>

                    <div>
                        <h3 className={sectionTitle}>📞 Contacto</h3>
                        <div className="space-y-3 text-sm">
                            <div><p className={labelStyle}>Celular</p><p className="text-blue-600 font-bold text-lg">{datos.telefonoCelular}</p></div>
                            <div><p className={labelStyle}>Email</p><p className={valueStyle}>{datos.email || "No registrado"}</p></div>
                            <div><p className={labelStyle}>Residencia</p><p className={valueStyle}>{datos.lugarResidencia || "-"}</p></div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-fit">
                      <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        💼 Datos Fiscales
                      </h3>
                      {datos.datosFiscales ? (
                        <div className="space-y-2 text-sm">
                          <p><span className="text-slate-400 font-bold text-xs uppercase block">RFC</span> {datos.datosFiscales.rfc || "N/A"}</p>
                          <p><span className="text-slate-400 font-bold text-xs uppercase block">Razón Social</span> {datos.datosFiscales.razonSocial || "N/A"}</p>
                          <p className="text-xs text-slate-400 mt-2 border-t pt-2">{datos.datosFiscales.regimenFiscal || ""}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm italic py-2">Sin datos de facturación registrados.</p>
                      )}
                    </div>
                </div>
            </div>
        </div>

        {/* HISTORIAL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">📜 Historial de Movimientos</h2>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {historial.length} Registros
                </span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4 border-b">Fecha</th>
                            <th className="p-4 border-b">Servicio / Producto</th>
                            <th className="p-4 border-b">Monto</th>
                            <th className="p-4 border-b">Estatus</th>
                            <th className="p-4 border-b text-center">Comprobante</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historial.length === 0 ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No hay historial de servicios para este paciente.</td></tr>
                        ) : (
                            historial.map((pago) => (
                                <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-600">
                                        {pago.fecha?.seconds ? new Date(pago.fecha.seconds * 1000).toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'}) : '-'}
                                    </td>
                                    <td className="p-4 font-semibold text-slate-800">{pago.servicioNombre}</td>
                                    <td className="p-4 font-mono text-slate-700">${pago.monto}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${pago.estatus === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            <span className={`w-2 h-2 rounded-full ${pago.estatus === 'Pagado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                            {pago.estatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {pago.estatus === 'Pagado' && (
                                            <div className="flex justify-center">
                                                <DownloadReciboButton 
                                                    datos={{
                                                        folio: (pago.id || "000").slice(0,8).toUpperCase(),
                                                        fecha: pago.fecha?.seconds ? new Date(pago.fecha.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString(),
                                                        paciente: datos.nombreCompleto,
                                                        servicio: pago.servicioNombre,
                                                        monto: String(pago.monto),
                                                        metodo: pago.metodoPago || "Efectivo"
                                                    }} 
                                                />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}