"use client";
import React from "react";
import SmartAvatarUploader from "../ui/SmartAvatarUploader";
import { calculateAge } from "../../lib/utils";
import { collection, query, where, getDocs, limit } from "@/lib/firebase-guard";
import { db } from "../../lib/firebase";
import Link from "next/link";

// --- CATÁLOGOS NORMATIVOS COMPLETOS ---
const ESTADOS_MX = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas", "Extranjero"];
const GENEROS = ["Masculino", "Femenino", "Transgénero", "No binario", "Prefiero no decir"];
const ESTADO_CIVIL = ["Soltero", "Casado", "Divorciado", "Viudo", "Concubinato"];
const RELIGIONES = ["Ninguna", "Catolicismo", "Cristianismo", "Testigo de Jehová", "Judaísmo", "Islam", "Budismo", "Hinduismo", "Otra"];
const ESCOLARIDAD = ["Analfabeta", "Sabe leer y escribir", "Preescolar", "Primaria", "Secundaria", "Preparatoria", "Licenciatura", "Postgrado", "Otro"];
const OCUPACIONES = ["Empleado", "Empresario", "Comerciante", "Profesional de la salud", "Oficinista", "Obrero", "Ama de casa", "Desempleado", "Estudiante", "Jubilado", "Otro"];
const REGIMENES_FISCALES = ["601 - General de Ley Personas Morales", "603 - Personas Morales con Fines no Lucrativos", "605 - Sueldos y Salarios", "606 - Arrendamiento", "612 - Personas Físicas con Actividades Empresariales y Profesionales", "616 - Sin obligaciones fiscales", "626 - Régimen Simplificado de Confianza"];
const USOS_CFDI = ["G01 - Adquisición de mercancías", "G03 - Gastos en general", "D01 - Honorarios médicos", "D02 - Gastos médicos por incapacidad", "S01 - Sin efectos fiscales"];
const GRUPOS_ETNICOS = ["Nahuas", "Mayas", "Zapotecas", "Mixtecas", "Otomíes", "Totonacas", "Tsotsiles", "Tzeltales", "Mazahuas", "Mazatecos", "Hispanos", "Latinoamericanos", "Anglosajones", "Otros"];
const MEDIOS_MARKETING = ["Pacientes", "Google", "Doctoralia", "Facebook", "Instagram", "Página Web", "WhatsApp", "Recomendación Familiar", "Recomendación Profesional Salud", "Otro"];

interface FormProps {
  register: any; errors: any; watch: any; setValue: any;
  listaTelefonos: string[];
  actualizarTelefono: (i: number, v: string) => void;
  agregarTelefono: () => void;
  eliminarTelefono: (i: number) => void;
  descuentos: any[];
  setDescuentoSeleccionado: (d: any) => void;
  requiereFactura: boolean;
  setRequiereFactura: (v: boolean) => void;
  setFotoFile: (f: File | null) => void;
  currentFotoUrl?: string;
  isEditing?: boolean;
  datosActuales?: any; // ✅ Se añade para evitar el error ts(2304)
}

