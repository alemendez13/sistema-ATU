/* components/pacientes/PatientActions.tsx */
"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "@/lib/firebase-guard";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { db, storage } from "../../lib/firebase"; 
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paciente } from "../../types"; 
import { cleanPrice, generateSearchTags } from "../../lib/utils";
import FormularioPacienteBase from "../forms/FormularioPacienteBase";

interface Props {
  pacienteId: string;
  datosActuales: Paciente;
  descuentos: any[];
}

export default function PatientActions({ pacienteId, datosActuales, descuentos }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bloqueoDuplicado, setBloqueoDuplicado] = useState(false);
  // Estados para archivos y teléfonos dinámicos
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [listaTelefonos, setListaTelefonos] = useState<string[]>(
    datosActuales.telefonos && datosActuales.telefonos.length > 0 
    ? datosActuales.telefonos 
    : [(datosActuales as any).telefonoCelular || ""]
  );
  const [requiereFactura, setRequiereFactura] = useState(!!datosActuales.datosFiscales?.rfc);
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState<any>(null);

  // Inicialización del motor de formulario con mapeo exhaustivo de datos
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
        ...datosActuales,
        // ✅ MAPEO EXPLÍCITO: Asegura que los campos anidados de Firebase aparezcan en el formulario
        tipoPersona: datosActuales.datosFiscales?.tipoPersona || "Fisica",
        razonSocial: datosActuales.datosFiscales?.razonSocial || "",
        rfc: datosActuales.datosFiscales?.rfc || "",
        regimenFiscal: datosActuales.datosFiscales?.regimenFiscal || "",
        usoCFDI: datosActuales.datosFiscales?.usoCFDI || "",
        cpFiscal: datosActuales.datosFiscales?.cpFiscal || "",
        emailFacturacion: datosActuales.datosFiscales?.emailFacturacion || ""
    }
  });

  // Lógica Teléfonos
  const agregarTelefono = () => setListaTelefonos([...listaTelefonos, ""]);
  const actualizarTelefono = (i: number, v: string) => { 
    const n = [...listaTelefonos]; n[i] = v; setListaTelefonos(n); 
  };
  const eliminarTelefono = (i: number) => { 
    if (listaTelefonos.length > 1) setListaTelefonos(listaTelefonos.filter((_, idx) => idx !== i)); 
  };

  const handleDelete = async () => {
    if (!confirm("⚠️ ¿Eliminar paciente permanentemente? Esto borrará su historial.")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "pacientes", pacienteId));
      toast.success("Paciente eliminado");
      router.push("/pacientes");
    } catch (error) { toast.error("Error al eliminar"); } 
    finally { setLoading(false); }
  };

  const onUpdate = async (data: any) => {
    //Seguridad Extra (No confiar solo en UI deshabilitada)
    if (bloqueoDuplicado) {
        toast.error("No se puede guardar: Datos duplicados con otro paciente.");
        return;
    }
    setLoading(true);
    try {
      let finalFotoUrl = datosActuales.fotoUrl || null;

      if (fotoFile) {
          const storageRef = ref(storage, `pacientes/fotos/${Date.now()}_${fotoFile.name}`);
          const snap = await uploadBytes(storageRef, fotoFile);
          finalFotoUrl = await getDownloadURL(snap.ref);
      }

      const nombreNormalizado = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ""}`.trim().toUpperCase();

      const dataToUpdate = {
        ...data,
        nombreCompleto: nombreNormalizado,
        searchKeywords: generateSearchTags(nombreNormalizado),
        fotoUrl: finalFotoUrl,
        
        // ✅ TRAZABILIDAD DUAL: Asegura que el Directorio no se rompa
        telefonos: listaTelefonos.filter(t => t.trim() !== ""),
        telefonoCelular: listaTelefonos[0] || "",
        
        convenioId: descuentoSeleccionado?.id || data.convenioId || null,

        datosFiscales: requiereFactura ? {
            tipoPersona: data.tipoPersona,
            razonSocial: data.razonSocial.toUpperCase(),
            rfc: data.rfc.toUpperCase(),
            regimenFiscal: data.regimenFiscal,
            usoCFDI: data.usoCFDI,
            cpFiscal: data.cpFiscal,
            emailFacturacion: data.emailFacturacion,
            ultimaEdicion: serverTimestamp()
        } : null 
      };

      await updateDoc(doc(db, "pacientes", pacienteId), dataToUpdate);
      
      toast.success("Expediente actualizado");
      setIsEditing(false);
      router.refresh();
    } catch (error) { toast.error("Error al actualizar"); } 
    finally { setLoading(false); }
  };

  // Reseteo de seguridad al abrir/cerrar modal
  useEffect(() => {
    if (isEditing) {
        setBloqueoDuplicado(false);
    }
  }, [isEditing]);

  return (
    <>
      <div className="flex gap-2 mt-4">
          <button onClick={() => setIsEditing(true)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition">
            ✏️ Editar Expediente
          </button>
          <button onClick={handleDelete} className="bg-red-50 text-red-600 px-3 rounded-lg hover:bg-red-100 transition">
            🗑️
          </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">Actualizar Datos de Paciente</h2>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>

            <form onSubmit={handleSubmit(onUpdate)} className="overflow-y-auto p-6 space-y-6 flex-1">
                <FormularioPacienteBase 
                    register={register}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    listaTelefonos={listaTelefonos}
                    actualizarTelefono={actualizarTelefono}
                    agregarTelefono={agregarTelefono}
                    eliminarTelefono={eliminarTelefono}
                    descuentos={descuentos}
                    setDescuentoSeleccionado={setDescuentoSeleccionado}
                    requiereFactura={requiereFactura}
                    setRequiereFactura={setRequiereFactura}
                    setFotoFile={setFotoFile}
                    currentFotoUrl={datosActuales.fotoUrl || undefined}
                    isEditing={true}
                    // Pasamos la función obligatoria
                    setBloqueoDuplicado={setBloqueoDuplicado}
                    datosActuales={datosActuales} // Aseguramos que se pase para que la lógica de "ignorarse a sí mismo" funcione
                />
            </form>

            <div className="p-4 border-t bg-slate-50 flex gap-4 justify-end">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 font-medium">
                    Cancelar
                </button>
                <button 
                    type="submit"
                    onClick={handleSubmit(onUpdate)}
                    disabled={loading || bloqueoDuplicado} // Bloqueo visual
                    className={`px-6 py-2 text-white font-bold rounded-lg shadow transition-colors disabled:opacity-50 ${
                        bloqueoDuplicado 
                        ? "bg-slate-400 cursor-not-allowed" 
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {bloqueoDuplicado 
                        ? "⛔ Duplicado Detectado" 
                        : (loading ? "Sincronizando..." : "💾 Guardar Cambios")
                    }
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}