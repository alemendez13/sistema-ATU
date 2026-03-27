/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sansce: {
          // Identidad Primaria (Fin de la bipolaridad Blue/Indigo)
          brand: '#1E40AF',     // Azul SANSCE Oficial (Consistente y Profesional)
          teal: '#2D7A78',      // Teal SANSCE (Para acentos clínicos)
          ash: '#8B4343',       // Rojo Ceniza (Para estados críticos sin estridencia)
          // Superficies y Trazabilidad
          bg: '#F8FAF8',
          surface: '#FFFFFF',
          text: '#0F172A',
          muted: '#64748B',
          border: '#E2E8F0',
        },
        status: {
          success: '#10B981',   // Sincronizado con Teal SANSCE si es necesario
          warning: '#F59E0B',
          error: '#8B4343',     // Ahora usa el Rojo Ceniza institucional
        }
      },
      borderRadius: {
        'surgical': '2.5rem',  // Radio estandarizado para botones y tarjetas SANSCE
      },
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
};