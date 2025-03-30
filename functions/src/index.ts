/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Inicializar Firebase Admin
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// Función mejorada para verificar medidas por atraso
export const verificarMedidasPorAtraso = onDocumentCreated(
  {
    document: "asistencias/{asistenciaId}",
    region: "southamerica-west1" // Asegura coincidencia con la región de Firestore
  },
  async (event) => {
    logger.info("🟢 EVENTO DE ASISTENCIA DETECTADO - Iniciando verificación");
    
    try {
      const snapshot = event.data;
      
      if (!snapshot) {
        logger.error("❌ Error: No se encontraron datos en el evento");
        return;
      }

      const asistencia = snapshot.data();
      logger.info("📄 Datos de asistencia recibidos:", {asistencia});

      // Validación más flexible del estado
      if (!asistencia.estado || asistencia.estado.toString().toLowerCase() !== "atrasado") {
        logger.warn(`⚠️ Registro no es un atraso. Estado recibido: "${asistencia.estado}"`);
        return;
      }

      const estudianteId = asistencia.estudiante_id;
      if (!estudianteId) {
        logger.error("❌ Error crítico: estudiante_id no definido");
        return;
      }

      logger.info(`🔍 Procesando nuevo atraso para estudiante: ${estudianteId}`);
      
      // Obtener cantidad total de atrasos
      const atrasosRef = admin.firestore().collection('asistencias');
      const atrasosQuery = atrasosRef
        .where('estudiante_id', '==', estudianteId)
        .where('estado', '==', 'Atrasado');
      
      logger.info("🔎 Ejecutando consulta de atrasos...");
      const atrasosSnapshot = await atrasosQuery.get();
      const cantidadAtrasos = atrasosSnapshot.size;
      logger.info(`📊 Total atrasos acumulados: ${cantidadAtrasos}`);

      // Determinar el umbral más alto alcanzado
      const UMBRALES = [3, 5, 10, 15, 20];

      // Verifica si la cantidad actual de atrasos coincide exactamente con un umbral
      const umbralExacto = UMBRALES.includes(cantidadAtrasos);
    if (!umbralExacto) {
        logger.info(`↗️ ${cantidadAtrasos} atrasos - No coincide con umbral exacto`);
    return;
    }
      const umbralAlcanzado = UMBRALES.reduce((max, umbral) => 
        cantidadAtrasos >= umbral ? umbral : max, 0);

      if (umbralAlcanzado === 0) {
        logger.info(`↗️ ${cantidadAtrasos} atrasos - No alcanza umbral mínimo (3)`);
        return;
      }

      logger.info(`🎯 Umbral alcanzado: ${umbralAlcanzado} atrasos`);

      // Verificar si ya existe medida para este umbral exacto
      const medidasRef = admin.firestore().collection('medidas_disciplinarias');
      const medidaExistente = await medidasRef
        .where('estudiante_id', '==', estudianteId)
        .where('cantidad_atrasos', '==', umbralAlcanzado)
        .limit(1)
        .get();

      if (!medidaExistente.empty) {
        logger.info(`⏭️ Ya existe medida para ${umbralAlcanzado} atrasos del estudiante ${estudianteId}`);
        return;
      }

      // Obtener datos del estudiante
      logger.info(`👨‍🎓 Buscando datos del estudiante ${estudianteId}...`);
      const estudianteDoc = await admin.firestore()
        .collection('estudiantes')
        .doc(estudianteId)
        .get();

      if (!estudianteDoc.exists) {
        logger.error(`❌ Estudiante no encontrado en BD: ${estudianteId}`);
        return;
      }

      const estudianteData = estudianteDoc.data();
      if (!estudianteData) {
        logger.error(`❌ Datos del estudiante incompletos para: ${estudianteId}`);
        return;
      }

      // Determinar tipo de medida según el umbral alcanzado
      const tipoMedida = umbralAlcanzado >= 20 ? "Firma de compromiso y posible medida disciplinaria" :
                        umbralAlcanzado >= 15 ? "Segunda citación del apoderado" :
                        umbralAlcanzado >= 10 ? "Medidas de apoyo pedagógico o psicosocial" :
                        umbralAlcanzado >= 5 ? "Citación del apoderado" :
                        "Amonestación verbal";
      
      logger.info(`📝 Medida requerida: ${tipoMedida}`);

      // Crear nueva medida con información detallada
      try {
        const nuevaMedida = {
          estudiante_id: estudianteId,
          nombre_estudiante: `${estudianteData.nombre} ${estudianteData.apellido_paterno} ${estudianteData.apellido_materno}`,
          cantidad_atrasos: umbralAlcanzado,
          atrasos_reales: cantidadAtrasos, // Guarda el total real de atrasos
          tipo_medida: tipoMedida,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          estado: "Sin atender",
          rut: estudianteId,
          curso: estudianteData.curso || 'No especificado',
          notificado: false
        };

        logger.info("➕ Creando nueva medida...", nuevaMedida);
        const medidaRef = await medidasRef.add(nuevaMedida);
        logger.info(`✅ Nueva medida creada ID: ${medidaRef.id}`);

        // Aquí podrías agregar el envío de correo cuando lo implementes
        await enviarCorreoAtrasos(estudianteId, umbralAlcanzado, tipoMedida);

      } catch (error) {
        logger.error("❌ Error crítico al crear medida:", error);
      }
    } catch (error) {
      logger.error("💥 ERROR GENERAL EN FUNCIÓN:", error);
    } finally {
      logger.info("---------- FIN DE EJECUCIÓN ----------");
    }
  }
);

