import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { generarTodosLosQR } from "../scripts/generarQR";
import { generarQRIndividual } from "../scripts/generarQRIndividual";
import QRCode from "qrcode";
import "./GenerarQR.css";
import logo from "../assets/LOGOMANANTIALES.png";

const GenerarQR = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  // Obtener lista de estudiantes desde Firestore
  useEffect(() => {
    const fetchEstudiantes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "estudiantes"));
        const estudiantesData = snapshot.docs.map((doc) => ({
          rut: doc.id.replace(/\./g, "").replace(/-/g, ""),
          nombre: doc.data().nombre || "Sin nombre",
          apellidoPaterno: doc.data().apellido_paterno || "",
          apellidoMaterno: doc.data().apellido_materno || "",
          curso: doc.data().curso || ""
        }));
        setEstudiantes(estudiantesData);
      } catch (error) {
        console.error("Error al obtener estudiantes:", error);
        alert("Error al cargar la lista de estudiantes");
      }
    };

    fetchEstudiantes();
  }, []);

  // Generar nombre de archivo
  const generarNombreArchivo = (estudiante) => {
    if (!estudiante) return "";
    return `${estudiante.curso}_${estudiante.rut}_${estudiante.nombre}_${estudiante.apellidoPaterno}_${estudiante.apellidoMaterno}`
      .replace(/\s+/g, '_')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  };

  // Generar QR para visualización
  const generarQRParaVisualizacion = async (rut) => {
    try {
      const url = await QRCode.toDataURL(rut, {
        width: 256,
        margin: 1
      });
      setQrImageUrl(url);
    } catch (error) {
      console.error("Error generando QR para visualización:", error);
      setQrImageUrl("");
    }
  };

  // Manejar selección de estudiante
  const handleSelectStudent = (estudiante) => {
    setSelectedStudent(estudiante);
    setSearchQuery(`${estudiante.rut} - ${estudiante.nombre} ${estudiante.apellidoPaterno} ${estudiante.apellidoMaterno}`);
    generarQRParaVisualizacion(estudiante.rut);
  };

  // Generar QR individual
  const handleGenerarQRIndividual = () => {
    if (!selectedStudent) {
      alert("⚠️ Selecciona un estudiante antes de generar el QR.");
      return;
    }
    generarQRIndividual(
      selectedStudent.rut,
      generarNombreArchivo(selectedStudent),
      selectedStudent.rut, // Solo pasamos el RUT como contenido del QR
      selectedStudent
    );
  };

  // Generar todos los QR
  const handleGenerarTodosLosQR = async () => {
    if (estudiantes.length === 0) {
      alert("No hay estudiantes registrados para generar códigos QR");
      return;
    }

    setLoading(true);
    setDownloadStatus("Generando archivos QR...");
    
    try {
      const estudiantesConDatosCompletos = estudiantes.map(estudiante => ({
        ...estudiante,
        nombreArchivo: generarNombreArchivo(estudiante),
        textoQR: estudiante.rut // Solo usamos el RUT como contenido del QR
      }));
      
      await generarTodosLosQR(estudiantesConDatosCompletos);
      
      setDownloadStatus("Descargando archivos en su dispositivo...");
      setTimeout(() => {
        setDownloadStatus("");
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Error generando QR:", error);
      setDownloadStatus("Error al generar los QR");
      setLoading(false);
      alert("Ocurrió un error al generar los códigos QR");
    }
  };

  // Visualizar QR
  const handleVisualizarQR = () => {
    if (!selectedStudent) {
      alert("⚠️ Selecciona un estudiante antes de visualizar el QR.");
      return;
    }
    setShowQRModal(true);
  };

  // Filtrar estudiantes
  const estudiantesFiltrados = searchQuery
    ? estudiantes.filter((estudiante) => {
        if (!estudiante) return false;
        const searchLower = searchQuery.toLowerCase();
        return (
          (estudiante.nombre && estudiante.nombre.toLowerCase().includes(searchLower)) ||
          (estudiante.apellidoPaterno && estudiante.apellidoPaterno.toLowerCase().includes(searchLower)) ||
          (estudiante.apellidoMaterno && estudiante.apellidoMaterno.toLowerCase().includes(searchLower)) ||
          (estudiante.rut && estudiante.rut.includes(searchQuery))
        );
      })
    : [];

  return (
    <div className="qr-container">
      {/* Encabezado */}
      <div className="qr-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="qr-logo" />
        <h1 className="qr-title">Gestión de Códigos QR</h1>
      </div>

      {/* Mensajes de estado */}
      {downloadStatus && (
        <div className="status-message">
          {downloadStatus}
          {loading && <div className="loading-spinner"></div>}
        </div>
      )}

      {/* Botones principales */}
      <div className="qr-buttons">
        <button 
          className="qr-button" 
          onClick={handleGenerarTodosLosQR}
          disabled={loading || estudiantes.length === 0}
        >
          Generar QR para Todos los Alumnos
        </button>
        <button 
          className="qr-button" 
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          Obtener QR Individual
        </button>
        <button 
          className="back-button" 
          onClick={() => navigate("/menu")}
          disabled={loading}
        >
          Volver al Menú
        </button>
      </div>

      {/* Modal para QR Individual */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Obtener QR Individual</h2>
            
            {/* Campo de búsqueda */}
            <div className="modificar-selection">
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
              {searchQuery && estudiantesFiltrados.length > 0 && (
                <ul className="dropdown-results">
                  {estudiantesFiltrados.map((estudiante) => (
                    <li 
                      key={estudiante.rut} 
                      onClick={() => handleSelectStudent(estudiante)}
                    >
                      {estudiante.rut} - {estudiante.nombre} {estudiante.apellidoPaterno} {estudiante.apellidoMaterno} ({estudiante.curso})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Estudiante seleccionado */}
            {selectedStudent && (
              <div className="selected-student-info">
                <p>Seleccionado: {selectedStudent.nombre} {selectedStudent.apellidoPaterno} {selectedStudent.apellidoMaterno}</p>
                <p>RUT: {selectedStudent.rut}</p>
              </div>
            )}

            {/* Botones de acciones */}
            <div className="qr-action-buttons">
              <button
                className="qr-button"
                onClick={handleGenerarQRIndividual}
                disabled={!selectedStudent || loading}
              >
                Descargar QR
              </button>
              
              <button
                className="visualizar-button"
                onClick={handleVisualizarQR}
                disabled={!selectedStudent || loading}
              >
                Visualizar QR
              </button>
            </div>

            <button 
              className="back-button" 
              onClick={() => {
                setShowModal(false);
                setSelectedStudent(null);
                setSearchQuery("");
                setQrImageUrl("");
              }}
              disabled={loading}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal para visualizar QR */}
      {showQRModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="qr-display-modal">
            <h2>QR para {selectedStudent.nombre} {selectedStudent.apellidoPaterno}</h2>
            
            <div className="qr-code-container">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt={`QR Code for ${selectedStudent.rut}`} />
              ) : (
                <p>Generando código QR...</p>
              )}
            </div>
            
            <div className="qr-info">
              <p><strong>Contenido del QR:</strong> {selectedStudent.rut}</p>
              <p><strong>Nombre:</strong> {selectedStudent.nombre} {selectedStudent.apellidoPaterno} {selectedStudent.apellidoMaterno}</p>
              <p><strong>Curso:</strong> {selectedStudent.curso}</p>
            </div>
            
            <button 
              className="back-button" 
              onClick={() => setShowQRModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerarQR;