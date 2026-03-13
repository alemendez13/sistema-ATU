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
        // Paleta Quirúrgica SANSCE
        sansce: {
          brand: '#2563eb',    // Su azul institucional
          secondary: '#78c9cf', // El color de apoyo detectado
          bg: '#F8FAF8',       // Blanco humo para fondo (descanso visual)
          surface: '#FFFFFF',  // Blanco puro para tarjetas/módulos
          text: '#0F172A',     // Slate-900 para lectura crítica
          muted: '#64748B',    // Slate-500 para datos secundarios
          border: '#E2E8F0',   // Gris suave para líneas divisorias de 1px
        },
        // Semáforos de Seguridad (Elegantes, no chillones)
        status: {
          success: '#10B981',  // Venta completada / Paciente estable
          warning: '#F59E0B',  // Cita pendiente / Stock bajo
          error: '#EF4444',    // Deuda / Urgencia médica
        }
      },
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
};