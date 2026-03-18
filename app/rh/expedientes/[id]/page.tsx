// app/rh/expedientes/[id]/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, FileText, User, CloudUpload, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function ExpedienteEmpleadoPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  // 🔋 ACTIVACIÓN DE CÁMARA (Estándar SANSCE)
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error de cámara:", err);
      }
    }
    startCamera();
  }, []);

  const capturePhoto = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    setStatus('loading');
    
    const context = canvasRef.current.getContext('2d');
    context?.drawImage(videoRef.current, 0, 0, 400, 400);
    const photoBase64 = canvasRef.current.toDataURL('image/jpeg', 0.8);

    // ☁️ GUARDADO EN STORAGE (Identidad Digital)
    const storageRef = ref(storage, `perfiles/${params.id}.jpg`);
    await uploadString(storageRef, photoBase64, 'data_url');
    const url = await getDownloadURL(storageRef);
    
    setPhotoUrl(url);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] p-8">
      {/* Barra de Navegación Superior */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-[#2563eb] transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Volver a Personal</span>
      </button>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: Identidad y Foto */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="relative w-48 h-48 bg-slate-100 rounded-2xl overflow-hidden border-4 border-[#F8FAF8] shadow-inner mb-6">
              {photoUrl ? (
                <img src={photoUrl} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale" />
              )}
              <canvas ref={canvasRef} className="hidden" width="400" height="400" />
            </div>
            
            <button 
              onClick={capturePhoto}
              disabled={status === 'loading'}
              className="w-full py-3 bg-[#2563eb] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {status === 'loading' ? 'Guardando...' : 'Tomar Foto Oficial'}
            </button>
          </div>
        </div>

        {/* COLUMNA 2 y 3: Documentación y Drive */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-medium text-slate-800 flex items-center gap-2">
                <FileText className="text-[#2563eb] w-5 h-5" /> Expediente Documental
              </h2>
              <span className="text-[10px] bg-blue-50 text-[#2563eb] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Google Drive Link</span>
            </div>

            {/* Placeholder para la conexión con Drive (Siguiente Paso) */}
            <div className="border-2 border-dashed border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <CloudUpload className="text-slate-300 w-6 h-6" />
              </div>
              <p className="text-sm text-slate-500 max-w-xs">
                La carpeta de Google Drive se está vinculando. Pronto podrá arrastrar documentos aquí.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}