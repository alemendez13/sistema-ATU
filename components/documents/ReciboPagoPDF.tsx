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

interface ReciboProps {
  folio: string;
  fecha: string;
  paciente: string;
  servicio: string;
  especialidad?: string;
  monto: string;
  metodo?: string;
}

export default function ReciboPagoPDF({ folio, fecha, paciente, servicio, especialidad, monto, metodo }: ReciboProps) {
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
            {/* 👈 2. Lógica de Prioridad: Si hay especialidad, úsala. Si no, usa el servicio. */}
            <Text style={styles.value}>
              {especialidad ? especialidad.toUpperCase() : servicio}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Método de Pago:</Text>
            <Text style={styles.value}>{metodo || 'No especificado'}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <Text style={styles.totalValue}>{monto}</Text>
        </View>

        {/* Pie de página */}
        <View style={styles.footer}>
          <Text>Este documento es un comprobante de pago interno. Si requiere factura fiscal, favor de solicitarla el mismo mes de su consulta.</Text>
          <Text style={{ marginTop: 4 }}>SANSCE Teléfono 55 1512 6008</Text>
        </View>

      </Page>
    </Document>
  );
}