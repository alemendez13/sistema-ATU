import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { unstable_cache } from 'next/cache';
import { cleanPrice } from "./utils";
import { google } from 'googleapis';

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
  
  // 🔍 DIAGNÓSTICO: Esto imprimirá en los logs de Netlify/Consola los nombres reales de las columnas
  if (rowsMedicos.length > 0) {
      console.log("👉 COLUMNAS DETECTADAS EN MEDICOS:", rowsMedicos[0]._worksheet.headerValues);
  }

  return rowsMedicos.map(row => {
    // Lógica de búsqueda profunda para la comisión (Orden de prioridad)
    // Agregamos .toString() seguro para evitar errores si viene un número directo
    const rawComision = 
        row.get('Esquema (Renta/Nómina)') || // Corregido según tus logs
        row.get('% Comisión') ||             // Corregido según tus logs
        row.get('Porcentaje Comisión') ||
        row.get('Comision') || 
        "0";

    return {
      id: row.get('ID Médico'),
      nombre: row.get('Nombre Completo'),
      especialidad: row.get('Especialidad'),
      color: row.get('Color Agenda'),
      reglasHorario: row.get('Reglas Horario') || "1,2,3,4,5|09:00-20:00",
      calendarId: row.get('Calendar ID'),
      email: row.get('Email') || "", 
      // ✅ BLINDAJE: Aseguramos que siempre sea un string limpio
      porcentajeComision: String(rawComision).trim() 
    };
  });
  };

// --- FUNCIÓN 2: SERVICIOS MAESTROS (Modificada para leer Tipo y Especialidad) ---

    const getServiciosRaw = async () => {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['CATALOGO_MAESTRO'];
  const rows = await sheet.getRows();

  // 🔍 LOG DE SEGURIDAD: Para ver exactamente cómo se llaman las columnas
  if (rows.length > 0) console.log("👉 HEADER SERVICIOS:", rows[0]._worksheet.headerValues);
  
  return rows.map(row => {
    const precioLimpio = cleanPrice(row.get('Precio Público'));
    
    // BLINDAJE DE STOCK: Busamos la columna exacta O con espacio accidental
    const rawReqStock = row.get('Requiere Stock') || row.get('Requiere Stock ') || "Si";
    
    // Si dice "no", "false" o "0", desactivamos el stock. Si no, activado por defecto.
    const requiereStock = !["no", "false", "0"].includes(String(rawReqStock).trim().toLowerCase());

    return {
        sku: row.get('SKU (ID)') || "",
        nombre: row.get('Nombre Servicio/Producto') || "",
        precio: precioLimpio || 0,
        duracion: row.get('Duración (mins)') || "30",
        tipo: row.get('Tipo') || 'Servicio',
        area: row.get('Especialidad') || "General",
        observaciones: row.get('Observaciones') || "",
        requiereStock: requiereStock
    };
  });
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

// Limpieza robusta de precios ---
// --- 3. LABORATORIOS (Adaptado a Estructura Real) ---
const getLaboratoriosRaw = async () => {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['CATALOGO_LABORATORIO'];

    // 🔍 SONDA 1: ¿Existe la hoja?
    if (!sheet) {
        console.error("❌ SONDA 1: La hoja 'CATALOGO_LABORATORIO' NO fue encontrada. Revisa espacios en el nombre en Excel.");
        return [];
    } else {
        console.log("✅ SONDA 1: Hoja encontrada.");
    }

    if (!sheet) return [];
    const rows = await sheet.getRows();

    console.log(`📊 SONDA 2: Se encontraron ${rows.length} filas en Laboratorio.`);

    if (rows.length > 0) {
        // 🔍 SONDA 3: ¿Cómo se llaman las columnas realmente?
        console.log("headers encontrados:", rows[0]._worksheet.headerValues);
        console.log("Ejemplo fila 1 Precio:", rows[0].get('Precio_Publico')); 
    }

    return rows.map(row => {
        // 👁️ OJO: Aquí usamos la columna exacta de tu captura "Precio_Publico"
        const precioLimpio = cleanPrice(row.get('Precio_Publico'));

        return {
            sku: row.get('SKU') || "LAB-GEN",
            nombre: row.get('Estudio') || "Estudio Lab",
            precio: precioLimpio || 0,
            duracion: "15", 
            tipo: "Laboratorio", // 🏷️ Etiqueta clave para el Frontend
            area: "Laboratorio", // 🏷️ Forzamos "Laboratorio" como Especialidad
            requiereStock: false 
        };
    });
  } catch (error) { 
    console.error("❌ ERROR EN SONDA:", error);
    return []; }
};

