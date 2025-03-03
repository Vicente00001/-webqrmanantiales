import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const countDocuments = async () => {
  const snapshot = await db.collection("estudiantes").get();
  console.log(`✅ Total de estudiantes en Firestore: ${snapshot.size}`);
};

countDocuments().catch(console.error);
