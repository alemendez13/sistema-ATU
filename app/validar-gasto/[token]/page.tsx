"use client";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from "@/lib/firebase-guard";
import { db } from "@/lib/firebase";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";

export default function ValidarGastoPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'done'>('loading');

  useEffect(() => {
    const procesarAprobacion = async () => {
      try {
        // 1. Localizar la solicitud única por su Token de Seguridad
        const qVal = query(
          collection(db, "validaciones_gastos"),
          where("token", "==", params.token),
          where("estatus", "==", "Pendiente")
        );
        const snapVal = await getDocs(qVal);

        if (snapVal.empty) {
            // Si no está pendiente, verificamos si ya fue aprobada
            const qOld = query(collection(db, "validaciones_gastos"), where("token", "==", params.token));
            const snapOld = await getDocs(qOld);
            return setStatus(!snapOld.empty ? 'done' : 'error');
        }

        const validacionDoc = snapVal.docs[0];
        const vData = validacionDoc.data();
        const batch = writeBatch(db);

        // 2. Definir la ventana de tiempo del corte (Día de la solicitud)
        const fechaReq = vData.creadoEn.toDate();
        const inicioDia = new Date(fechaReq); inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fechaReq); finDia.setHours(23, 59, 59, 999);

        // 3. Buscar todos los gastos de ese día que no han sido validados
        const qGastos = query(
            collection(db, "gastos"),
            where("fecha", ">=", inicioDia),
            where("fecha", "<=", finDia)
        );
        const snapGastos = await getDocs(qGastos);

        // 4. Aplicar Firma Digital Ejecutiva en bloque (Batch)
        snapGastos.forEach((gDoc) => {
            if (!gDoc.data().validado) {
                batch.update(gDoc.ref, {
                    validado: true,
                    validadoPor: "Alejandra Méndez (Firma Digital Email)",
                    fechaValidacion: serverTimestamp()
                });
            }
        });

        // 5. Sellar la solicitud como Aprobada
        batch.update(validacionDoc.ref, { 
            estatus: "Aprobado",
            aprobadoEn: serverTimestamp() 
        });

        await batch.commit();
        setStatus('success');

        // Autocierre: Después de 3 segundos, la pestaña se puede cerrar sola
        setTimeout(() => { if (typeof window !== 'undefined') window.close(); }, 3500);

      } catch (error) {
        console.error("Fallo en aprobación:", error);
        setStatus('error');
      }
    };

    procesarAprobacion();
  }, [params.token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white text-center animate-in zoom-in-95 duration-500">
        
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="flex justify-center"><Loader2 className="animate-spin text-amber-500" size={60} /></div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Validando Caja Chica...</h1>
            <p className="text-slate-400 text-sm">SANSCE OS está verificando el token de seguridad.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex justify-center animate-bounce"><CheckCircle2 className="text-emerald-500" size={80} /></div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">¡Corte Aprobado!</h1>
            <p className="text-slate-500 font-medium">La firma de Dirección ha sido aplicada correctamente en Firebase.</p>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-700 text-xs font-bold justify-center">
                <ShieldCheck size={18} /> OPERACIÓN SEGURA
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-6 text-slate-400 grayscale">
            <div className="flex justify-center"><CheckCircle2 size={80} /></div>
            <h1 className="text-xl font-bold uppercase">Ya fue procesado</h1>
            <p className="text-xs">Esta solicitud de aprobación ya fue utilizada anteriormente.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center"><XCircle className="text-red-500" size={80} /></div>
            <h1 className="text-xl font-bold text-red-800 uppercase">Enlace Inválido</h1>
            <p className="text-slate-500 text-sm">El token ha expirado o no existe en el sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
}