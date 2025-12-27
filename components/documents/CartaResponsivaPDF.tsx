"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos del PDF (Como si fuera CSS pero para papel)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 1, // CORREGIDO: Era 'borderBottom: 1'
    borderBottomColor: '#000', // AGREGADO
    borderBottomStyle: 'solid', // AGREGADO
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    color: 'gray',
  },
  body: {
    marginTop: 20,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  legalBlock: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    padding: 10,
    fontSize: 10,
    borderWidth: 1, // CORREGIDO: Era 'border: 1'
    borderColor: '#dee2e6',
    borderStyle: 'solid', // AGREGADO
  },
  signatures: {
    marginTop: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: {
    width: '40%',
    borderTopWidth: 1, // CORREGIDO: Era 'borderTop: 1'
    borderTopColor: '#000', // AGREGADO
    borderTopStyle: 'solid', // AGREGADO
    textAlign: 'center',
    paddingTop: 5,
  },
});

// Datos que va a recibir el PDF
interface CartaProps {
  paciente: string;
  equipo: string;
  serie?: string;
  fecha: string;
  folio: string;
}

export default function CartaResponsivaPDF({ paciente, equipo, serie, fecha, folio }: CartaProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>SANSCE - CLÍNICA INTEGRAL</Text>
              <Text style={styles.subtitle}>CARTA RESPONSIVA DE EQUIPO MÉDICO</Text>
            </View>
            {/* ADICIÓN DE CÓDIGO GEC-FR-02 */}
            <View style={{ textAlign: 'right', fontSize: 8, color: 'gray' }}>
              <Text>ATU-FR-06</Text> 
              <Text>Ed. 0</Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, marginTop: 5 }}>Folio: {folio}</Text>
        </View>

        {/* Cuerpo del documento */}
        <View style={styles.body}>
          <Text>
            Por medio de la presente, se hace constar la entrega del equipo médico descrito a continuación al C. <Text style={{ fontWeight: 'bold' }}>{paciente}</Text>, quien lo recibe en calidad de PRÉSTAMO TEMPORAL / RENTA para su tratamiento médico.
          </Text>

          <View style={{ marginTop: 20, marginBottom: 20 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>DETALLES DEL EQUIPO:</Text>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Equipo:</Text>
              <Text style={styles.value}>{equipo}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>No. Serie/ID:</Text>
              <Text style={styles.value}>{serie || 'S/N'}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Fecha Entrega:</Text>
              <Text style={styles.value}>{fecha}</Text>
            </View>
          </View>

          <Text>
            El paciente (o responsable legal) declara recibir el equipo en óptimas condiciones de funcionamiento y limpieza, comprometiéndose a:
          </Text>

          {/* Cláusulas Legales */}
          <View style={styles.legalBlock}>
            <Text>1. Cuidar el equipo y utilizarlo exclusivamente para los fines médicos indicados.</Text>
            <Text>2. No alterar, abrir o intentar reparar el equipo por cuenta propia.</Text>
            <Text>3. Devolver el equipo en la fecha acordada: ____/____/______.</Text>
            <Text>4. Cubrir el costo de reposición en caso de daño total, robo o extravío, valuado según el precio de mercado vigente.</Text>
          </View>
        </View>

        {/* Firmas */}
        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text>ENTREGA (SANSCE)</Text>
            <Text style={{ fontSize: 8, marginTop: 20 }}>Nombre y Firma</Text>
          </View>
          <View style={styles.signBox}>
            <Text>RECIBE (PACIENTE)</Text>
            <Text style={{ fontSize: 8, marginTop: 20 }}>{paciente}</Text>
          </View>
        </View>

        <Text style={{ position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, textAlign: 'center', color: 'gray' }}>
          SANSCE Salud Integral - Dirección de la clínica, Ciudad, Estado - Tel: 55-1234-5678
        </Text>

      </Page>
    </Document>
  );
}