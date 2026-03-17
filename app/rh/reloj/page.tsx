// app/rh/reloj/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react'; // ✅ Agregamos useRef
import { Clock, UserCheck, LogIn, LogOut, ShieldCheck, Camera } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebase'; // ✅ Acceso a la nube (Storage)
import { ref, uploadString, getDownloadURL } from 'firebase/storage'; // ✅ Herramientas de subida
import { registrarAsistenciaAction } from '@/lib/actions'; // ✅ Acción del servidor

export default function RelojChecadorPage() {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 🛡️ REFS SANSCE: Control directo de hardware (Video y Captura)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🔋 MOTOR DE CÁMARA: Activación segura al cargar la página
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 400, height: 300 } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Acceso a cámara denegado:", err);
        setMensaje("Error: Verifique permisos de cámara en la tablet.");
        setStatus("error");
      }
    }
    startCamera();
    // 🛡️ CLEANUP: Apagamos la cámara al salir de la pantalla para ahorrar batería
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

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

    try {
      // 1. CAPTURA DE EVIDENCIA (Biometría Visual)
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) throw new Error("Hardware de cámara no disponible");

      const context = canvas.getContext('2d');
      if (context) context.drawImage(video, 0, 0, 400, 300);
      
      // Convertimos a JPG comprimido (60%) para ahorro radical de almacenamiento
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.6);

      // 2. DEPÓSITO EN LA NUBE (Firebase Storage)
      const fileName = `asistencias/${new Date().toISOString().split('T')[0]}/${pin}-${tipo}-${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      
      await uploadString(storageRef, photoBase64, 'data_url');
      const photoUrl = await getDownloadURL(storageRef);

      // 3. REGISTRO OFICIAL (SANSCE OS Server Action)
      // Nota: Asegúrese de tener la función registrarAsistenciaAction en lib/actions.ts
      const result = await registrarAsistenciaAction(pin, tipo, photoUrl);

      if (result.success) {
        setStatus('success');
        setMensaje(result.message || `¡${tipo} registrada con éxito!`);
        setPin('');
      } else {
        setStatus('error');
        setMensaje(result.error || 'Error en validación');
        setPin('');
      }
    } catch (error: any) {
      console.error("Error en proceso de asistencia:", error);
      setStatus('error');
      setMensaje("Error técnico de conexión. Reintente.");
      setPin('');
    } finally {
      // Limpieza de estado después de mostrar el resultado
      setTimeout(() => setStatus('idle'), 4000);
    }
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

        {/* 📸 VISOR DE BIOMETRÍA VISUAL (Evidence Capture) */}
        <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden mb-8 border-4 border-[#F8FAF8] shadow-sm">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover grayscale opacity-90"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]" />
            <span className="text-[9px] text-white font-mono uppercase tracking-widest">Live Evidence</span>
          </div>
          {/* Canvas oculto para el procesamiento de la foto */}
          <canvas ref={canvasRef} className="hidden" width="400" height="300" />
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