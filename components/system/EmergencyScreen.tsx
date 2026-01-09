/* components/system/EmergencyScreen.tsx */
"use client";
import { useState } from "react";
import { monitor } from "../../lib/monitor-core";

export default function EmergencyScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "F4b1S-JoY1T0" || password === "SANSCE2025") {
      monitor.unlockSystem();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-red-900 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-red-400/50 shadow-2xl text-center">
        <div className="text-6xl mb-4">🛡️</div>
        <h1 className="text-3xl font-black mb-2">MODO DE EMERGENCIA</h1>
        <p className="text-red-100 mb-6 font-medium">
          El sistema ha detectado un consumo anómalo de recursos y se ha bloqueado para proteger la base de datos.
        </p>

        {/* 👇 AQUÍ ESTÁ LA CORRECCIÓN: Usamos &gt; en lugar de > */}
        <div className="bg-black/20 p-4 rounded-lg mb-6 text-left">
          <p className="text-xs text-red-200 uppercase font-bold">Diagnóstico:</p>
          <p className="font-mono text-sm mt-1">&gt; Tráfico inusual detectado.</p>
          <p className="font-mono text-sm">&gt; +100 lecturas en 10s.</p>
          <p className="font-mono text-sm">&gt; Conexión a Firebase: PAUSADA.</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-red-200 uppercase mb-1 text-left">Contraseña de Admin</label>
            <input 
              type="password" 
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              className="w-full bg-white/20 border border-red-300/30 rounded px-4 py-3 text-white placeholder-red-200/50 outline-none focus:ring-2 focus:ring-white/50"
              placeholder="••••••••"
            />
            {error && <p className="text-xs text-red-300 mt-2 font-bold text-left">⛔ Clave incorrecta</p>}
          </div>
          
          <button className="w-full bg-white text-red-900 font-black py-3 rounded hover:bg-red-50 transition-colors">
            DESBLOQUEAR SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
}