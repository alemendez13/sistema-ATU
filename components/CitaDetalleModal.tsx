/* components/CitaDetalleModal.tsx */
"use client";
import { useState } from "react";
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "sonner";
import WhatsAppButton from "./ui/WhatsAppButton";
import { MENSAJES } from "../lib/whatsappTemplates";
import { cancelarCitaGoogle } from "../lib/actions";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: any; 
  onEditar?: (cita: any) => void;
}

// 👇 CORRECCIÓN 1: Agregamos 'onEditar' aquí para poder usarlo
export default function CitaDetalleModal({ isOpen, onClose, cita, onEditar }: ModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !cita) return null;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const nuevoEstado = !cita.confirmada;
      await updateDoc(doc(db, "citas", cita.id), { confirmada: nuevoEstado });
      toast.success(nuevoEstado ? "✅ Paciente Confirmado" : "⚠️ Confirmación retirada");
      onClose();
    } catch (e) {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm("¿Estás seguro de cancelar esta cita? Se borrará de la agenda y la deuda asociada.")) return;
    setLoading(true);
    try {
      
      // 1. Borrar de Google (Si tiene ID y Calendario)
      const calendarIdReal = cita.doctorCalendarId || cita.calendarId; 
      
      if (cita.googleEventId && calendarIdReal) { 
           console.log("Intentando borrar de Google...", { calendarIdReal, eventId: cita.googleEventId });
           
           await cancelarCitaGoogle({
               calendarId: calendarIdReal,
               eventId: cita.googleEventId
           });
      } else {
           console.warn("No se borró de Google: Faltan datos (ID Evento o ID Calendario)", cita);
      }

      // 2. Borrar Deuda en Caja
      try {
          let q;
          if (cita.pacienteId) {
              q = query(
                  collection(db, "operaciones"),
                  where("pacienteId", "==", cita.pacienteId),
                  where("doctorId", "==", cita.doctorId), 
                  where("estatus", "==", "Pendiente de Pago")
              );
          } else {
              q = query(
                  collection(db, "operaciones"),
                  where("pacienteNombre", "==", cita.paciente),
                  where("doctorNombre", "==", cita.doctorNombre),
                  where("estatus", "==", "Pendiente de Pago")
              );
          }
          const snapshot = await getDocs(q);
          snapshot.forEach(async (docOp) => {
              await deleteDoc(doc(db, "operaciones", docOp.id));
          });
      } catch (errFinanzas) {
          console.error("Nota: No se pudo limpiar finanzas", errFinanzas);
      }

      // 3. Borrar de Firebase (Agenda Local)
      await deleteDoc(doc(db, "citas", cita.id));
      
      toast.success("🗑️ Cita y cargo eliminados correctamente");
      onClose();

    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarMensajeEnviado = async () => {
    try {
        const batch = writeBatch(db);
        // Buscamos todos los bloques de esta cita (por si dura más de 30 min)
        const q = query(
            collection(db, "citas"), 
            where("googleEventId", "==", cita.googleEventId)
        );
        const snap = await getDocs(q);
        
        snap.forEach((doc) => {
            batch.update(doc.ref, { mensajeEnviado: true });
        });

        await batch.commit();
        // Cerramos el modal para que el usuario vea el cambio en la agenda
        onClose(); 
    } catch (e) {
        console.error("Error al marcar envío:", e);
    }
};

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        
        {/* 👇 CORRECCIÓN 2: Header ACTUALIZADO con botón Editar */}
        <div className="p-4 bg-slate-50 border-b flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{cita.paciente}</h2>
            <p className="text-sm text-slate-500">
              {cita.fecha} a las <span className="font-bold text-slate-800">{cita.hora} hrs</span>
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
              {/* Botón Editar */}
              {onEditar && (
                <button 
                    onClick={() => onEditar(cita)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-bold uppercase"
                >
                    ✏️ Editar
                </button>
              )}

              <button 
                  onClick={onClose} 
                  className="text-slate-400 hover:text-slate-600 text-2xl px-2 ml-2"
              >
                  ×
              </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Detalles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
               <label className="text-[10px] uppercase font-bold text-blue-600">Doctor</label>
               <p className="font-medium text-slate-800">{cita.doctorNombre}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
               <label className="text-[10px] uppercase font-bold text-slate-500">Motivo</label>
               <p className="font-medium text-slate-800">{cita.motivo || "Consulta General"}</p>
            </div>
          </div>

          {/* Acciones de Comunicación */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-400 uppercase">Comunicación</label>
             <div className="grid grid-cols-1 gap-2">
                {cita.telefono || cita.telefonoCelular ? (
                    <WhatsAppButton 
                        telefono={cita.telefono || cita.telefonoCelular}
                        mensaje={MENSAJES.RECORDATORIO(cita.paciente, cita.fecha, cita.hora)}
                        label="Enviar Recordatorio"
                        pacienteNombre={cita.paciente}
                        tipo="Confirmación"
                        onSuccess={handleMarcarMensajeEnviado}
                    />
                ) : (
                    <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded border border-orange-100 text-center">
                        ⚠️ No hay teléfono registrado en la cita.
                    </div>
                )}
             </div>
          </div>

          {/* Acciones Críticas */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
             <button 
                onClick={handleCancelar}
                disabled={loading}
                className="flex-1 py-3 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
             >
                {loading ? "..." : "🗑️ Cancelar Cita"}
             </button>

             <button 
                onClick={handleConfirmar}
                disabled={loading}
                className={`flex-1 py-3 rounded-lg font-bold text-white shadow transition-all flex items-center justify-center gap-2 ${
                    cita.confirmada ? "bg-slate-500 hover:bg-slate-600" : "bg-green-600 hover:bg-green-700"
                }`}
             >
                {cita.confirmada ? "↩️ Des-confirmar" : "👍 Confirmar"}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}