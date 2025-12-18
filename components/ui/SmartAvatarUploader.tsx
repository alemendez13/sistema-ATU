"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";

interface Props {
  currentImageUrl?: string | null;
  onImageSelected: (file: File) => void;
}

export default function SmartAvatarUploader({ currentImageUrl, onImageSelected }: Props) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. ABRIR CÁMARA
  const startCamera = async () => {
    setShowMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      setShowCamera(true);
      // Pequeño delay para asegurar que el modal renderizó el videoRef
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
      streamRef.current = stream;
    } catch (err) {
      console.error(err);
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  // 2. TOMAR FOTO
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camara_${Date.now()}.jpg`, { type: "image/jpeg" });
          handleFile(file);
          stopCamera();
        }
      }, "image/jpeg", 0.8);
    }
  };

  // 3. CERRAR CÁMARA
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // 4. MANEJAR ARCHIVO (Sea de cámara o input)
  const handleFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onImageSelected(file);
  };

  // 5. MANEJAR INPUT DE ARCHIVO
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    setShowMenu(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 relative">
      
      {/* AVATAR */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-50 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl text-slate-300">📷</span>
          )}
        </div>
        
        {/* BOTÓN + */}
        <button 
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        {/* MENÚ DESPLEGABLE */}
        {showMenu && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-slate-100 p-2 w-40 z-20 flex flex-col gap-1">
             <button 
                type="button"
                onClick={startCamera}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700 text-sm rounded text-left w-full"
             >
                📸 Usar Cámara
             </button>
             <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700 text-sm rounded text-left w-full"
             >
                📁 Subir Archivo
             </button>
          </div>
        )}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={onFileInputChange} 
      />

      {/* MODAL DE CÁMARA */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl overflow-hidden max-w-md w-full relative">
            <video ref={videoRef} autoPlay playsInline className="w-full bg-black aspect-square object-cover" />
            
            <div className="p-4 flex justify-between items-center bg-slate-900 text-white">
               <button type="button" onClick={stopCamera} className="text-sm font-bold text-slate-400 hover:text-white">Cancelar</button>
               <button 
                  type="button" 
                  onClick={capturePhoto} 
                  className="h-12 w-12 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:scale-110 transition"
               >
                  <div className="h-10 w-10 rounded-full bg-slate-900 border-2 border-white"></div>
               </button>
               <div className="w-12"></div> {/* Spacer */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}