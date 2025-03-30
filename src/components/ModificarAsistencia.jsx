import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, query, where, deleteDoc } from "firebase/firestore";
import "./ModificarAsistencia.css";
import logo from "../assets/LOGOMANANTIALES.png";

const ModificarAsistencia = () => {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEstudiantes, setFilteredEstudiantes] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [atrasos, setAtrasos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAtraso, setSelectedAtraso] = useState(null);
  const [mensajeJustificacion, setMensajeJustificacion] = useState("");

  // Obtener estudiantes desde Firestore
  useEffect(() => {
    const fetchEstudiantes = async () => {
      const snapshot = await getDocs(collection(db, "estudiantes"));
      const estudiantesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        rut: doc.data().rut || doc.id,
        nombre: `${doc.data().nombre} ${doc.data().apellido_paterno} ${doc.data().apellido_materno}`,
        curso: doc.data().curso || "Sin curso",
      }));
      setEstudiantes(estudiantesData);
      setFilteredEstudiantes(estudiantesData);
    };
    fetchEstudiantes();
  }, []);

  // Filtrado en tiempo real
  useEffect(() => {
    const filtered = estudiantes.filter((est) =>
      est.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.rut.includes(searchQuery)
    );
    setFilteredEstudiantes(filtered);
  }, [searchQuery, estudiantes]);

  // Cargar atrasos cuando se selecciona un estudiante
  useEffect(() => {
    const fetchAtrasos = async () => {
      if (selectedStudent) {
        try {
          const q = query(
            collection(db, "asistencias"), 
            where("estudiante_id", "==", selectedStudent.rut) // Buscamos por RUT
          );
          
          const snapshot = await getDocs(q);
          const atrasosData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Usamos los datos exactos del documento
              fecha: data.fecha || "Sin fecha",
              hora: data.hora || "No registrada",
            };
          });
          
          setAtrasos(atrasosData);
        } catch (error) {
          console.error("Error al cargar atrasos:", error);
          alert("Error al cargar los atrasos del estudiante");
        }
      }
    };
    fetchAtrasos();
  }, [selectedStudent]);

  // Seleccionar estudiante y cerrar lista de búsqueda
  const handleSelectStudent = (est) => {
    setSelectedStudent(est);
    setSearchQuery(`${est.rut} - ${est.nombre}`);
    setFilteredEstudiantes([]);
  };

  // Abrir modal para editar atraso
  const handleEditAtraso = (atraso) => {
    setSelectedAtraso(atraso);
    setMensajeJustificacion(atraso.mensaje || "");
    setModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Guardar cambios en el atraso
  const handleSaveJustificacion = async () => {
    if (!selectedAtraso || !mensajeJustificacion) {
      alert("Por favor ingresa un mensaje de justificación");
      return;
    }

    try {
      const atrasoRef = doc(db, "asistencias", selectedAtraso.id);
      await updateDoc(atrasoRef, {
        estado: "Justificado",
        mensaje: mensajeJustificacion,
      });

      // Actualizar la lista de atrasos
      setAtrasos(atrasos.map(atraso => 
        atraso.id === selectedAtraso.id 
          ? { ...atraso, estado: "Justificado", mensaje: mensajeJustificacion } 
          : atraso
      ));

      setModalOpen(false);
      alert("Atraso justificado correctamente");
    } catch (error) {
      console.error("Error al actualizar el atraso:", error);
      alert("Ocurrió un error al actualizar el atraso");
    }
  };

  // Eliminar atraso con confirmación
  const handleDeleteAtraso = async (atrasoId) => {
    const confirmacion = window.confirm("¿Está seguro que desea eliminar este registro de atraso?");
    if (!confirmacion) return;

    try {
      await deleteDoc(doc(db, "asistencias", atrasoId));
      setAtrasos(atrasos.filter(atraso => atraso.id !== atrasoId));
      alert("Registro de atraso eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar el atraso:", error);
      alert("Ocurrió un error al eliminar el atraso");
    }
  };

  return (
    <div className="modificar-container">
      <div className="modificar-box">
        <div className="modificar-header">
          <img src={logo} alt="Logo Colegio Manantiales" className="modificar-logo" />
          <h1 className="modificar-title">Modificación Manual de Atrasos</h1>
        </div>

        <div className="modificar-selection">
          <label>Buscar Alumno:</label>
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && filteredEstudiantes.length > 0 && (
            <ul className="dropdown-results">
              {filteredEstudiantes.map((est) => (
                <li key={est.id} onClick={() => handleSelectStudent(est)}>
                  {est.rut} - {est.nombre} ({est.curso})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mostrar datos del alumno seleccionado */}
        {selectedStudent && (
          <div className="modificar-datos">
            <h3>Datos del Estudiante</h3>
            <p><strong>Nombre:</strong> {selectedStudent.nombre}</p>
            <p><strong>RUT:</strong> {selectedStudent.rut}</p>
            <p><strong>Curso:</strong> {selectedStudent.curso}</p>

            <h3>Registros de Atrasos</h3>
            {atrasos.length > 0 ? (
              <table className="atrasos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {atrasos.map((atraso) => (
                    <tr key={atraso.id}>
                      <td>{atraso.fecha}</td>
                      <td>{atraso.hora}</td>
                      <td className={`estado-${atraso.estado?.toLowerCase() || 'pendiente'}`}>
                        {atraso.estado || "Pendiente"}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleEditAtraso(atraso)} 
                          disabled={atraso.estado === "Justificado"}
                          className="edit-button"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteAtraso(atraso.id)} 
                          className="delete-button"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No se encontraron registros de atrasos para este estudiante.</p>
            )}
          </div>
        )}

        {/* Modal simple para editar atraso */}
        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-simple">
              <h3>Justificar Atraso</h3>
              <p><strong>Fecha:</strong> {selectedAtraso?.fecha}</p>
              <p><strong>Hora:</strong> {selectedAtraso?.hora}</p>
              
              <div className="modal-input-group">
                <label>Mensaje de Justificación:</label>
                <textarea
                  value={mensajeJustificacion}
                  onChange={(e) => setMensajeJustificacion(e.target.value)}
                  placeholder="Ingrese el motivo de la justificación..."
                  rows={4}
                />
              </div>

              <div className="modal-button-group">
                <button onClick={handleSaveJustificacion} className="modal-btn modal-btn-primary">
                  Guardar Justificación
                </button>
                <button onClick={handleCloseModal} className="modal-btn modal-btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modificar-buttons">
          <button className="back-button" onClick={() => navigate("/menu")}>Volver al Menú</button>
        </div>
      </div>
    </div>
  );
};

export default ModificarAsistencia;