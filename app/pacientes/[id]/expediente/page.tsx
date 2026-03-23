// app/pacientes/[id]/expediente/page.tsx
"use client";
import { useEffect, useState, Suspense } from "react";
import { collection, query, where, getDocs, limit } from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import DownloadHojaFrontalButton from "@/components/pdf/DownloadHojaFrontalButton";
import Link from "next/link";
import { useParams } from "next/navigation";

function ExpedienteContent() {
  const { id } = useParams(); // 🆔 Capturamos el ID del paciente desde la URL
  const [paciente, setPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHojaVisible, setIsHojaVisible] = useState(false); // 🧠 SANSCE OS: Oculto por defecto para vista clínica limpia

  useEffect(() => {
    const cargarPaciente = async () => {
      try {
        // Trazabilidad Sagrada: Buscamos solo al paciente de este ID
        const q = query(collection(db, "pacientes"), where("__name__", "==", id), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setPaciente({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      } catch (error) {
        console.error("Error en expediente:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarPaciente();
  }, [id]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Link href={`/pacientes/${id}`} className="text-slate-400 hover:text-blue-600 text-2xl font-bold">←</Link>
              <div>
                    <h1 className="text-2xl font-bold text-slate-900">Expediente Clínico Digital</h1>
                    <p className="text-slate-500">Módulo de consulta de información del paciente</p>
                </div>
            </div>

            {/* ELEMENTO 1: HOJA FRONTAL (Modo Acordeón Minimalista) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
                <div 
                  className="flex justify-between items-center cursor-pointer group"
                  onClick={() => setIsHojaVisible(!isHojaVisible)}
                >
                    <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest italic flex items-center gap-2">
                      1. Hoja Frontal
                      <span className="text-[10px] font-normal text-slate-400 group-hover:text-blue-500 transition-colors">
                        {isHojaVisible ? "(Click para ocultar ↑)" : "(Click para desplegar ↓)"}
                      </span>
                    </h2>
                    <div className={`text-slate-300 group-hover:text-blue-500 transition-transform duration-300 ${isHojaVisible ? "rotate-180" : ""}`}>
                      ▼
                    </div>
                </div>
                
                {isHojaVisible && (
                  <div className="mt-6 pt-6 border-t border-slate-50 animate-fade-in">
                    {loading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                ) : paciente ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* CABECERA ESTILO PDF */}
                        <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <h3 className="text-xl font-black text-emerald-600 tracking-tighter uppercase">Expediente Clínico</h3>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                                    <p>CLI-FR-01</p>
                                    <p>Ed. 01</p>
                                </div>
                            </div>
                            <DownloadHojaFrontalButton paciente={paciente} />
                        </div>

                        {/* GRID DE DATOS MAESTROS (Espejo del PDF) */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                            {/* Fila 1 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">NOMBRE:</div>
                                <div className="w-3/6 p-2 font-bold text-slate-900 border-r uppercase">{paciente.nombreCompleto}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">CONVENIO:</div>
                                <div className="w-1/6 p-2 text-slate-700">-</div>
                            </div>
                            {/* Fila 2 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">FECHA:</div>
                                <div className="w-2/6 p-2 text-slate-700 border-r">{new Date().toLocaleDateString('es-MX')}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">No. EXPEDIENTE:</div>
                                <div className="w-2/6 p-2 font-mono text-blue-600 font-bold uppercase">{paciente.id?.slice(0,8).toUpperCase()}</div>
                            </div>
                            {/* Fila 3 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-[10%] bg-slate-50 p-2 font-bold text-slate-500 border-r">EDAD:</div>
                                <div className="w-[10%] p-2 text-slate-700 border-r">{paciente.edad}</div>
                                <div className="w-[15%] bg-slate-50 p-2 font-bold text-slate-500 border-r">FECHA NAC:</div>
                                <div className="w-[25%] p-2 text-slate-700 border-r">{paciente.fechaNacimiento}</div>
                                <div className="w-[15%] bg-slate-50 p-2 font-bold text-slate-500 border-r">SEXO:</div>
                                <div className="w-[25%] p-2 text-slate-700 uppercase">{paciente.genero}</div>
                            </div>
                            {/* Fila 4 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">LUGAR NAC:</div>
                                <div className="w-2/6 p-2 text-slate-700 border-r uppercase">{paciente.lugarNacimiento || '-'}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">RESIDENCIA:</div>
                                <div className="w-2/6 p-2 text-slate-700 uppercase">{paciente.lugarResidencia || '-'}</div>
                            </div>
                            {/* Fila 5 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">RELIGIÓN:</div>
                                <div className="w-2/6 p-2 text-slate-700 border-r uppercase">{paciente.religion || '-'}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">ESTADO CIVIL:</div>
                                <div className="w-2/6 p-2 text-slate-700 uppercase">{paciente.estadoCivil || '-'}</div>
                            </div>
                            {/* Fila 6 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">CELULAR:</div>
                                <div className="w-2/6 p-2 font-bold text-blue-600 border-r">{paciente.telefonoCelular}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">OCUPACIÓN:</div>
                                <div className="w-2/6 p-2 text-slate-700 uppercase">{paciente.ocupacion || '-'}</div>
                            </div>
                            {/* Fila 7 */}
                            <div className="flex border-b border-slate-200">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">EMAIL:</div>
                                <div className="w-2/6 p-2 text-slate-700 border-r">{paciente.email || '-'}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">ESCOLARIDAD:</div>
                                <div className="w-2/6 p-2 text-slate-700 uppercase">{paciente.escolaridad || '-'}</div>
                            </div>
                            {/* Fila 8 */}
                            <div className="flex">
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">REFERIDO POR:</div>
                                <div className="w-2/6 p-2 text-slate-700 border-r uppercase">{paciente.medioMarketing || paciente.referidoPor || '-'}</div>
                                <div className="w-1/6 bg-slate-50 p-2 font-bold text-slate-500 border-r">TUTOR:</div>
                                <div className="w-2/6 p-2 text-slate-700 uppercase">{paciente.tutor || '-'}</div>
                            </div>
                        </div>

                        {/* SECCIÓN FISCAL (Copia del estilo PDF) */}
                        <div>
                            <h4 className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-t-lg uppercase tracking-wider">Datos de Facturación</h4>
                            <div className="border border-emerald-600 rounded-b-lg overflow-hidden text-xs">
                                <div className="flex border-b border-emerald-100">
                                    <div className="w-1/5 bg-emerald-50 p-2 font-bold text-emerald-800 border-r border-emerald-100">RAZÓN SOCIAL:</div>
                                    <div className="w-4/5 p-2 font-bold text-slate-900 uppercase">{paciente.datosFiscales?.razonSocial || 'PÚBLICO EN GENERAL'}</div>
                                </div>
                                <div className="flex border-b border-emerald-100">
                                    <div className="w-1/5 bg-emerald-50 p-2 font-bold text-emerald-800 border-r border-emerald-100">RFC:</div>
                                    <div className="w-1/5 p-2 text-slate-700 border-r border-emerald-100">{paciente.datosFiscales?.rfc || 'XAXX010101000'}</div>
                                    <div className="w-1/5 bg-emerald-50 p-2 font-bold text-emerald-800 border-r border-emerald-100">RÉGIMEN:</div>
                                    <div className="w-2/5 p-2 text-slate-700">{paciente.datosFiscales?.regimenFiscal || '616 - Sin obligaciones'}</div>
                                </div>
                                <div className="flex">
                                    <div className="w-1/5 bg-emerald-50 p-2 font-bold text-emerald-800 border-r border-emerald-100">CP FISCAL:</div>
                                    <div className="w-1/5 p-2 text-slate-700 border-r border-emerald-100">{paciente.datosFiscales?.cpFiscal || '-'}</div>
                                    <div className="w-1/5 bg-emerald-50 p-2 font-bold text-emerald-800 border-r border-emerald-100">USO CFDI:</div>
                                    <div className="w-2/5 p-2 text-slate-700">{paciente.datosFiscales?.usoCFDI || 'S01'}</div>
                                </div>
                            </div>
                        </div>

                        {/* PIE DE PÁGINA NORMATIVO */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-[9px] text-slate-400 text-center leading-tight">
                                Clínica SANSCE; SANSCE S.A. de C.V. Calle Magdalena #439, Col. del Valle Centro, CDMX.<br/>
                                La presente información constituye la carátula digital conforme a la NOM-004-SSA3-2012.
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-red-500">Error: Paciente no localizado en el archivo digital.</p>
                )}
              </div>
            )}
            </div>
            {/* Próximos elementos del expediente se agregarán aquí abajo */}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ExpedienteDigitalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando Archivo Clínico...</div>}>
      <ExpedienteContent />
    </Suspense>
  );
}