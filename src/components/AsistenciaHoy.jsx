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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [justificacion, setJustificacion] = useState("");

  const obtenerAtrasados = async () => {
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
  };

  const obtenerEstudiantes = async () => {
    const snapshot = await getDocs(collection(db, "estudiantes"));
    const estudiantesData = snapshot.docs.map((doc) => ({
      rut: doc.id.replace(/\./g, "").replace(/-/g, ""),
      nombre: doc.data().nombre,
      apellido_paterno: doc.data().apellido_paterno,
      apellido_materno: doc.data().apellido_materno,
      curso: doc.data().curso || "Sin curso",
    }));
    setEstudiantes(estudiantesData);
  };

  useEffect(() => {
    obtenerAtrasados();
    obtenerEstudiantes();
  }, []);

  const justificarAtraso = async () => {
    if (!selectedStudent) return;

    const usuarioActual = "correo_del_usuario_autenticado@ejemplo.com";

    const docRef = doc(db, "asistencias", selectedStudent.id);
    await updateDoc(docRef, {
      estado: "Justificado",
      justificacion,
      responsable_justificacion: usuarioActual,
    });

    setShowModal(false);
    obtenerAtrasados();
  };

  const generarNombreArchivo = (estudiante) => {
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
    return `${estudiante.nombre} ${estudiante.apellido_paterno} ${estudiante.apellido_materno} ${estudiante.curso}`;
  };

  const generarQR = async () => {
    if (!selectedStudent) return;
    
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
    
    setShowQRModal(false);
  };

  return (
    <div className="asistencia-container">
      <div className="asistencia-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="asistencia-logo" />
        <h1 className="asistencia-title">Atrasos de Hoy</h1>
      </div>

      <div className="asistencia-buttons">
        <button className="asistencia-button" onClick={obtenerAtrasados}>Actualizar</button>
        <button className="asistencia-button" onClick={() => setShowModal(true)}>Justificar</button>
        <button className="asistencia-button" onClick={() => setShowQRModal(true)}>Generar QR</button>
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
                <tr key={estudiante.id} onClick={() => setSelectedStudent(estudiante)}>
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
              <button className="modal-button confirm" onClick={justificarAtraso}>Guardar</button>
              <button className="modal-button cancel" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

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
        {searchQuery && (
          <ul className="dropdown-results">
            {estudiantes
              .filter((est) => {
                if (!est || !est.nombre) return false;
                const searchLower = searchQuery.toLowerCase();
                return (
                  est.nombre.toLowerCase().includes(searchLower) ||
                  (est.apellido_paterno && est.apellido_paterno.toLowerCase().includes(searchLower)) ||
                  (est.apellido_materno && est.apellido_materno.toLowerCase().includes(searchLower)) ||
                  est.rut.includes(searchQuery)
                );
              })
              .map((est) => (
                <li 
                  key={est.rut} 
                  onClick={() => {
                    setSelectedStudent(est);
                    setSearchQuery(`${est.rut} - ${est.nombre} ${est.apellido_paterno} ${est.apellido_materno}`);
                  }}
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
        </div>
      )}

      <div className="modal-actions">
        <button className="modal-button confirm" onClick={generarQR}>Descargar</button>
        <button className="modal-button cancel" onClick={() => setShowQRModal(false)}>Cancelar</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default AsistenciaHoy;