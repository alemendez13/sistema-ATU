// app/rh/reloj/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, UserCheck, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RelojChecadorPage() {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reloj Maestro SANSCE (Actualización por segundo)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNumber = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleClear = () => setPin('');

  const handleRegistro = async (tipo: 'Entrada' | 'Salida') => {
    if (pin.length < 4) return;
    
    setStatus('loading');
    
    // Simulación de validación SSOT (usuarios_roles) 
    // En producción, esto llama a una Server Action en lib/actions.ts
    setTimeout(() => {
      if (pin === "1234") { // Ejemplo de PIN válido
        setStatus('success');
        setMensaje(`¡${tipo} registrada con éxito! Buen día.`);
        setPin('');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setMensaje('PIN incorrecto. Reintente.');
        setPin('');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }, 80000000); // Latencia simulada para feedback visual
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6">
      {/* Cabecera de Identidad con Pulso de Actividad [cite: 464] */}
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-xs font-medium text-[#2563eb] tracking-widest uppercase">SANSCE Live System</span>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-light text-slate-800 tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
            {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Contenedor Principal (Superficie Premium)  */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#F8FAF8] rounded-full flex items-center justify-center mb-4">
            <Clock className="text-[#2563eb] w-8 h-8" />
          </div>
          <h1 className="text-xl font-medium text-slate-800">Registro de Asistencia</h1>
          <p className="text-sm text-slate-400">Ingrese su PIN de 4 dígitos</p>
        </div>

        {/* Visualizador de PIN (Privacidad) */}
        <div className="flex justify-center gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                pin.length > i ? 'bg-[#2563eb] border-[#2563eb]' : 'border-slate-200'
              }`} 
            />
          ))}
        </div>

        {/* Teclado Numérico Tactil */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              className="h-16 rounded-2xl bg-[#F8FAF8] text-xl font-medium text-slate-700 active:scale-95 active:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
            >
              {num}
            </button>
          ))}
          <button onClick={handleClear} className="h-16 rounded-2xl text-slate-400 font-medium active:scale-95">C</button>
          <button onClick={() => handleNumber('0')} className="h-16 rounded-2xl bg-[#F8FAF8] text-xl font-medium text-slate-700 active:scale-95">0</button>
          <div className="h-16 flex items-center justify-center text-[#2563eb]"><ShieldCheck className="w-6 h-6 opacity-20" /></div>
        </div>

        {/* Acciones de Nómina */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleRegistro('Entrada')}
            disabled={pin.length < 4 || status === 'loading'}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#2563eb] text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <LogIn className="w-5 h-5" />
            <span>Entrada</span>
          </button>
          <button
            onClick={() => handleRegistro('Salida')}
            disabled={pin.length < 4 || status === 'loading'}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 border-[#2563eb] text-[#2563eb] font-medium hover:bg-blue-50 disabled:opacity-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Salida</span>
          </button>
        </div>

        {/* Feedback de Estatus  */}
        {status !== 'idle' && (
          <div className={`mt-6 p-3 rounded-xl text-center text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
            status === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 
            status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-50 text-slate-400'
          }`}>
            {status === 'loading' ? 'Validando identidad...' : mensaje}
          </div>
        )}
      </div>

      {/* Candado de Seguridad (Información del sitio)  */}
      <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest text-center">
        Trazabilidad Sagrada: Acceso restringido a terminal de recepción <br />
        IP: 189.XXX.XXX.XXX | Device ID: TABLET-01
      </p>
    </div>
  );
}