// ✅ 1. Exportación principal unificada
export const getLaboratorios = unstable_cache(getLaboratoriosRaw, ['laboratorios-v100-debug'], { revalidate: 1 });

// ✅ 2. ALIAS DE COMPATIBILIDAD (Añade esta línea exacta)
// Esto soluciona el error de Netlify "Module has no exported member 'getCatalogoLaboratorio'"
export const getCatalogoLaboratorio = getLaboratorios;

// Exportamos las versiones con Caché INDEPENDIENTE
// --- CACHÉ (Actualizado v3 para limpiar datos viejos) ---
export const getMedicos = unstable_cache(getMedicosRaw, ['medicos-v4-fix'], { revalidate: 1 });
export const getServiciosMaestros = unstable_cache(getServiciosRaw, ['servicios-v100-debug'], { revalidate: 1 });
// 👇 Aseguramos que WhatsApp se exporte aquí arriba también
export const getMensajesWhatsApp = unstable_cache(getMensajesRaw, ['mensajes-whatsapp-config'], { revalidate: 300 });

// --- FUNCIÓN UNIFICADA "DAME TODO" ---
export async function getCatalogos() {
  try {
    // 1. Pedimos todo en paralelo (Servicios + Labs)
    const [medicos, serviciosBase, laboratorios, rawDescuentos] = await Promise.all([
        getMedicos(),
        getServiciosMaestros(),
        getLaboratorios(),
        getSheetData("CATALOGO_DESCUENTOS")
    ]);

    // 2. 🧠 FUSIÓN INTELIGENTE: Unimos todo en una sola lista
    const catalogoUnificado = [...serviciosBase, ...laboratorios];

    // 🔍 SONDA 4: Conteo final
    console.log(`📉 REPORTE FINAL: Servicios Base: ${serviciosBase.length} | Laboratorios: ${laboratorios.length} | TOTAL ENVIADO: ${catalogoUnificado.length}`);

    // 3. Procesamos Descuentos
    const descuentos = rawDescuentos
      .filter(d => String(d.Activo).toUpperCase() === "TRUE" || d.Activo === true)
      .map(d => ({
        id: d.ID, nombre: d.Nombre, tipo: d.Tipo, 
        valor: cleanPrice(d.Valor), activo: true
      }));

    return { 
        servicios: catalogoUnificado, // ¡Ahora contiene AMBOS!
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

export async function getControlDocumental() {
  try {
    console.log("🚀 Iniciando conexión segura a Sheets (Modo JWT)...");

    // USAMOS JWT DIRECTAMENTE (Igual que getMedicosRaw)
    const authClient = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await authClient.authorize();

    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'CONTROL_DOCUMENTAL_RBAC!A2:I200',
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) return [];

    return rows.map(row => ({
      codigo: row[0] || '',
      nombre: row[1] || '',
      edicion: row[2] || '',
      modulo: row[3] || '',
      tipo: row[4] || 'Documento',
      estatus_sistema: row[5] || 'Rojo',
      roles_acceso: (row[6] || '').split(',').map(r => r.trim().toLowerCase()),
      ruta_tecnica: row[7] || null,
      link_externo: row[8] || null,
    }));

  } catch (error) {
    console.error("❌ ERROR GOOGLE:", error.message);
    return [];
  }
}

// ==========================================
// 🚀 MÓDULO 5: MOTOR DE OKRs (Integración SANSCE v2)
// ==========================================

// Helper matemático exclusivo para OKRs
const calculateAverage = (values) => {
  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length === 0) return 0;
  const sum = validValues.reduce((a, b) => a + b, 0);
  return parseFloat((sum / validValues.length).toFixed(2));
};

// Helper de transformación de datos (Versión ligera)
const rawRowsToJSON = (rows) => {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index]; // Mantiene el valor original
    });
    return obj;
  });
};

