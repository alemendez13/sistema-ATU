"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos corregidos (sin errores de border)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#111827', // Gris muy oscuro
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  logo: {
    width: 120, // Ajustable según el tamaño de tu logo
    height: 'auto',
    marginBottom: 5,
  },
  companyInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af', // Azul SANSCE
    textTransform: 'uppercase',
  },
  companySub: {
    fontSize: 10,
    color: 'gray',
  },
  titleBlock: {
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  reciboTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // Gris muy claro
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#4b5563',
  },
  value: {
    width: '70%',
    color: '#111827',
  },
  totalBlock: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a', // Verde dinero
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: 'gray',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
});

const DATA_ESPECIALISTAS: Record<string, { cedulas: string[], especialidadOficial: string }> = {
  "Alejandra Méndez Pérez": { especialidadOficial: "Medicina Interna", cedulas: ["Cédula Profesional: 3838314 | Esp: Médico Cirujano", "Cédula Profesional: 5052492 | Esp: Medicina Interna"] },
  "Lina Estrella Martínez Guevara": { especialidadOficial: "Ortopedia", cedulas: ["Cédula Profesional: 8007598 | Esp: Médico Cirujano", "Cédula Profesional: 10738876 | Esp: Ortopedia"] },
  "Manuel Alejandro López Flores A la Torre": { especialidadOficial: "Médico Cirujano", cedulas: ["Cédula Profesional: 12026965 | Esp: Médico Cirujano"] },
  "Marco Eduardo Ramírez Jiménez": { especialidadOficial: "Psiquiatría", cedulas: ["Cédula Profesional: 9148937 | Esp: Médico Cirujano", "Cédula Profesional: 11981080 | Esp: Psiquiatría"] },
  "Antonio Jordan Ríos": { especialidadOficial: "Cardiología", cedulas: ["Cédula Profesional: 8562820 | Esp: Médico Cirujano", "Cédula Profesional: 11677778 | Esp: Cardiología"] },
  "Gabriel Alejandro Pérez Ruíz": { especialidadOficial: "Psicología", cedulas: ["Cédula Profesional: 13649233 | Esp: Psicología"] },
  "María Leticia Pérez Escamilla": { especialidadOficial: "Nutrición", cedulas: ["Cédula Profesional: 13506784 | Esp: Nutrición"] },
  "José Javier Jiménez": { especialidadOficial: "Terapia Física", cedulas: ["Cédula Profesional: 13230515 | Esp: Terapia Física"] },
  "Arturo Mayoral Zavala": { especialidadOficial: "Gastroenterología", cedulas: ["Cédula Profesional: 3309514 | Esp: Médico Cirujano", "Cédula Profesional: 5259196 | Esp: Gastroenterología"] },
  "Verónica Marcela Muñoz Torrico": { especialidadOficial: "Neumología", cedulas: ["Cédula Profesional: 5088520 | Esp: Médico Cirujano", "Cédula Profesional: 5295381 | Esp: Medicina Interna", "Cédula Profesional: 6384371 | Esp: Neumología"] },
};

interface ReciboProps {
  folio: string;
  fecha: string;
  paciente: string;
  servicio: string;
  especialidad?: string;
  especialista?: string; // <--- Nueva propiedad
  monto: string;
  metodo?: string;
}

export default function ReciboPagoPDF({ folio, fecha, paciente, servicio, especialidad, especialista, monto, metodo }: ReciboProps) {
  // Buscamos si el especialista tiene cédulas registradas
  const infoEspecialista = especialista ? DATA_ESPECIALISTAS[especialista] : null;
  const cedulas = infoEspecialista?.cedulas;
  const especialidadDeSheet = infoEspecialista?.especialidadOficial;
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {/* Asegúrate que el archivo logo-sansce.png esté en tu carpeta public */}
            <Image style={styles.logo} src="/logo-sansce.png" />
            <Text style={styles.companySub}>Sanae en Escencia</Text>
            <Text style={{ fontSize: 8, color: 'gray', maxWidth: 200 }}>
              Av. Magdalena #439, Col del Valle Centro,
              Benito Juárez, CDMX, CP 03100
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: 'gray' }}>Folio: {folio}</Text>
            <Text style={{ fontSize: 10, color: 'gray' }}>{fecha}</Text>
          </View>
        </View>

        {/* Título */}
        <View style={styles.titleBlock}>
          <Text style={styles.reciboTitle}>RECIBO DE PAGO</Text>
        </View>

        {/* Detalles */}
        <View style={{ marginHorizontal: 20 }}>
          <View style={styles.row}>
            <Text style={styles.label}>Recibimos de:</Text>
            <Text style={styles.value}>{paciente}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Por concepto de:</Text>
            <Text style={styles.value}>
              {(especialidadDeSheet || especialidad || servicio).toUpperCase()}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Método de Pago:</Text>
            <Text style={styles.value}>{metodo || 'No especificado'}</Text>
          </View>
        </View>

        {/* Total con Símbolo de Moneda */}
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <Text style={styles.totalValue}>${monto}</Text>
        </View>

        {/* Sección Quirúrgica: Datos del Especialista */}
        {cedulas && (
          <View style={{ marginTop: 40, marginHorizontal: 20, borderTopWidth: 1, borderTopColor: '#111827', paddingTop: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 }}>
              {especialista?.toUpperCase()}
            </Text>
            {cedulas.map((linea, index) => (
              <Text key={index} style={{ fontSize: 8, color: '#374151', marginBottom: 2 }}>
                {linea}
              </Text>
            ))}
          </View>
        )}

        {/* Pie de página Legal */}
        <View style={styles.footer}>
          <Text>Este documento es un comprobante de pago interno. Si requiere factura fiscal, favor de solicitarla el mismo mes de su consulta.</Text>
          <Text style={{ marginTop: 4 }}>SANSCE Teléfono 55 1512 6008</Text>
        </View>

      </Page>
    </Document>
  );
}