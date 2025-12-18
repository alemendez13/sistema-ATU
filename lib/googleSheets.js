import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { unstable_cache } from 'next/cache';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
  : undefined,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// --- FUNCIÓN 1: SOLO MÉDICOS ---
const getMedicosRaw = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  
  const sheetMedicos = doc.sheetsByTitle['MEDICOS_Y_AGENDA'];
  const rowsMedicos = await sheetMedicos.getRows();
  
  return rowsMedicos.map(row => ({
    id: row.get('ID Médico'),
    nombre: row.get('Nombre Completo'),
    especialidad: row.get('Especialidad'),
    color: row.get('Color Agenda'),
    reglasHorario: row.get('Reglas Horario') || "1,2,3,4,5|09:00-20:00",
    calendarId: row.get('Calendar ID'),
    // 👇 VERIFICA QUE ESTÉN ESTAS DOS LÍNEAS:
    email: row.get('Email') || "", 
    porcentajeComision: row.get('Comision') || "0" 
  }));
};

// --- FUNCIÓN 2: SOLO SERVICIOS (Para Ventas) ---
const getServiciosRaw = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();

  const sheetServicios = doc.sheetsByTitle['CATALOGO_MAESTRO'];
  const rowsServicios = await sheetServicios.getRows();
  
  return rowsServicios.map(row => {
    const nombre = row.get('Nombre Servicio/Producto') || "";
    const sku = row.get('SKU (ID)') || "";
    let area = row.get('Especialidad'); 

    if (!area) {
        if (nombre.includes("Psicología") || sku.includes("PSIC")) area = "Psicología";
        else if (nombre.includes("Nutrición") || sku.includes("NUT")) area = "Nutrición";
        else if (nombre.includes("Fisioterapia") || sku.includes("FIS")) area = "Fisioterapia";
        else if (nombre.includes("Cardio") || sku.includes("CAR")) area = "Cardiología";
        else if (nombre.includes("Medicina") || sku.includes("MED")) area = "Medicina General";
        else area = "General";
    }

    return {
        sku: sku,
        nombre: nombre,
        precio: row.get('Precio Público'),
        tipo: row.get('Tipo') || 'Servicio',
        duracion: row.get('Duración (mins)'),
        observaciones: row.get('Observaciones'),
        area: area
    };
  });
};

// Exportamos las versiones con Caché INDEPENDIENTE
export const getMedicos = unstable_cache(
  getMedicosRaw, 
  ['medicos-data-v1'], 
  { revalidate: 1 } 
);

export const getServicios = unstable_cache(
  getServiciosRaw, 
  ['servicios-data-v1'], 
  { revalidate: 60 } 
);

// --- VERSIÓN CORREGIDA PARA JAVASCRIPT (.JS) ---
export async function getCatalogos() {
  try {
    // 1. Leemos Servicios
    // Asegúrate de que "CATALOGO_MAESTRO" coincida con el nombre en tu Excel
    const servicios = await getSheetData("CATALOGO_MAESTRO"); 
    
    // 2. Leemos Médicos
    const medicos = await getSheetData("MEDICOS_Y_AGENDA");
    
    // 3. NUEVO: Leemos Descuentos
    const rawDescuentos = await getSheetData("CATALOGO_DESCUENTOS");
    
    // Procesamos para asegurar que los números sean números
    // NOTA: Aquí quitamos "(d: any)" y dejamos solo "(d)"
    const descuentos = rawDescuentos
      .filter((d) => d.Activo === "TRUE" || d.Activo === true) // Solo activos
      .map((d) => ({
        id: d.ID,
        nombre: d.Nombre,
        tipo: d.Tipo, // "Porcentaje" o "Monto"
        valor: Number(d.Valor) || 0,
        activo: true
      }));

    return {
      servicios,
      medicos,
      descuentos // 👈 Agregamos esto al retorno
    };
  } catch (error) {
    console.error("Error obteniendo catálogos:", error);
    // Retornamos arrays vacíos para que no rompa la página si falla
    return { servicios: [], medicos: [], descuentos: [] };
  }
}

// --- NUEVAS FUNCIONES PARA INVENTARIO EXTERNO ---

export const getStockExterno = async (skuBuscado) => {
  try {
    // 1. Conectamos a la hoja de Inventarios
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_INVENTORY_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // 2. Primero buscamos el ID_Insumo usando el SKU en el Catálogo
    const sheetCatalogo = doc.sheetsByTitle['CATALOGO_INSUMOS'];
    const rowsCatalogo = await sheetCatalogo.getRows();
    const producto = rowsCatalogo.find(row => row.get('SKU') === skuBuscado);

    if (!producto) return { stock: 0, error: "SKU no encontrado en inventario externo" };
    
    const idInsumo = producto.get('ID_Insumo');
    const esPerecedero = false; // Aquí necesitaríamos lógica para saber si es vacuna (Lotes) o insumo (Stock)
    
    // 3. Buscamos el stock. 
    // ESTRATEGIA MIXTA: Buscaremos primero en LOTES (Vacunas) y si no, en NO PERECEDEROS.
    
    // Intento A: Buscar en LOTES (Para Vacunas)
    const sheetLotes = doc.sheetsByTitle['LOTES'];
    const rowsLotes = await sheetLotes.getRows();
    // Filtramos lotes de este insumo que tengan saldo > 0
    const lotesDisponibles = rowsLotes.filter(row => 
      row.get('ID_Insumo') === idInsumo && Number(row.get('Cantidad_Disponible')) > 0
    );

    if (lotesDisponibles.length > 0) {
        // Sumamos el total de todos los lotes
        const totalStock = lotesDisponibles.reduce((acc, row) => acc + Number(row.get('Cantidad_Disponible')), 0);
        return { stock: totalStock, tipo: 'LOTE', idInsumo };
    }

    // Intento B: Buscar en STOCK_NO_PERECEDERO
    const sheetStock = doc.sheetsByTitle['STOCK_NO_PERECEDERO'];
    const rowsStock = await sheetStock.getRows();
    const filaStock = rowsStock.find(row => row.get('ID_Insumo') === idInsumo);

    if (filaStock) {
        return { stock: Number(filaStock.get('Cantidad_Disponible')), tipo: 'SIMPLE', idInsumo };
    }

    return { stock: 0, error: "Sin stock registrado" };

  } catch (error) {
    console.error("Error leyendo stock externo:", error);
    return { stock: 0, error: "Error de conexión" };
  }
};

export const descontarStockExterno = async (sku, cantidad = 1) => {
    // Esta función es más compleja, requiere lógica PEPS para elegir qué lote restar.
    // Por seguridad, primero implementemos solo la LECTURA para validar que conectamos bien.
    return true; 
}

// --- LÓGICA PARA INVENTARIO EXTERNO ---

