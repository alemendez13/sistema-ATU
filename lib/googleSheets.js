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

// --- FUNCIÓN HELPER (NUEVA): Para leer cualquier hoja fácilmente ---
async function getSheetData(sheetName) {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
        console.warn(`⚠️ La hoja "${sheetName}" no existe en el Google Sheet.`);
        return [];
    }
    const rows = await sheet.getRows();
    
    // Convertimos las filas a objetos simples JSON
    return rows.map(row => {
        const obj = {};
        row._worksheet.headerValues.forEach(header => {
            obj[header] = row.get(header);
        });
        return obj;
    });
  } catch (error) {
    console.error(`Error leyendo hoja ${sheetName}:`, error);
    return [];
  }
}

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
    email: row.get('Email') || "", 
    porcentajeComision: row.get('Comision') || "0" 
  }));
};

// --- FUNCIÓN 2: SERVICIOS MAESTROS (Modificada para leer Tipo y Especialidad) ---
const getServiciosRaw = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['CATALOGO_MAESTRO'];
  const rows = await sheet.getRows();
  
  return rows.map(row => {
    // Limpieza de Precio (Mejorada para evitar errores con signos de $)
    const precioRaw = row.get('Precio Público');
    const precioLimpio = typeof precioRaw === 'string' 
        ? parseFloat(precioRaw.replace(/[$,]/g, '')) 
        : Number(precioRaw);

    return {
        sku: row.get('SKU (ID)') || "",
        nombre: row.get('Nombre Servicio/Producto') || "",
        precio: precioLimpio || 0,
        duracion: row.get('Duración (mins)') || "30",
        
        // 👇 CAMBIO CLAVE: Leemos las columnas nuevas de tu Excel
        tipo: row.get('Tipo') || 'Servicio', // "Servicio", "Producto", "Laboratorio"
        area: row.get('Especialidad') || "General", // "Psicología", "Cardiología", etc.
        
        observaciones: row.get('Observaciones') || ""
    };
  });
};

// Exportamos las versiones con Caché INDEPENDIENTE
// --- CACHÉ (Actualizado v3 para limpiar datos viejos) ---
export const getMedicos = unstable_cache(getMedicosRaw, ['medicos-v3'], { revalidate: 1 });
export const getServiciosMaestros = unstable_cache(getServiciosRaw, ['servicios-maestros-v3'], { revalidate: 60 });
export const getLaboratorios = unstable_cache(getLaboratoriosRaw, ['laboratorios-v3'], { revalidate: 60 });

// --- FUNCIÓN PRINCIPAL (CORREGIDA): Obtiene Todo (Servicios + Médicos + Descuentos) ---
// --- FUNCIÓN UNIFICADA "DAME TODO" ---
export async function getCatalogos() {
  try {
    // 1. Pedimos todo en paralelo (Más rápido)
    const [medicos, serviciosBase, laboratorios, rawDescuentos] = await Promise.all([
        getMedicos(),
        getServiciosMaestros(),
        getLaboratorios(),
        getSheetData("CATALOGO_DESCUENTOS")
    ]);

    // 2. 🧠 FUSIÓN INTELIGENTE: Unimos Servicios + Laboratorios en una sola lista
    const catalogoUnificado = [...serviciosBase, ...laboratorios];

    // 3. Procesamos Descuentos
    const descuentos = rawDescuentos
      .filter(d => String(d.Activo).toUpperCase() === "TRUE" || d.Activo === true)
      .map(d => ({
        id: d.ID,
        nombre: d.Nombre,
        tipo: d.Tipo,
        valor: parseFloat(d.Valor ? d.Valor.toString().replace(/[$,%]/g, '') : "0") || 0
      }));

    return { 
        servicios: catalogoUnificado, // Ahora contiene TODO (Servicios, Productos, Labs)
        medicos, 
        descuentos 
    };

  } catch (error) {
    console.error("Error catálogos:", error);
    return { servicios: [], medicos: [], descuentos: [] };
  }
}

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
// --- 3. LABORATORIOS (Fusión Virtual) ---
const getLaboratoriosRaw = async () => {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['CATALOGO_LABORATORIO'];
    if (!sheet) return [];
    const rows = await sheet.getRows();

    return rows.map(row => {
        const precioRaw = row.get('Precio_Publico');
        const precioLimpio = typeof precioRaw === 'string' 
            ? parseFloat(precioRaw.replace(/[$,]/g, '')) 
            : Number(precioRaw);

        return {
            sku: row.get('SKU') || "LAB-GEN",
            nombre: row.get('Estudio') || "Estudio Lab",
            precio: precioLimpio || 0,
            duracion: "15", // Tiempo estimado
            
            // 👇 FORZAMOS ESTOS DATOS PARA QUE LA APP LOS ENTIENDA
            tipo: "Laboratorio",
            area: row.get('Especialidad') || "Laboratorio", 
            
            // Extras exclusivos de Lab que conservamos
            indicacionesPac: row.get('Indicaciones_Paciente') || "",
            muestra: row.get('Muestra') || ""
        };
    });
  } catch (error) { return []; }
};

export const getCatalogoLaboratorio = unstable_cache(
  getLabCatalogRaw,
  ['lab-catalog-v1'],
  { revalidate: 60 } // Se actualiza cada minuto
);