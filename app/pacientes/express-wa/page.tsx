/* app/pacientes/express-wa/page.tsx */
"use client";
import { useState } from "react";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function WhatsAppExpress() {
    const [nombre, setNombre] = useState("");
    const [whatsapp, setWhatsapp] = useState("");

    const LINK_REGISTRO = "https://registro-paciente.netlify.app"; // URL de la app externa de autollenado
    const mensajeFinal = `¡Hola ${nombre}! 👋 Bienvenida(o) a Clínica SANSCE. 🌿\n\nPara agilizar tu atención, te pedimos completar tu registro en el siguiente vínculo:\n\n🔗 ${LINK_REGISTRO}\n\n¡Muchas gracias!`;

    return (
        <ProtectedRoute>
            <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📲</div>
                    <h2 className="text-2xl font-bold text-slate-800">Registro Express</h2>
                    <p className="text-sm text-slate-500 mt-1">Envío de formulario a paciente nuevo.</p>
                </div>
                
                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nombre del Paciente</label>
                        <input 
                            type="text" 
                            className="w-full border-2 border-slate-100 focus:border-indigo-500 p-4 rounded-2xl mt-1 uppercase outline-none transition-all font-medium" 
                            placeholder="Nombre y Apellido"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">WhatsApp (10 dígitos)</label>
                        <input 
                            type="tel" 
                            className="w-full border-2 border-slate-100 focus:border-indigo-500 p-4 rounded-2xl mt-1 outline-none transition-all font-medium" 
                            placeholder="5500000000"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                        />
                    </div>

                    <div className="pt-4">
                        <WhatsAppButton 
                            telefono={whatsapp}
                            mensaje={mensajeFinal}
                            label="Enviar Link de Autollenado"
                            soloEnvio={true} // 🛡️ Evita guardar en Firebase
                        />
                        <p className="text-[10px] text-center text-slate-400 mt-4 px-6 italic">
                            * Esta acción no crea un expediente en el sistema hasta que el paciente complete el formulario.
                        </p>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}