// Función para enviar correos (descomentar cuando esté lista la configuración de Email)

const enviarCorreoAtrasos = async (estudianteId: string, cantidadAtrasos: number, tipoMedida: string) => {
    try {
      logger.info(`📧 Preparando envío de correo para ${estudianteId} con ${cantidadAtrasos} atrasos`);
  
      const estudianteDoc = await admin.firestore()
        .collection('estudiantes')
        .doc(estudianteId)
        .get();
  
      if (!estudianteDoc.exists) {
        logger.error(`❌ Estudiante no encontrado: ${estudianteId}`);
        return;
      }
  
      const estudianteData = estudianteDoc.data();
      if (!estudianteData) {
        logger.error(`❌ Datos de estudiante vacíos: ${estudianteId}`);
        return;
      }
  
      // Obtener correos únicos (evitar duplicados)
      const correos = new Set<string>();
      
      // Correo principal del estudiante
      if (estudianteData.email) {
        correos.add(estudianteData.email.toLowerCase().trim());
      }
      
      // Correo del apoderado (si existe en el mapa apoderado)
      if (estudianteData.apoderado?.email) {
        correos.add(estudianteData.apoderado.email.toLowerCase().trim());
      }
  
      if (correos.size === 0) {
        logger.error(`❌ No hay correos registrados para el estudiante: ${estudianteId}`);
        return;
      }
  
      // Formatear fecha actual (formato chileno completo)
      const fechaActual = new Date().toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Santiago'
      });
  
      // Limpiar nombre y apellidos (eliminar espacios extras)
      const nombreEstudiante = estudianteData.nombre?.split(' ')[0] || ''; // Tomar solo el primer nombre si hay varios
      const apellidoPaterno = estudianteData.apellido_paterno?.trim() || '';
      const apellidoMaterno = estudianteData.apellido_materno?.trim() || '';
  
      // Crear mensaje de correo según el formato solicitado
      const mensaje = `
  Estimado apoderado del Colegio Manantiales del Elqui:
  
  Su pupilo(a) ${nombreEstudiante} ${apellidoPaterno} ${apellidoMaterno} 
  del curso ${estudianteData.curso} ha acumulado ${cantidadAtrasos} atrasos, 
  por lo que se aplicará la siguiente medida disciplinaria: 
  "${tipoMedida}"
  
  Detalles:
  - Fecha de notificación: ${fechaActual}
  - Total de atrasos acumulados: ${cantidadAtrasos}
  - Medida aplicada: ${tipoMedida}
  
  Es fundamental que el estudiante mejore su puntualidad, ya que los atrasos recurrentes:
  - Afectan su rendimiento académico
  - Interrumpen el desarrollo de las clases
  - Incumplen el reglamento interno del establecimiento
  
  Este correo es informativo. Para consultas o justificaciones:
  - Contactar al profesor jefe
  - Solicitar entrevista en secretaría
  - Horario de atención: Lunes a Viernes de 8:00 a 13:00 hrs
  
  Atentamente,
  Dirección Colegio Manantiales del Elqui
  La Serena, ${fechaActual}
      `.trim();
  
      // Enviar correo a cada dirección única
      for (const correo of correos) {
        try {
          await admin.firestore().collection('mail').add({
            to: correo,
            message: {
              subject: `[Importante] Notificación de atrasos - ${nombreEstudiante} ${apellidoPaterno}`,
              text: mensaje,
              html: mensaje.replace(/\n/g, '<br>')
            },
            headers: {
              'Priority': 'high'
            }
          });
          logger.info(`✅ Correo enviado exitosamente a: ${correo}`);
          
          // Actualizar el campo notificado en la medida disciplinaria
          const medidasRef = admin.firestore().collection('medidas_disciplinarias');
          const query = medidasRef
            .where('rut', '==', estudianteId)
            .where('cantidad_atrasos', '==', cantidadAtrasos)
            .orderBy('fecha', 'desc')
            .limit(1);
          
          const snapshot = await query.get();
          if (!snapshot.empty) {
            const medidaId = snapshot.docs[0].id;
            await medidasRef.doc(medidaId).update({
              notificado: true,
              fecha_notificacion: admin.firestore.FieldValue.serverTimestamp()
            });
            logger.info(`📝 Medida disciplinaria actualizada como notificada: ${medidaId}`);
          }
        } catch (error) {
          logger.error(`❌ Error al enviar correo a ${correo}:`, error);
        }
      }
    } catch (error) {
      logger.error('❌ Error en enviarCorreoAtrasos:', error);
    }
  };

