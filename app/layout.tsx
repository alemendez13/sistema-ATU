import { Inter } from "next/font/google";
import "./globals.css"; 
import { Toaster } from 'sonner';
// 👇 1. Importamos el componente que creamos en el paso anterior
import Navbar from "../components/ui/Navbar"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SANSCE | Sistema Clínico",
  description: "Plataforma de gestión ATU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        
        {/* 👇 2. AQUÍ VA EL NUEVO MENÚ (Que ya incluye el logo adentro) */}
        <Navbar />
        
        {/* ❌ EL BLOQUE ANTIGUO DEL LOGO SE BORRA COMPLETO ❌ */}

        {/* 👇 3. Ajustamos el padding-top a 'pt-20' (antes era pt-28) */}
        {/* Esto es porque la barra es más compacta y necesitamos menos espacio arriba */}
        <main className="min-h-screen pt-20 pb-10 px-4 md:px-8">
          {children}
        </main>
        
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}