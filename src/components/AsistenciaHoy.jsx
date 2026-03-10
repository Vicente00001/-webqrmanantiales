import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import QRCode from "qrcode";
import "./AsistenciaHoy.css";
import logo from "../assets/LOGOMANANTIALES.png";
import { generarQRIndividual } from "../scripts/generarQRIndividual";

const AsistenciaHoy = () => {
  const navigate = useNavigate();
  const [atrasados, setAtrasados] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRDisplayModal, setShowQRDisplayModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [justificacion, setJustificacion] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  const obtenerAtrasados = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const snapshotAtrasados = await getDocs(collection(db, "asistencias"));
      let atrasadosData = snapshotAtrasados.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((registro) => registro.estado === "Atrasado" && registro.fecha === today);

      const snapshotEstudiantes = await getDocs(collection(db, "estudiantes"));
      const estudiantesMap = new Map(
        snapshotEstudiantes.docs.map((doc) => [
          doc.id,
          {
            nombre: doc.data().nombre,
            apellido_paterno: doc.data().apellido_paterno,
            apellido_materno: doc.data().apellido_materno,
            curso: doc.data().curso || "Sin curso",
          },
        ])
      );

      atrasadosData = atrasadosData.map((registro) => ({
        ...registro,
        nombreCompleto: `${estudiantesMap.get(registro.estudiante_id)?.nombre || "Desconocido"} ${estudiantesMap.get(registro.estudiante_id)?.apellido_paterno || ""} ${estudiantesMap.get(registro.estudiante_id)?.apellido_materno || ""}`,
        nombre: estudiantesMap.get(registro.estudiante_id)?.nombre || "Desconocido",
        apellido_paterno: estudiantesMap.get(registro.estudiante_id)?.apellido_paterno || "",
        apellido_materno: estudiantesMap.get(registro.estudiante_id)?.apellido_materno || "",
        curso: estudiantesMap.get(registro.estudiante_id)?.curso || "Sin curso",
      }));

      setAtrasados(atrasadosData);
    } catch (error) {
      console.error("Error obteniendo atrasados:", error);
      alert("Error al cargar los atrasados");
    }
  };

  const obtenerEstudiantes = async () => {
    try {
      const snapshot = await getDocs(collection(db, "estudiantes"));
      const estudiantesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        rut: doc.id.replace(/\./g, "").replace(/-/g, ""),
        nombre: doc.data().nombre,
        apellido_paterno: doc.data().apellido_paterno,
        apellido_materno: doc.data().apellido_materno,
        curso: doc.data().curso || "Sin curso",
      }));
      setEstudiantes(estudiantesData);
    } catch (error) {
      console.error("Error obteniendo estudiantes:", error);
      alert("Error al cargar la lista de estudiantes");
    }
  };

  useEffect(() => {
    obtenerAtrasados();
    obtenerEstudiantes();
  }, []);

  const justificarAtraso = async () => {
    if (!selectedStudent) {
      alert("Por favor selecciona un estudiante");
      return;
    }

    try {
      const usuarioActual = "correo_del_usuario_autenticado@ejemplo.com";

      const docRef = doc(db, "asistencias", selectedStudent.id);
      await updateDoc(docRef, {
        estado: "Justificado",
        justificacion,
        responsable_justificacion: usuarioActual,
      });

      alert("Atraso justificado correctamente");
      setShowModal(false);
      setJustificacion("");
      setSelectedStudent(null);
      obtenerAtrasados();
    } catch (error) {
      console.error("Error justificando atraso:", error);
      alert("Error al justificar el atraso");
    }
  };

  const generarNombreArchivo = (estudiante) => {
    if (!estudiante) return "";
    const nombreLimpio = `${estudiante.nombre}_${estudiante.apellido_paterno}_${estudiante.apellido_materno}`
      .replace(/\s+/g, '_')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    
    const cursoLimpio = (estudiante.curso || "SINCURSO")
      .replace(/\s+/g, '')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    return `${estudiante.rut}_${nombreLimpio}_${cursoLimpio}`;
  };

  const generarTextoQR = (estudiante) => {
    return estudiante.rut; // Solo el RUT como contenido del QR
  };

  const generarQR = async () => {
    if (!selectedStudent) {
      alert("Por favor selecciona un estudiante");
      return;
    }

    try {
      await generarQRIndividual(
        selectedStudent.rut,
        generarNombreArchivo(selectedStudent),
        generarTextoQR(selectedStudent),
        {
          nombre: selectedStudent.nombre,
          apellidoPaterno: selectedStudent.apellido_paterno,
          apellidoMaterno: selectedStudent.apellido_materno,
          curso: selectedStudent.curso
        }
      );
    } catch (error) {
      console.error("Error generando QR:", error);
      alert("Error al generar el código QR");
    }
  };

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

  const handleSelectStudentForQR = (estudiante) => {
    setSelectedStudent(estudiante);
    setSearchQuery(`${estudiante.rut} - ${estudiante.nombre} ${estudiante.apellido_paterno} ${estudiante.apellido_materno}`);
    generarQRParaVisualizacion(estudiante.rut);
  };

  const handleVisualizarQR = () => {
    if (!selectedStudent) {
      alert("Por favor selecciona un estudiante primero");
      return;
    }
    setShowQRDisplayModal(true);
  };

  const estudiantesFiltrados = searchQuery
    ? estudiantes.filter((est) => {
        if (!est || !est.nombre) return false;
        const searchLower = searchQuery.toLowerCase();
        return (
          est.nombre.toLowerCase().includes(searchLower) ||
          (est.apellido_paterno && est.apellido_paterno.toLowerCase().includes(searchLower)) ||
          (est.apellido_materno && est.apellido_materno.toLowerCase().includes(searchLower)) ||
          est.rut.includes(searchQuery)
        );
      })
    : [];

  return (
    <div className="asistencia-container">
      <div className="asistencia-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="asistencia-logo" />
        <h1 className="asistencia-title">Atrasos de Hoy</h1>
      </div>

      <div className="asistencia-buttons">
        <button className="asistencia-button" onClick={obtenerAtrasados}>Actualizar</button>
        <button className="asistencia-button" onClick={() => setShowModal(true)}>Justificar</button>
        <button className="asistencia-button" onClick={() => {
          setShowQRModal(true);
          setSelectedStudent(null);
          setSearchQuery("");
        }}>Generar QR</button>
        <button className="back-button" onClick={() => navigate("/menu")}>Menú</button>
      </div>

      <div className="table-wrapper">
        <div className="table-container">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>RUT</th>
                <th>Nombre</th>
                <th>Curso</th>
                <th>Estado</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {atrasados.map((estudiante) => (
                <tr 
                  key={estudiante.id} 
                  onClick={() => setSelectedStudent(estudiante)}
                  className={selectedStudent?.id === estudiante.id ? "selected-row" : ""}
                >
                  <td data-label="RUT">{estudiante.estudiante_id}</td>
                  <td data-label="Nombre">{estudiante.nombreCompleto}</td>
                  <td data-label="Curso">{estudiante.curso}</td>
                  <td data-label="Estado">{estudiante.estado}</td>
                  <td data-label="Hora">{estudiante.hora}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para justificar atraso */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Justificar Atraso</h2>
            <select
              onChange={(e) => {
                const estudianteSeleccionado = atrasados.find(
                  (est) => est.id === e.target.value
                );
                setSelectedStudent(estudianteSeleccionado);
              }}
              value={selectedStudent?.id || ""}
            >
              <option value="">Selecciona estudiante...</option>
              {atrasados.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.nombreCompleto} - {est.estudiante_id}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Justificación"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              className="modal-input"
            />
            <div className="modal-actions">
              <button 
                className="modal-button confirm" 
                onClick={justificarAtraso}
                disabled={!selectedStudent || !justificacion}
              >
                Guardar
              </button>
              <button 
                className="modal-button cancel" 
                onClick={() => {
                  setShowModal(false);
                  setSelectedStudent(null);
                  setJustificacion("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para generar QR */}
      {showQRModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Generar QR</h2>
            
            <div className="modificar-selection">
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && estudiantesFiltrados.length > 0 && (
                <ul className="dropdown-results">
                  {estudiantesFiltrados.map((est) => (
                    <li 
                      key={est.rut} 
                      onClick={() => handleSelectStudentForQR(est)}
                    >
                      {est.rut} - {est.nombre} {est.apellido_paterno} {est.apellido_materno} ({est.curso})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedStudent && (
              <div className="selected-student-info">
                <p>Seleccionado: {selectedStudent.nombre} {selectedStudent.apellido_paterno} {selectedStudent.apellido_materno}</p>
                <p>RUT: {selectedStudent.rut}</p>
              </div>
            )}

            <div className="qr-action-buttons">
              <button
                className="modal-button confirm"
                onClick={generarQR}
                disabled={!selectedStudent}
              >
                Descargar QR
              </button>
              
              <button
                className="visualizar-button"
                onClick={handleVisualizarQR}
                disabled={!selectedStudent}
              >
                Visualizar QR
              </button>
              
              <button 
                className="modal-button cancel" 
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedStudent(null);
                  setSearchQuery("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar QR */}
      {showQRDisplayModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="qr-display-modal">
            <h2>QR para {selectedStudent.nombre} {selectedStudent.apellido_paterno}</h2>
            
            <div className="qr-code-container">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt={`QR Code for ${selectedStudent.rut}`} />
              ) : (
                <p>Generando código QR...</p>
              )}
            </div>
            
            <div className="qr-info">
              <p><strong>Contenido del QR:</strong> {selectedStudent.rut}</p>
              <p><strong>Nombre:</strong> {selectedStudent.nombre} {selectedStudent.apellido_paterno} {selectedStudent.apellido_materno}</p>
              <p><strong>Curso:</strong> {selectedStudent.curso}</p>
            </div>
            
            <button 
              className="back-button" 
              onClick={() => setShowQRDisplayModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsistenciaHoy;