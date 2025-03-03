import { useState } from "react";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const TestUpload = () => {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    
    const storageRef = ref(storage, `test/${file.name}`); // 🔹 Guarda en la carpeta "test/"
    await uploadBytes(storageRef, file);
    
    const downloadUrl = await getDownloadURL(storageRef);
    setUrl(downloadUrl);
    alert("✅ Archivo subido correctamente!");
  };

  return (
    <div>
      <h2>Subir Archivo a Firebase Storage</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Subir</button>
      {url && <p>Archivo subido: <a href={url} target="_blank">Ver archivo</a></p>}
    </div>
  );
};

export default TestUpload;
