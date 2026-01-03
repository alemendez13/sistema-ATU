/* components/pacientes/PatientActions.tsx */
"use client";

import { useState } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { db, storage } from "../../lib/firebase"; 
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paciente } from "../../types"; 
import SmartAvatarUploader from "../ui/SmartAvatarUploader";
import { cleanPrice, generateSearchTags } from "../../lib/utils";

// --- CATÁLOGOS COMPLETOS ---
const ESTADOS_MX = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "Extranjero"];
const GENEROS = ["Masculino", "Femenino", "Transgénero", "No binario", "Prefiero no decir"];
const ESTADO_CIVIL = ["Soltero", "Casado", "Divorciado", "Viudo", "Concubinato"];
const RELIGIONES = ["Ninguna", "Catolicismo", "Cristianismo", "Testigo de Jehová", "Judaísmo", "Islam", "Budismo", "Hinduismo", "Otra"];
const ESCOLARIDAD = ["Analfabeta", "Sabe leer y escribir", "Preescolar", "Primaria", "Secundaria", "Preparatoria", "Licenciatura", "Postgrado", "Otro"];
const OCUPACIONES = ["Empleado", "Empresario", "Comerciante", "Profesional de la salud", "Oficinista", "Obrero", "Ama de casa", "Desempleado", "Estudiante", "Jubilado", "Otro"];
const REGIMENES_FISCALES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606 - Arrendamiento",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "621 - Incorporación Fiscal",
  "624 - Coordinados",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza"
];
const USOS_CFDI = ["G01 - Adquisición de mercancías", "G03 - Gastos en general", "D01 - Honorarios médicos, dentales y gastos hospitalarios", "D02 - Gastos médicos por incapacidad o discapacidad", "S01 - Sin efectos fiscales", "CP01 - Pagos"];
const GRUPOS_ETNICOS = ["Nahuas", "Mayas", "Zapotecas", "Mixtecas", "Otomíes", "Totonacas", "Tsotsiles", "Tzeltales", "Mazahuas", "Mazatecos", "Hispanos", "Latinoamericanos", "Anglosajones", "Otros"];

interface Props {
  pacienteId: string;
  datosActuales: Paciente;
}

