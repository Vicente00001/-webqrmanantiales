import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { generarTodosLosQR } from "../scripts/generarQR";
import { generarQRIndividual } from "../scripts/generarQRIndividual";
import "./GenerarQR.css"; // Importamos los estilos
import logo from "../assets/LOGOMANANTIALES.png";

const GenerarQR = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Obtener lista de estudiantes desde Firestore con todos los campos necesarios
  useEffect(() => {
    const fetchEstudiantes = async () => {
      const snapshot = await getDocs(collection(db, "estudiantes"));
      const estudiantesData = snapshot.docs.map((doc) => ({
        rut: doc.id.replace(/\./g, "").replace(/-/g, ""),
        nombre: doc.data().nombre || "Sin nombre",
        apellidoPaterno: doc.data().apellido_paterno || "",
        apellidoMaterno: doc.data().apellido_materno || "",
        curso: doc.data().curso || ""
      }));
      setEstudiantes(estudiantesData);
    };

    fetchEstudiantes();
  }, []);

  // Función para generar nombre de archivo según formato requerido
  const generarNombreArchivo = (estudiante) => {
    return `${estudiante.curso}_${estudiante.rut}_${estudiante.nombre}_${estudiante.apellidoPaterno}_${estudiante.apellidoMaterno}`
      .replace(/\s+/g, '_')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  };
  

  // Función para generar texto QR
const generarTextoQR = (estudiante) => {
  return `${estudiante.nombre} ${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno} ${estudiante.curso}`;
};

  // Llamada a generar QR individual
const handleGenerarQRIndividual = () => {
  if (selectedStudent) {
    generarQRIndividual(
      selectedStudent.rut,
      generarNombreArchivo(selectedStudent),
      generarTextoQR(selectedStudent),
      selectedStudent // Pasamos el objeto completo
    );
  } else {
    alert("⚠️ Selecciona un estudiante antes de generar el QR.");
  }
};

  // Llamada a generar todos los QR
const handleGenerarTodosLosQR = () => {
  const estudiantesConDatosCompletos = estudiantes.map(est => ({
    ...est,
    nombreArchivo: generarNombreArchivo(est),
    textoQR: generarTextoQR(est)
  }));
  generarTodosLosQR(estudiantesConDatosCompletos);
};

  return (
    <div className="qr-container">
      {/* Encabezado con logo y título */}
      <div className="qr-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="qr-logo" />
        <h1 className="qr-title">Gestión de Códigos QR</h1>
      </div>

      {/* Botones alineados verticalmente */}
      <div className="qr-buttons">
        <button className="qr-button" onClick={handleGenerarTodosLosQR}>
          Generar QR para Todos los Alumnos
        </button>
        <button className="qr-button" onClick={() => setShowModal(true)}>
          Obtener QR Individual
        </button>
        <button className="back-button" onClick={() => navigate("/menu")}>
          Volver al Menú
        </button>
      </div>

      {/* Modal para QR Individual */}
      {showModal && (
  <div className="modal-overlay">
    <div className="modal">
      <h2>Obtener QR Individual</h2>
      
      {/* Campo de búsqueda con dropdown */}
      <div className="modificar-selection">
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <ul className="dropdown-results">
            {estudiantes
              .filter((est) => {
                if (!est || !est.nombre) return false;
                const searchLower = searchQuery.toLowerCase();
                return (
                  est.nombre.toLowerCase().includes(searchLower) ||
                  (est.apellidoPaterno && est.apellidoPaterno.toLowerCase().includes(searchLower)) ||
                  (est.apellidoMaterno && est.apellidoMaterno.toLowerCase().includes(searchLower)) ||
                  est.rut.includes(searchQuery)
                );
              })
              .map((est) => (
                <li 
                  key={est.rut} 
                  onClick={() => {
                    setSelectedStudent(est);
                    setSearchQuery(`${est.rut} - ${est.nombre} ${est.apellidoPaterno} ${est.apellidoMaterno}`);
                  }}
                >
                  {est.rut} - {est.nombre} {est.apellidoPaterno} {est.apellidoMaterno} ({est.curso})
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Mostrar estudiante seleccionado */}
      {selectedStudent && (
        <div className="selected-student-info">
          <p>Seleccionado: {selectedStudent.nombre} {selectedStudent.apellidoPaterno} {selectedStudent.apellidoMaterno}</p>
        </div>
      )}

      {/* Botón de generación de QR */}
      <button
        className="qr-button"
        onClick={handleGenerarQRIndividual}
      >
        Descargar QR
      </button>

      <button className="back-button" onClick={() => setShowModal(false)}>
        Cerrar
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default GenerarQR;