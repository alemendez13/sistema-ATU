// app/api/conocimiento/route.ts
import { NextResponse } from 'next/server';
// Asegúrate de que esta ruta coincida con donde tienes tu archivo googleSheets.js
// Si tu archivo se llama "googleSheets.js" (JavaScript), esto funcionará perfecto.
import { getControlDocumental } from '@/lib/googleSheets'; 

export async function GET() {
  try {
    // 1. Llamamos a la función que conecta con Google Sheets (que agregaste en lib/googleSheets.js)
    const data = await getControlDocumental();

    // 2. Devolvemos los datos en formato JSON
    return NextResponse.json(data, {
      status: 200,
      headers: {
        // Cache: Guardamos la respuesta 60 segundos para que sea muy rápido y no gastar cuota de Google
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error("Error en API Conocimiento:", error);
    return NextResponse.json(
      { error: 'Error interno al obtener documentos' },
      { status: 500 }
    );
  }
}