export default function PatientActions({ pacienteId, datosActuales }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "demo" | "fiscal">("general");
  
  // Estado para capturar la nueva foto si el usuario decide cambiarla
  const [newFotoFile, setNewFotoFile] = useState<File | null>(null);

  // Inicializamos el formulario con los datos actuales
  const [formData, setFormData] = useState<Paciente>({
    ...datosActuales,
    datosFiscales: datosActuales.datosFiscales || {
      tipoPersona: "Fisica",
      razonSocial: "",
      rfc: "",
      regimenFiscal: "",
      usoCFDI: "",
      cpFiscal: "",
      emailFacturacion: ""
    }
  });

  const handleDelete = async () => {
    if (!confirm("⚠️ ¿Eliminar paciente permanentemente? Esto borrará su historial.")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "pacientes", pacienteId));
      toast.success("Paciente eliminado");
      router.push("/pacientes");
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = doc(db, "pacientes", pacienteId);
      
      // 1. Lógica de Subida de Imagen (Solo si hay un archivo nuevo)
      // Usamos 'as any' como medida de seguridad por si types.ts no se ha actualizado aún
      let finalFotoUrl = (formData as any).fotoUrl || null; 

      if (newFotoFile) {
         try {
            // Referencia única con timestamp para evitar caché
            const storageRef = ref(storage, `pacientes/${Date.now()}_${newFotoFile.name}`);
            const snapshot = await uploadBytes(storageRef, newFotoFile);
            finalFotoUrl = await getDownloadURL(snapshot.ref);
         } catch (err) {
            console.error("Error subiendo imagen:", err);
            toast.warning("No se pudo actualizar la foto, guardando resto de datos...");
         }
      }

      // 2. Preparar objeto para actualizar

      const nombreNormalizado = formData.nombreCompleto.toUpperCase();

      const dataToUpdate = {
        ...formData,
        fotoUrl: finalFotoUrl, // Guardamos la URL actualizada
        nombreCompleto: formData.nombreCompleto.toUpperCase(),
        searchKeywords: generateSearchTags(nombreNormalizado),
        datosFiscales: formData.datosFiscales?.rfc ? {
            ...formData.datosFiscales,
            razonSocial: formData.datosFiscales.razonSocial.toUpperCase(),
            rfc: formData.datosFiscales.rfc.toUpperCase(),
            ultimaEdicionAdmin: serverTimestamp()
        } : null 
      };

      await updateDoc(docRef, dataToUpdate);
      
      toast.success("Expediente actualizado correctamente");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  // Clases de estilo reutilizables
  const inputClass = "w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-xs font-bold text-slate-500 mb-1 uppercase";

  return (
    <>
      <div className="flex gap-2 mt-4">
          <button onClick={() => setIsEditing(true)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition">
            ✏️ Editar Todo
          </button>
          <button onClick={handleDelete} className="bg-red-50 text-red-600 px-3 rounded-lg hover:bg-red-100 transition" title="Eliminar">
            🗑️
          </button>
      </div>

      {/* --- MODAL DE EDICIÓN --- */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">Editar Expediente</h2>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Pestañas */}
            <div className="flex border-b">
                <button 
                    onClick={() => setActiveTab("general")}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === "general" ? "border-blue-600 text-blue-600 bg-blue-50" : "border-transparent text-slate-500 hover:bg-slate-50"}`}
                >
                    👤 General
                </button>
                <button 
                    onClick={() => setActiveTab("demo")}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === "demo" ? "border-blue-600 text-blue-600 bg-blue-50" : "border-transparent text-slate-500 hover:bg-slate-50"}`}
                >
                    🌎 Demográficos
                </button>
                <button 
                    onClick={() => setActiveTab("fiscal")}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === "fiscal" ? "border-blue-600 text-blue-600 bg-blue-50" : "border-transparent text-slate-500 hover:bg-slate-50"}`}
                >
                    💼 Fiscales
                </button>
            </div>
            
            {/* Formulario con Scroll */}
            <form onSubmit={handleUpdate} className="overflow-y-auto p-6 space-y-6 flex-1">
              
              {/* --- PESTAÑA GENERAL --- */}
              {activeTab === "general" && (
                <div className="space-y-4 animate-fade-in">
                    
                    {/* Componente de Foto Integrado */}
                    <div className="flex justify-center pb-4 border-b border-slate-100">
                        <SmartAvatarUploader 
                            currentImageUrl={(formData as any).fotoUrl}
                            onImageSelected={(file) => setNewFotoFile(file)}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Nombre Completo</label>
                        <input className={inputClass} value={formData.nombreCompleto} onChange={e => setFormData({...formData, nombreCompleto: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Fecha Nacimiento</label>
                            <input type="date" className={inputClass} value={formData.fechaNacimiento} onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Género</label>
                            <select className={inputClass} value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})}>
                                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Celular (WhatsApp)</label>
                            <input className={inputClass} value={formData.telefonoCelular} onChange={e => setFormData({...formData, telefonoCelular: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Tutor (Si es menor)</label>
                        <input className={inputClass} value={formData.tutor || ""} onChange={e => setFormData({...formData, tutor: e.target.value})} />
                    </div>
                </div>
              )}

              {/* --- PESTAÑA DEMOGRÁFICOS CORREGIDA --- */}
                    {activeTab === "demo" && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Fila 1: Origen y Residencia */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Lugar Nacimiento</label>
                            <select className={inputClass} value={formData.lugarNacimiento || ""} onChange={e => setFormData({...formData, lugarNacimiento: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {ESTADOS_MX.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Lugar Residencia</label>
                            <select className={inputClass} value={formData.lugarResidencia || ""} onChange={e => setFormData({...formData, lugarResidencia: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {ESTADOS_MX.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                        </div>

                        {/* Fila 2: Estado Civil y Ocupación */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Estado Civil</label>
                            <select className={inputClass} value={formData.estadoCivil || ""} onChange={e => setFormData({...formData, estadoCivil: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {ESTADO_CIVIL.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Ocupación</label>
                            <select className={inputClass} value={formData.ocupacion || ""} onChange={e => setFormData({...formData, ocupacion: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {OCUPACIONES.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                        </div>

                        {/* Fila 3: Religión y Escolaridad */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Religión</label>
                            <select className={inputClass} value={formData.religion || ""} onChange={e => setFormData({...formData, religion: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {RELIGIONES.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Escolaridad</label>
                            <select className={inputClass} value={formData.escolaridad || ""} onChange={e => setFormData({...formData, escolaridad: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {ESCOLARIDAD.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                        </div>

                        {/* Fila 4: Grupo Étnico (Destacado por ser obligatorio) */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <label className={`${labelClass} text-blue-600`}>Grupo Étnico</label>
                        <select 
                            className={inputClass} 
                            value={formData.grupoEtnico || ""} 
                            onChange={e => setFormData({...formData, grupoEtnico: e.target.value})}
                            required
                        >
                            <option value="">Seleccionar...</option>
                            {GRUPOS_ETNICOS.map(x => <option key={x} value={x}>{x}</option>)}
                        </select>
                        </div>

                        {/* Fila 5: Marketing (Obligatorios) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                        <div>
                            <label className={`${labelClass} text-blue-600`}>¿Cómo se enteró?</label>
                            <select 
                            className={inputClass} 
                            value={formData.medioMarketing || ""} 
                            onChange={e => setFormData({...formData, medioMarketing: e.target.value})}
                            required
                            >
                            <option value="">Seleccionar...</option>
                            {["Pacientes", "Google", "Doctoralia", "Facebook", "Instagram", "Página Web", "WhatsApp", "Recomendación Familiar", "Recomendación Profesional Salud", "Otro"].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            </select>
                        </div>
                        <div>
                            <label className={`${labelClass} text-blue-600`}>Nombre del referente / Recomendado por</label>
                            <input 
                            type="text" 
                            className={inputClass} 
                            value={formData.referidoPor || ""} 
                            onChange={e => setFormData({...formData, referidoPor: e.target.value.toUpperCase()})}
                            placeholder="Nombre completo"
                            required
                            />
                        </div>
                        </div>
                    </div>
                    )}

              {/* --- PESTAÑA FISCALES --- */}
              {activeTab === "fiscal" && formData.datosFiscales && (
                <div className="space-y-4 animate-fade-in bg-slate-50 p-4 rounded border">
                    <div className="text-xs text-slate-500 mb-2">
                        ℹ️ Si el paciente requiere factura, llena estos datos. Si borras el RFC, se desactivará la facturación.
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* BOTÓN INTELIGENTE DE AUTO-RELLENADO */}
                            <div className="md:col-span-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({
                                            ...formData,
                                            datosFiscales: {
                                                ...formData.datosFiscales!,
                                                razonSocial: formData.nombreCompleto.toUpperCase()
                                            }
                                        });
                                        toast.info("Nombre del paciente copiado a Razón Social");
                                    }}
                                    className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 transition"
                                >
                                    👤 ¿EL PACIENTE ES LA PERSONA QUE FACTURA? (Clic para copiar nombre)
                                </button>
                            </div>
                        <div>
                            <label className={labelClass}>RFC</label>
                            <input className={inputClass} value={formData.datosFiscales.rfc || ""} 
                                   onChange={e => setFormData({...formData, datosFiscales: { ...formData.datosFiscales!, rfc: e.target.value }})} />
                        </div>
                        <div>
                            <label className={labelClass}>Tipo Persona</label>
                            <select className={inputClass} value={formData.datosFiscales.tipoPersona || "Fisica"} 
                                    onChange={e => setFormData({...formData, datosFiscales: { ...formData.datosFiscales!, tipoPersona: e.target.value }})}>
                                <option value="Fisica">Física</option>
                                <option value="Moral">Moral</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Razón Social</label>
                        <input className={inputClass} value={formData.datosFiscales.razonSocial || ""} 
                               onChange={e => setFormData({...formData, datosFiscales: { ...formData.datosFiscales!, razonSocial: e.target.value }})} />
                    </div>
                    <div>
                        <label className={labelClass}>Régimen Fiscal</label>
                        <select className={inputClass} value={formData.datosFiscales.regimenFiscal || ""} 
                                onChange={e => setFormData({...formData, datosFiscales: { ...formData.datosFiscales!, regimenFiscal: e.target.value }})}>
                            <option value="">Seleccionar...</option>
                            {REGIMENES_FISCALES.map(x => <option key={x} value={x}>{x}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Uso CFDI</label>
                            <select className={inputClass} value={formData.datosFiscales.usoCFDI || ""} 
                                    onChange={e => setFormData({...formData, datosFiscales: { ...formData.datosFiscales!, usoCFDI: e.target.value }})}>
                                <option value="">Seleccionar...</option>
                                {USOS_CFDI.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className={labelClass}>CP Fiscal</label>
                            <input className={inputClass} value={formData.datosFiscales.cpFiscal || ""} 
                                   onChange={e => setFormData({...formData, datosFiscales: { ...formData.datosFiscales!, cpFiscal: e.target.value }})} />
                        </div>
                    </div>
                </div>
              )}

            </form>

            {/* Footer de Acciones */}
            <div className="p-4 border-t bg-slate-50 flex gap-4 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">
                    Cancelar
                </button>
                <button 
                    onClick={handleUpdate} 
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}