// --- FUNCIÓN PRINCIPAL DE DATOS OKR ---
// --- FUNCIÓN PRINCIPAL DE DATOS OKR (CORREGIDA v3 - Typo Fix) ---
const getOkrDataRaw = async (userEmail) => {
  try {
    // 1. Limpieza de Email para evitar errores de espacios
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : "";
    console.log(`📊 Iniciando cálculo de OKRs para: "${cleanEmail}"`);
    
    const authClient = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    await authClient.authorize();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

    // 2. Traemos las 5 tablas críticas
    const [resResultados, resUsuarios, resCatalogo, resKRs, resObjetivos] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Resultados!A:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usuarios!A:E' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'CatalogoKPIs!A:J' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'ResultadosClave!A:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Objetivos!A:E' })
    ]);

    const users = rawRowsToJSON(resUsuarios.data.values);
    const catalog = rawRowsToJSON(resCatalogo.data.values);
    const results = rawRowsToJSON(resResultados.data.values);
    const keyResults = rawRowsToJSON(resKRs.data.values);
    const objectives = rawRowsToJSON(resObjetivos.data.values);

    // 3. Identificamos al Usuario Solicitante
    const currentUser = users.find(u => 
      u.Email && u.Email.trim().toLowerCase() === cleanEmail
    );
    
    if (!currentUser) {
        console.warn(`⛔ Usuario "${cleanEmail}" no encontrado en hoja Usuarios.`);
        return []; 
    }

    const userRole = currentUser.Rol ? currentUser.Rol.trim().toLowerCase() : 'general';
    const userTeam = currentUser.EquipoID;

    // 4. FILTRADO DE SEGURIDAD (RBAC)
    let visibleKpis = [];
    if (userRole === 'admin') {
        visibleKpis = catalog;
    } else {
        visibleKpis = catalog.filter(kpi => kpi.EquipoID === userTeam);
    }

    // 5. CONSTRUCCIÓN JERÁRQUICA
    // Paso A: KPIs con Datos
    const kpisWithData = visibleKpis.map(kpi => {
        const kpiResults = results.filter(r => r.KPI_ID === kpi.KPI_ID);
        const latest = kpiResults[kpiResults.length - 1] || { Valor: 0, Periodo: 'N/A' };
        
        const meta = parseFloat(kpi.Meta_Anual || 100);
        const actual = cleanPrice(latest.Valor);
        let progress = 0;
        if (meta > 0) progress = (actual / meta) * 100;
        
        return {
            ...kpi,
            latestValue: actual,
            progress: Math.min(progress, 100),
            history: kpiResults
        };
    });

    // Paso B: Agrupar en KRs (Resultados Clave)
    const krsWithKpis = keyResults.map(kr => {
        const childKpis = kpisWithData.filter(k => k.KR_ID === kr.KR_ID);
        if (childKpis.length === 0) return null;

        const kpiAverages = childKpis.map(k => k.progress);
        const krAverage = calculateAverage(kpiAverages);

        return {
            ...kr,
            KR_Average: krAverage,
            KPIs: childKpis
        };
    }).filter(kr => kr !== null);

    // Paso C: Agrupar en Objetivos (AQUÍ ESTABA EL ERROR)
    const finalTree = objectives.map(obj => {
        // CORRECCIÓN: Usamos la variable correcta 'krsWithKpis'
        const childKrs = krsWithKpis.filter(kr => kr.Objective_ID === obj.Objective_ID);
        
        if (childKrs.length === 0) return null;

        const krAverages = childKrs.map(kr => kr.KR_Average);
        const objAverage = calculateAverage(krAverages);

        return {
            Objective_ID: obj.Objective_ID,
            Nombre: obj.Nombre_Objetivo,
            Color: obj.Color_Primario || '#000000',
            Promedio: objAverage,
            ResultadosClave: childKrs
        };
    }).filter(obj => obj !== null);

    return finalTree;

  } catch (error) {
    console.error("❌ Error CRÍTICO en Motor OKR:", error);
    return [];
  }
};

// Exportamos con Caché de 5 minutos (para no saturar Sheets)
export const getOkrDashboardData = unstable_cache(getOkrDataRaw, ['okr-data-v1'], { revalidate: 300 });