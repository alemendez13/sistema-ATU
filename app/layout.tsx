import { Inter } from "next/font/google";
import "./globals.css"; 
import { Toaster } from 'sonner';
import Navbar from "../components/ui/Navbar";
import Sidebar from "../components/ui/Sidebar";
import ResourceMonitorProvider from "../providers/ResourceMonitorProvider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <ResourceMonitorProvider>
          <Navbar />
          <Sidebar /> 
          
          <main className="min-h-screen pt-20 pb-10 px-4 md:px-8 with-sidebar">
            {children}
          </main>
          
          <Toaster position="top-center" richColors />
        </ResourceMonitorProvider>
      </body>
    </html>
  );
}