export default function FormularioPacienteBase({
  register, errors, watch, setValue, listaTelefonos, actualizarTelefono, 
  agregarTelefono, eliminarTelefono, descuentos, setDescuentoSeleccionado,
  requiereFactura, setRequiereFactura, setFotoFile, currentFotoUrl,
  isEditing,      // ✅ Se añade aquí para que la función la reconozca
  datosActuales   // ✅ Se añade aquí para que la función la reconozca
}: FormProps) {

  const inputStyle = "w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 text-sm border uppercase";
  const labelStyle = "block text-xs font-bold text-slate-600 mb-1 uppercase";
  const sectionTitle = "text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2";

  // 🧠 ESTADOS PARA CONTROL DE LECTURAS (Solo una declaración para evitar ts2451)
  const [duplicado, setDuplicado] = React.useState<{ id: string, nombre: string } | null>(null);
  const [ultimaBusqueda, setUltimaBusqueda] = React.useState<Record<string, string>>({});

  const validarDuplicado = async (campo: string, valor: string) => {
    const valorLimpio = valor.trim().toUpperCase();
    
    // 🛡️ REGLA 1: Evitar búsquedas repetidas
    if (!valorLimpio || valorLimpio.length < 3 || ultimaBusqueda[campo] === valorLimpio) return;
    
    // 🛡️ REGLA 2: No buscar si el valor es igual al original (Ahorra lecturas en edición)
    if (isEditing && datosActuales?.[campo]?.toUpperCase() === valorLimpio) return;

    try {
        const q = query(
            collection(db, "pacientes"), 
            where(campo, "==", valorLimpio), 
            limit(1)
        );
        const snap = await getDocs(q);
        
        setUltimaBusqueda(prev => ({ ...prev, [campo]: valorLimpio }));

        if (!snap.empty) {
            const docPac = snap.docs[0];
            // 🛡️ REGLA 3: No marcar como duplicado si es el mismo paciente que editamos
            if (isEditing && docPac.id === datosActuales?.id) {
                setDuplicado(null);
            } else {
                setDuplicado({ id: docPac.id, nombre: docPac.data().nombreCompleto });
            }
        } else {
            setDuplicado(null);
        }
    } catch (e) { console.error("Error validando duplicado", e); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECCIÓN 1: IDENTIDAD */}
      <section>
        <h2 className={sectionTitle}>👤 Identidad y Contacto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex justify-center mb-6">
            <SmartAvatarUploader currentImageUrl={currentFotoUrl} onImageSelected={setFotoFile} />
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className={labelStyle}>Nombres</label>
                <input 
                    className={inputStyle} 
                    {...register("nombres", { required: true })} 
                    onBlur={(e) => validarDuplicado("nombres", e.target.value)}
                />
            </div>
            <div>
                <label className={labelStyle}>Apellido Paterno</label>
                <input 
                    className={inputStyle} 
                    {...register("apellidoPaterno", { required: true })} 
                    onBlur={(e) => validarDuplicado("apellidoPaterno", e.target.value)}
                />
            </div>
            <div><label className={labelStyle}>Apellido Materno</label><input className={inputStyle} {...register("apellidoMaterno")} /></div>
            {/* ⚠️ BANNER DE DETECCIÓN DE DUPLICADOS (Caso Alejandro Isla) */}
                {duplicado && (
                    <div className="col-span-full mt-4 bg-orange-50 border-2 border-orange-200 p-4 rounded-lg flex items-center gap-4 animate-pulse">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                            <p className="text-orange-800 font-bold text-sm">
                                POSIBLE EXPEDIENTE DUPLICADO DETECTADO
                            </p>
                            <p className="text-orange-700 text-xs">
                                Ya existe un registro para <strong>{duplicado.nombre}</strong>.
                            </p>
                        </div>
                        <Link 
                            href={`/pacientes/${duplicado.id}`}
                            className="bg-orange-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-orange-700 transition"
                        >
                            IR AL EXPEDIENTE EXISTENTE
                        </Link>
                    </div>
                )}
            <div><label className={labelStyle}>Fecha Nacimiento</label><input type="date" className={inputStyle} {...register("fechaNacimiento", { required: true })} /></div>
            <div><label className={labelStyle}>Género</label><select className={inputStyle} {...register("genero", { required: true })}><option value="">--</option>{GENEROS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div><label className={labelStyle}>Email Personal</label><input type="email" className={inputStyle} {...register("email", { required: true })} /></div>
          </div>
        </div>
        <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <label className={labelStyle}>Teléfonos WhatsApp</label>
          {listaTelefonos.map((tel, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input className={inputStyle} value={tel} onChange={(e) => actualizarTelefono(index, e.target.value)} placeholder="Ej. 5512345678" />
              {index > 0 && <button type="button" onClick={() => eliminarTelefono(index)} className="text-red-500 font-bold px-2">✕</button>}
            </div>
          ))}
          <button type="button" onClick={agregarTelefono} className="text-[10px] text-blue-600 font-bold uppercase">+ Agregar número</button>
        </div>
      </section>

      {/* SECCIÓN 2: DEMOGRÁFICOS COMPLETOS */}
      <details className="group border rounded-lg bg-gray-50 overflow-hidden" open>
        <summary className="cursor-pointer p-4 font-bold text-slate-700 list-none flex justify-between items-center bg-white border-b">
          <span>🌎 Demográficos y Convenios</span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div><label className={labelStyle}>🏷️ Convenio Permanente</label><select className={inputStyle} {...register("convenioId")} onChange={e => setDescuentoSeleccionado(descuentos.find(x => x.id === e.target.value) || null)}><option value="">Ninguno</option>{descuentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></div>
          <div><label className={labelStyle}>Lugar de Nacimiento</label><select className={inputStyle} {...register("lugarNacimiento")}><option value="">Seleccionar...</option>{ESTADOS_MX.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>Lugar Residencia</label><select className={inputStyle} {...register("lugarResidencia")}><option value="">Seleccionar...</option>{ESTADOS_MX.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>Estado Civil</label><select className={inputStyle} {...register("estadoCivil")}><option value="">Seleccionar...</option>{ESTADO_CIVIL.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>Religión</label><select className={inputStyle} {...register("religion")}><option value="">Seleccionar...</option>{RELIGIONES.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>Escolaridad</label><select className={inputStyle} {...register("escolaridad")}><option value="">Seleccionar...</option>{ESCOLARIDAD.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>Ocupación</label><select className={inputStyle} {...register("ocupacion")}><option value="">Seleccionar...</option>{OCUPACIONES.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div>
                <label className={labelStyle}>CURP</label>
                <input 
                    className={inputStyle} 
                    {...register("curp")} 
                    onBlur={(e) => validarDuplicado("curp", e.target.value)}
                    placeholder="18 CARACTERES" 
                />
          </div>
          <div><label className={labelStyle}>Grupo Étnico</label><select className={inputStyle} {...register("grupoEtnico")}><option value="">Seleccionar...</option>{GRUPOS_ETNICOS.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>¿Cómo se enteró?</label><select className={inputStyle} {...register("medioMarketing")}><option value="">Seleccionar...</option>{MEDIOS_MARKETING.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          <div><label className={labelStyle}>Recomendado por</label><input className={inputStyle} {...register("referidoPor")} placeholder="Nombre completo" /></div>
          {watch("fechaNacimiento") && Number(calculateAge(watch("fechaNacimiento"))) < 18 && (
            <div className="md:col-span-2 bg-amber-50 p-3 rounded border border-amber-200"><label className={`${labelStyle} text-amber-700`}>Nombre del Tutor</label><input className={inputStyle} {...register("tutor", { required: true })} /></div>
          )}
        </div>
      </details>

      {/* SECCIÓN 3: FISCALES */}
      <section className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">💼 Facturación</h2>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1 rounded-full border"><input type="checkbox" checked={requiereFactura} onChange={e => setRequiereFactura(e.target.checked)} /><span className="text-xs font-bold text-slate-600">¿Requiere Factura?</span></label>
        </div>
        {requiereFactura && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="md:col-span-2"><button type="button" onClick={() => setValue("razonSocial", `${watch("nombres")} ${watch("apellidoPaterno")} ${watch("apellidoMaterno") || ""}`.trim().toUpperCase())} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase">Copiar nombre del paciente</button></div>
            <div className="md:col-span-2"><label className={labelStyle}>Razón Social</label><input className={inputStyle} {...register("razonSocial")} /></div>
            <div><label className={labelStyle}>RFC</label><input className={inputStyle} {...register("rfc")} /></div>
            <div><label className={labelStyle}>Código Postal Fiscal</label><input className={inputStyle} {...register("cpFiscal")} /></div>
            <div><label className={labelStyle}>Email Fiscal</label><input className={inputStyle} {...register("emailFacturacion")} /></div>
            <div className="md:col-span-2"><label className={labelStyle}>Régimen Fiscal</label><select className={inputStyle} {...register("regimenFiscal")}>{REGIMENES_FISCALES.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelStyle}>Uso CFDI</label><select className={inputStyle} {...register("usoCFDI")}>{USOS_CFDI.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
          </div>
        )}
      </section>
    </div>
  );
}