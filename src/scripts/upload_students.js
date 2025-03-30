// 🔹 Reemplaza "require" con "import"
import admin from "firebase-admin";
import { createReadStream } from "fs";
import csv from "csv-parser";

// 🔹 Cargar la clave privada de Firebase
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔹 Ruta del archivo CSV
const csvFilePath = "./scripts/Datos_Filtrados_para_Firestore.csv";

// 🔹 Leer el archivo CSV y almacenar los datos
const data = [];

createReadStream(csvFilePath)
  .pipe(csv())
  .on("data", (row) => {
    data.push(row);
  })
  .on("end", async () => {
    console.log("✅ Archivo CSV cargado, iniciando subida a Firestore...");
    await uploadStudents(data);
  });

// 🔹 Función para subir estudiantes a Firestore
const uploadStudents = async (data) => {
  const batch = db.batch();
  const estudiantesRef = db.collection("estudiantes");

  data.forEach((row, index) => {
    const studentData = {
      id: row["id"],
      nombre: row["nombre"],
      apellido_paterno: row["apellido_paterno"],
      apellido_materno: row["apellido_materno"],
      fecha_nacimiento: row["fecha_nacimiento"],
      curso: row["curso"],
      matriculado: row["matriculado"] === "TRUE",
      genero: row["genero"],
      telefono1: row["telefono1"],
      telefono2: row["telefono2"],
      email: row["email"],
      apoderado: {
        nombre: row["apoderado_nombre"],
        rut: row["apoderado_rut"],
        telefono1: row["apoderado_telefono1"],
        telefono2: row["apoderado_telefono2"],
        email: row["apoderado_email"],
        relacion: row["apoderado_relacion"]
      }
    };

    // Agregar el estudiante a Firestore usando batch para optimización
    const docRef = estudiantesRef.doc(studentData.id);
    batch.set(docRef, studentData);
  });

  // Ejecutar la operación en lote
  await batch.commit();
  console.log("✅ Estudiantes cargados exitosamente en Firestore.");
};
