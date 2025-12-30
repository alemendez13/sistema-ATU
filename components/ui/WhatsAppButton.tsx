/* components/ui/WhatsAppButton.tsx */
"use client";
import { useState, useEffect } from "react";
import { formatearCelular } from "../../lib/whatsappTemplates";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "sonner";

interface WhatsAppButtonProps {
  telefono: string;
  mensaje: string;
  label?: string; 
  compact?: boolean; 
  // 👇 DATOS NUEVOS PARA EL RASTREO
  pacienteId?: string;    // Para saber a quién le escribimos
  pacienteNombre?: string; // Para reportes legibles
  tipo?: "Confirmación" | "Cobranza" | "Información" | "Otro"; // Para clasificar
  onSuccess?: () => void;
}

export default function WhatsAppButton({ 
  telefono, 
  mensaje, 
  label = "Enviar WhatsApp", 
  compact = false,
  pacienteId = "EXTERNO",
  pacienteNombre = "Desconocido",
  tipo = "Información",
  onSuccess
}: WhatsAppButtonProps) {
  
  const [bloqueado, setBloqueado] = useState(false);
  const [contador, setContador] = useState(0);

  useEffect(() => {
    let timer: any;
    if (bloqueado && contador > 0) {
      timer = setTimeout(() => setContador(contador - 1), 1000);
    } else if (contador === 0) {
      setBloqueado(false);
    }
    return () => clearTimeout(timer);
  }, [bloqueado, contador]);

  const handleClick = async () => {
    if (!telefono) return alert("Este paciente no tiene celular registrado.");
    
    // 1. Abrir WhatsApp INMEDIATAMENTE (Para que se sienta rápido)
    const numeroLimpio = formatearCelular(telefono);
    const textoCodificado = encodeURIComponent(mensaje);
    const url = `https://wa.me/${numeroLimpio}?text=${textoCodificado}`;
    window.open(url, "_blank");

    // 2. Activar bloqueo visual
    setBloqueado(true);
    setContador(5);

    // 3. 🕵️ EL ESPÍA: Guardar el registro en Firebase (Silenciosamente)
    try {
        await addDoc(collection(db, "historial_mensajes"), {
            pacienteId,
            pacienteNombre,
            telefono: numeroLimpio,
            tipo, // Confirmación, Cobranza, etc.
            fecha: serverTimestamp(),
            fechaLegible: new Date().toLocaleDateString('es-MX'),
            usuario: "Sistema" // Aquí podríamos poner el usuario logueado si quisieras
        });
        console.log("✅ Envío registrado en bitácora");
        // No mostramos toast aquí para no saturar, es un proceso de fondo.
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error registrando mensaje:", error);
    }
  };

  // Diseño Visual
  const estiloBase = compact 
    ? "p-2 rounded text-xs" 
    : "px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 w-full justify-center";

  const estiloActivo = "bg-green-500 text-white hover:bg-green-600 shadow-sm";
  const estiloBloqueado = "bg-gray-300 text-gray-500 cursor-wait";

  return (
    <button
      onClick={handleClick}
      disabled={bloqueado}
      className={`${estiloBase} ${bloqueado ? estiloBloqueado : estiloActivo} transition-all`}
      title={bloqueado ? "Registrando envío..." : `Enviar ${tipo}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
      </svg>
      
      {!compact && (
        <span>
          {bloqueado ? `Registrando...` : label}
        </span>
      )}
    </button>
  );
}