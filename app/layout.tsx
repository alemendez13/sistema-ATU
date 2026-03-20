// app/layout.tsx
'use client'; // 👈 SANSCE OS: Habilitamos interactividad de ruta
import { Inter } from "next/font/google";
import "./globals.css"; 
import { Toaster } from 'sonner';
import Navbar from "../components/ui/Navbar";
import Sidebar from "../components/ui/Sidebar";
import ResourceMonitorProvider from "../providers/ResourceMonitorProvider";
import { usePathname } from "next/navigation"; // 👈 Detector de ruta

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isKioskMode = pathname === "/rh/reloj"; // 🔒 Identificamos la Tablet
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <ResourceMonitorProvider>
          <Navbar />
          <Sidebar /> 
          
         <main 
            className={`min-h-screen transition-all duration-300 ease-in-out ${
              isKioskMode ? "p-0" : "pt-20 pb-10 px-4 md:px-8"
            }`}
            style={{ paddingLeft: isKioskMode ? '0px' : 'var(--sidebar-width, 80px)' }}
          >
            {children}
          </main>
          
          <Toaster position="top-center" richColors />
        </ResourceMonitorProvider>
      </body>
    </html>
  );
}