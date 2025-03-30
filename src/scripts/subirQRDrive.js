import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { authenticate } from "@google-cloud/local-auth";

// 📌 Configuración de Google Drive API
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const CREDENTIALS_PATH = path.join(process.cwd(), "google_credentials.json"); // 🔹 Ajustado para rutas absolutas

// 🔹 Función para autenticarse en Google Drive
const autenticarGoogleDrive = async () => {
  try {
    const auth = await authenticate({
      keyfilePath: CREDENTIALS_PATH,
      scopes: SCOPES,
    });
    return google.drive({ version: "v3", auth });
  } catch (error) {
    console.error("❌ Error en la autenticación de Google Drive:", error);
    throw new Error("No se pudo autenticar con Google Drive.");
  }
};

// 🔹 Función para subir archivos QR a Google Drive
export const subirQRAutoDrive = async () => {
  try {
    const drive = await autenticarGoogleDrive();
    const folderId = "TU_CARPETA_DRIVE_ID"; // 📌 Reemplázalo con tu carpeta en Google Drive

    if (!folderId) {
      alert("⚠️ No se ha configurado el ID de la carpeta en Google Drive.");
      return;
    }

    const qrFolder = path.join(process.cwd(), "qr_codes"); // 📂 Ruta correcta
    if (!fs.existsSync(qrFolder)) {
      alert("⚠️ La carpeta 'qr_codes' no existe. Primero genera los QR.");
      return;
    }

    const files = fs.readdirSync(qrFolder);
    if (files.length === 0) {
      alert("⚠️ No hay archivos QR para subir.");
      return;
    }

    for (const file of files) {
      const filePath = path.join(qrFolder, file);
      const fileMetadata = {
        name: file,
        parents: [folderId],
      };
      const media = {
        mimeType: "image/png",
        body: fs.createReadStream(filePath),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id",
      });

      console.log(`✅ ${file} subido a Google Drive (ID: ${response.data.id})`);
    }

    alert("✅ Códigos QR subidos exitosamente a Google Drive.");
  } catch (error) {
    console.error("❌ Error al subir QR a Google Drive:", error);
    alert("❌ No se pudieron subir los QR a Google Drive.");
  }
};