export const consultarStockExterno = async (skuBuscado) => {
  try {
    console.log(`🔍 Buscando stock para SKU: ${skuBuscado}...`);
    
    // 1. Conectar a la hoja EXTERNA (usando el ID nuevo)
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_INVENTORY_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // 2. Buscar el ID_Insumo usando el SKU (Hoja: CATALOGO_INSUMOS)
    // Nota: En tus fotos vi que la hoja se llama exactamente "CATALOGO_INSUMOS"
    const sheetCatalogo = doc.sheetsByTitle['CATALOGO_INSUMOS'];
    if (!sheetCatalogo) return { error: "No encontré la pestaña CATALOGO_INSUMOS" };
    
    const rowsCatalogo = await sheetCatalogo.getRows();
    const producto = rowsCatalogo.find(row => row.get('SKU') === skuBuscado);

    if (!producto) {
        return { stock: 0, mensaje: "SKU no existe en la otra App", encontrado: false };
    }

    const idInsumo = producto.get('ID_Insumo');
    const nombreProducto = producto.get('Nombre_Producto'); // Para confirmar que es el correcto
    console.log(`✅ Encontrado: ${nombreProducto} (ID: ${idInsumo})`);

    // 3. Sumar stock de NO PERECEDEROS
    let stockTotal = 0;
    
    const sheetStockSimple = doc.sheetsByTitle['STOCK_NO_PERECEDERO'];
    if (sheetStockSimple) {
        const rowsStock = await sheetStockSimple.getRows();
        const fila = rowsStock.find(row => row.get('ID_Insumo') === idInsumo);
        if (fila) {
            stockTotal += Number(fila.get('Cantidad_Disponible') || 0);
        }
    }

    // 4. Sumar stock de LOTES (Para vacunas/perecederos)
    const sheetLotes = doc.sheetsByTitle['LOTES'];
    if (sheetLotes) {
        const rowsLotes = await sheetLotes.getRows();
        // Filtramos los lotes de este insumo que tengan saldo positivo
        const lotesActivos = rowsLotes.filter(row => 
            row.get('ID_Insumo') === idInsumo
        );
        
        // Sumamos sus cantidades
        const stockLotes = lotesActivos.reduce((suma, row) => suma + Number(row.get('Cantidad_Disponible') || 0), 0);
        stockTotal += stockLotes;
    }

    return { 
        stock: stockTotal, 
        nombre: nombreProducto, 
        encontrado: true,
        mensaje: "Stock consultado con éxito" 
    };

  } catch (error) {
    console.error("❌ Error consultando inventario externo:", error);
    return { error: "Error de conexión con la hoja externa", detalle: error.message };
  }
};

// --- NUEVA FUNCIÓN: Obtener Mensajes de WhatsApp (FASE 1.5) ---
// Esta función lee tu pestaña 'CONFIG_MENSAJES' y la guarda en caché 5 minutos
const getMensajesRaw = async () => {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['CONFIG_MENSAJES'];
    if (!sheet) {
      console.warn("⚠️ No encontré la pestaña 'CONFIG_MENSAJES'. Usando lista vacía.");
      return [];
    }

    const rows = await sheet.getRows();
    return rows.map(row => ({
      id: row.get('ID') || Math.random().toString(), // Fallback si no hay ID
      etiqueta: row.get('Etiqueta') || 'Mensaje sin título',
      texto: row.get('Mensaje') || ''
    }));
  } catch (error) {
    console.error("Error leyendo mensajes de WhatsApp:", error);
    return [];
  }
};

export const getMensajesWhatsApp = unstable_cache(
  getMensajesRaw,
  ['mensajes-whatsapp-config'],
  { revalidate: 300 } // Se actualiza cada 5 minutos
);

// --- CORRECCIÓN 1: Limpieza robusta de precios ---
const getLabCatalogRaw = async () => {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['CATALOGO_LABORATORIO'];
    if (!sheet) return [];

    const rows = await sheet.getRows();
    return rows.map(row => {
        // Limpieza agresiva: Quitamos '$', ',' y espacios antes de convertir
        const precioRaw = row.get('Precio_Publico') || "0";
        const costoRaw = row.get('Costo_Proveedor') || "0";
        
        const precioLimpio = typeof precioRaw === 'string' 
            ? parseFloat(precioRaw.replace(/[$,]/g, '')) 
            : Number(precioRaw);

        const costoLimpio = typeof costoRaw === 'string' 
            ? parseFloat(costoRaw.replace(/[$,]/g, '')) 
            : Number(costoRaw);

        return {
            sku: row.get('SKU') || "LAB-GEN",
            nombre: row.get('Estudio') || "Estudio sin nombre",
            muestra: row.get('Muestra') || "-",
            tiempo: row.get('Tiempo') || "24 hrs",
            costo: costoLimpio || 0,
            precio: precioLimpio || 0, // Ahora sí será un número real
            indicacionesPac: row.get('Indicaciones_Paciente') || "",
            indicacionesPersonal: row.get('Indicaciones_Personal') || ""
        };
    });
  } catch (error) {
    console.error("Error cargando laboratorio:", error);
    return [];
  }
};

export const getCatalogoLaboratorio = unstable_cache(
  getLabCatalogRaw,
  ['lab-catalog-v1'],
  { revalidate: 60 } // Se actualiza cada minuto
);