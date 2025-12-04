"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Usamos tus notificaciones bonitas

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("¡Bienvenido a SANSCE!");
      router.push("/"); // Te manda al Dashboard
    } catch (error: any) {
      console.error("Error login:", error);
      toast.error("Credenciales incorrectas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">SANSCE</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de Gestión Clínica</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin@sansce.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all disabled:bg-slate-400"
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Acceso exclusivo para personal autorizado.
        </p>
      </div>
    </div>
  );
}