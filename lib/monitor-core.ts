/* lib/monitor-core.ts */
"use client";

// ⚙️ CONFIGURACIÓN DE SENSIBILIDAD
const READ_LIMIT = 100;       // Máximo de peticiones permitidas...
const TIME_WINDOW = 10000;    // ...en este periodo de tiempo (ms)
const STORAGE_KEY = 'SANSCE_EMERGENCY_LOCK';

class ResourceMonitor {
  private reads: number[] = [];
  private locked: boolean = false;
  private listeners: Set<(isLocked: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Al iniciar, verificamos si ya estábamos bloqueados
      this.locked = localStorage.getItem(STORAGE_KEY) === 'true';
    }
  }

  // 📡 Método principal llamado por el Guardia
  trackRead() {
    if (this.locked) return; // Si ya está bloqueado, no hacemos nada

    const now = Date.now();
    this.reads.push(now);

    // Limpiamos lecturas viejas (fuera de la ventana de 10s)
    const windowStart = now - TIME_WINDOW;
    this.reads = this.reads.filter(timestamp => timestamp > windowStart);

    // 🚨 VERIFICACIÓN DE ANOMALÍA
    if (this.reads.length > READ_LIMIT) {
      this.triggerEmergency();
    }
  }

  triggerEmergency() {
    this.locked = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    this.notifyListeners();
    console.error("🔥 TRÁFICO ANÓMALO DETECTADO: SISTEMA BLOQUEADO 🔥");
  }

  unlockSystem() {
    this.locked = false;
    this.reads = []; // Reiniciamos contador
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notifyListeners();
    window.location.reload(); // Recarga fresca para reiniciar la app
  }

  isLocked() {
    return this.locked;
  }

  // Patrón Observador para que React se entere
  subscribe(listener: (isLocked: boolean) => void) {
    this.listeners.add(listener);
    listener(this.locked); // Emitir estado actual al suscribirse
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.locked));
  }
}

// Exportamos una única instancia (Singleton)
export const monitor = new ResourceMonitor();