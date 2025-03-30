import QRCode from "qrcode";
import { saveAs } from "file-saver";

export const generarQRIndividual = async (rut, nombreArchivo, textoQR, estudiante) => {
  try {
    if (!rut || !nombreArchivo || !estudiante) {
      alert("⚠️ Faltan datos necesarios para generar el QR.");
      return;
    }

    const qrSize = 250;
    const margin = 20;
    const lineHeight = 18;
    const textLines = 3;
    const totalHeight = qrSize + margin + (textLines * lineHeight) + margin;

    // Crear canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = qrSize + (margin * 2);
    canvas.height = totalHeight;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generar QR
    const qrDataUrl = await QRCode.toDataURL(rut, {
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

    // Descargar imagen
    canvas.toBlob(blob => {
      saveAs(blob, `${nombreArchivo}.png`);
      alert(`✅ QR generado correctamente: ${nombreArchivo}.png`);
    }, 'image/png', 1);

  } catch (error) {
    console.error("Error al generar QR:", error);
    alert("❌ No se pudo generar el código QR.");
  }
};