const fs = require('fs');
const csv = require('csv-parser');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 1. Configuración
const serviceAccount = require('../atu-sistema-firebase-adminsdk-fbsvc-2ff732003e.json'); 

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true }); 

const BATCH_SIZE = 400; 

async function importar() {
  const pacientes = [];
  
  console.log("📖 Leyendo CSV...");

  if (!fs.existsSync('pacientes_import.csv')) {
    console.error("❌ Error: No encuentro el archivo 'pacientes_import.csv'.");
    return;
  }

  // --- CORRECCIÓN AQUÍ ---
  fs.createReadStream('pacientes_import.csv')
    .pipe(csv({
        // ESTA ES LA MAGIA: Limpia espacios y caracteres invisibles (BOM) de los títulos
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
    }))
    .on('data', (row) => {
      
      // DIAGNÓSTICO: Si es la primera fila, imprímela para ver qué está leyendo
      if (pacientes.length === 0) {
          console.log("🔍 DIAGNÓSTICO - Primera fila detectada:", JSON.stringify(row));
      }

      // Intentamos leer el nombre. Si falla la primera opción, probamos variaciones comunes
      const nombre = row['NOMBRE DEL PACIENTE'] || row['Nombre del Paciente'] || row['NOMBRE'];

      if (!nombre) return; // Si sigue sin encontrarlo, salta

      // Limpieza de Teléfono
      const rawTel = row['Nº DE TEL. MÓVIL 1'] || row['Nº DE TEL. FIJO'] || "";
      const telefonoLimpio = rawTel.replace(/\D/g, ''); 

      const pacienteNuevo = {
        // Datos Personales (Ajustados a tus encabezados reales)
        nombreCompleto: row['NOMBRE DEL PACIENTE'].toUpperCase().trim(),
        email: row['CORREO ELECTRÓNICO PERSONAL'] || "",
        telefonoCelular: telefonoLimpio,
        
        // OJO: Aquí corregí mayúsculas/minúsculas según tu Excel
        fechaNacimiento: row['FECHA DE NACIMIENTO'] || "", 
        
        genero: row['GENERO'] || "No especificado",
        ocupacion: row['OCUPACIÓN'] || "",
        religion: row['RELIGIÓN'] || "",
        estadoCivil: row['ESTADO CIVIL'] || "",
        escolaridad: row['ESCOLARIDAD'] || "",
        lugarResidencia: row['UBICACIÓN'] || "",
        
        // Marketing (Encabezados corregidos)
        medioMarketing: row['REFERENCIA'] || "",
        referidoPor: row['Nombre de la persona que refiere'] || "",
        tutor: row['PADRE O TUTOR'] || null,

        // Datos Fiscales
        datosFiscales: row['RFC'] ? {
            tipoPersona: row['TIPO DE CLIENTE'] || "Fisica",
            razonSocial: row['RAZÓN SOCIAL'] || row['NOMBRE DEL PACIENTE'],
            rfc: row['RFC'].replace(/\s/g, '').toUpperCase(),
            regimenFiscal: row['RÉGIMEN FISCAL'] || "",
            usoCFDI: row['TIPO DE CFDI'] || "",
            cpFiscal: row['CÓDIGO POSTAL'] || "",
            emailFacturacion: row['CORREO ELECTRÓNICO FACTURACIÓN'] || ""
        } : null,

        // Metadatos
        fechaRegistro: new Date(), 
        importado: true, 
        historialMedicoPrevio: row['ESPECIALISTA'] || ""
      };
      
      pacientes.push(pacienteNuevo);
    })
    .on('end', async () => {
      console.log(`✅ Lectura terminada. Se encontraron ${pacientes.length} registros.`);
      
      if (pacientes.length === 0) {
        console.log("⚠️ CSV vacío o encabezados no coinciden.");
        return;
      }

      console.log("🚀 Cargando a Firebase...");

      let batch = db.batch();
      let contador = 0;
      let totalSubidos = 0;

      for (const p of pacientes) {
          const ref = db.collection('pacientes').doc(); 
          batch.set(ref, p);
          contador++;

          if (contador >= BATCH_SIZE) {
              await batch.commit();
              totalSubidos += contador;
              console.log(`📦 Progreso: ${totalSubidos} guardados...`);
              batch = db.batch(); 
              contador = 0;
          }
      }

      if (contador > 0) {
          await batch.commit();
          totalSubidos += contador;
      }

      console.log(`🎉 ¡ÉXITO! ${totalSubidos} pacientes importados.`);
    });
}

importar();