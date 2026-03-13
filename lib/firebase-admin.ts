//lib/firebase-admin.ts
import admin from 'firebase-admin';

// --- INICIO DE CÓDIGO DE DIAGNÓSTICO ---
//console.log("---------------------------------------------------");
//console.log("🔍 DIAGNÓSTICO DE CREDENCIALES FIREBASE:");
//console.log("1. Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
//console.log("2. Email Service Account:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

const privateKey = process.env.GOOGLE_PRIVATE_KEY;
if (privateKey) {
  console.log("3. Private Key detectada (Longitud):", privateKey.length);
  console.log("4. ¿Empieza con -----BEGIN?:", privateKey.trim().startsWith("-----BEGIN"));
  // Verificamos si los saltos de línea se están procesando bien
  const keyFixed = privateKey.replace(/\\n/g, '\n');
  console.log("5. ¿Contiene saltos de línea reales?:", keyFixed.includes('\n'));
} else {
  console.error("❌ ERROR: No se detecta la variable GOOGLE_PRIVATE_KEY");
}
console.log("---------------------------------------------------");
// --- FIN DE CÓDIGO DE DIAGNÓSTICO ---

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY
          ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined,
      }),
    });
    console.log("✅ Firebase Admin inicializado correctamente.");
  } catch (error) {
    console.error("❌ Error al inicializar Firebase Admin:", error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };