import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import "./AsistenciaHoy.css";
import logo from "../assets/LOGOMANANTIALES.png";

const HistorialAtrasos = () => {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [registroToDelete, setRegistroToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const obtenerRegistros = async () => {
    const snapshot = await getDocs(collection(db, "asistencias"));
    let registrosData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Obtener información de estudiantes
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

    // Combinar datos
    registrosData = registrosData.map((registro) => ({
      ...registro,
      nombreCompleto: `${estudiantesMap.get(registro.estudiante_id)?.nombre || "Desconocido"} ${estudiantesMap.get(registro.estudiante_id)?.apellido_paterno || ""} ${estudiantesMap.get(registro.estudiante_id)?.apellido_materno || ""}`,
      nombre: estudiantesMap.get(registro.estudiante_id)?.nombre || "Desconocido",
      apellido_paterno: estudiantesMap.get(registro.estudiante_id)?.apellido_paterno || "",
      apellido_materno: estudiantesMap.get(registro.estudiante_id)?.apellido_materno || "",
      curso: estudiantesMap.get(registro.estudiante_id)?.curso || "Sin curso",
    }));

    // Ordenar por fecha (más reciente primero)
    registrosData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    setRegistros(registrosData);
  };

  useEffect(() => {
    obtenerRegistros();
  }, []);

  const confirmarEliminacion = (registro) => {
    setRegistroToDelete(registro);
    setShowDeleteModal(true);
  };

  const eliminarRegistro = async () => {
    if (!registroToDelete) return;

    try {
      await deleteDoc(doc(db, "asistencias", registroToDelete.id));
      obtenerRegistros();
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error al eliminar registro:", error);
    }
  };

  const filtrarRegistros = () => {
    if (!searchQuery) return registros;

    const query = searchQuery.toLowerCase();
    return registros.filter((registro) => {
      return (
        registro.nombreCompleto.toLowerCase().includes(query) ||
        registro.estudiante_id.toLowerCase().includes(query) ||
        registro.curso.toLowerCase().includes(query) ||
        registro.estado.toLowerCase().includes(query) ||
        registro.fecha.toLowerCase().includes(query)
      );
    });
  };

  return (
    <div className="asistencia-container">
      <div className="asistencia-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="asistencia-logo" />
        <h1 className="asistencia-title">Historial general de atrasos</h1>
      </div>

      <div className="asistencia-buttons">
        <button className="asistencia-button" onClick={obtenerRegistros}>Actualizar</button>
        <button className="back-button" onClick={() => navigate("/menu")}>Menú</button>
      </div>

      <div className="modificar-selection">
        <input
          type="text"
          placeholder="Buscar por nombre, RUT, curso o fecha..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="table-wrapper extended">
        <div className="table-container">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>RUT</th>
                <th>Nombre</th>
                <th>Curso</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrarRegistros().map((registro) => (
                <tr key={registro.id}>
                  <td data-label="RUT">{registro.estudiante_id}</td>
                  <td data-label="Nombre">{registro.nombreCompleto}</td>
                  <td data-label="Curso">{registro.curso}</td>
                  <td data-label="Estado">{registro.estado}</td>
                  <td data-label="Fecha">{registro.fecha}</td>
                  <td data-label="Hora">{registro.hora}</td>
                  <td data-label="Acciones">
                    <button 
                      className="delete-button" 
                      onClick={() => confirmarEliminacion(registro)}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar eliminación</h2>
            <p>¿Estás seguro que deseas eliminar el registro de {registroToDelete?.nombreCompleto} del {registroToDelete?.fecha}?</p>
            <p>Esta acción no se puede deshacer.</p>
            
            <div className="modal-actions">
              <button className="modal-button confirm" onClick={eliminarRegistro}>Eliminar</button>
              <button className="modal-button cancel" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialAtrasos;