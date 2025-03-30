import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export const generarTodosLosQR = async (estudiantesConDatos) => {
  try {
    if (estudiantesConDatos.length === 0) {
      alert("⚠️ No hay estudiantes registrados en la base de datos.");
      return;
    }

    const zip = new JSZip();
    const qrSize = 250;
    const margin = 20;
    const lineHeight = 18;

    for (const estudiante of estudiantesConDatos) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculamos altura dinámica basada en las líneas de texto
      const textLines = 3; // Nombre, apellidos y curso
      const totalHeight = qrSize + margin + (textLines * lineHeight) + margin;
      
      canvas.width = qrSize + (margin * 2);
      canvas.height = totalHeight;

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generar QR
      const qrDataUrl = await QRCode.toDataURL(estudiante.rut, {
        width: qrSize,
        margin: 1
      });

      // Dibujar QR
      const qrImage = new Image();
      await new Promise((resolve) => {
        qrImage.onload = resolve;
        qrImage.src = qrDataUrl;
      });
      ctx.drawImage(qrImage, margin, margin, qrSize, qrSize);

      // Configurar texto
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';

      // Posición inicial del texto
      let textY = qrSize + margin + lineHeight;

      // Dibujar nombre (primera línea)
      ctx.fillText(estudiante.nombre, canvas.width/2, textY);
      textY += lineHeight;

      // Dibujar apellidos (segunda línea)
      ctx.fillText(`${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno}`, canvas.width/2, textY);
      textY += lineHeight;

      // Dibujar curso (tercera línea)
      ctx.fillText(`Curso: ${estudiante.curso}`, canvas.width/2, textY);

      // Convertir a Blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1);
      });

      zip.file(`${estudiante.nombreArchivo}.png`, blob);
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "QR_Estudiantes.zip");
      alert("✅ Todos los QR han sido generados correctamente.");
    });

  } catch (error) {
    console.error("Error al generar QR:", error);
    alert("❌ Error al generar códigos QR.");
  }
};