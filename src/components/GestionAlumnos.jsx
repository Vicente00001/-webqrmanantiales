import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import "./GestionAlumnos.css";
import logo from "../assets/LOGOMANANTIALES.png";

const GestionAlumnos = () => {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedData, setEditedData] = useState({});

  // 🔹 Obtener todos los estudiantes y los cursos disponibles
  const obtenerDatos = async () => {
    const snapshot = await getDocs(collection(db, "estudiantes"));
    const estudiantesData = snapshot.docs.map((doc) => ({
      id: doc.id, // RUT como ID
      ...doc.data(),
      email: doc.data().email?.toUpperCase() || "",
      apoderado: {
        nombre: doc.data().apoderado?.nombre?.toUpperCase() || "SIN APODERADO",
        email: doc.data().apoderado?.email?.toUpperCase() || "SIN CORREO",
      },
    }));
    setEstudiantes(estudiantesData);

    // 🔹 Extraer cursos únicos de los estudiantes
    const cursosUnicos = [...new Set(estudiantesData.map((est) => est.curso).filter(Boolean))];
    setCursos(cursosUnicos);
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  // 🔹 Filtrar alumnos por búsqueda
  const estudiantesFiltrados = estudiantes.filter((est) =>
    Object.values(est)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // 🔹 Seleccionar alumno y abrir modal de edición
  const handleEdit = (estudiante) => {
    setSelectedStudent(estudiante);
    setEditedData(estudiante);
    setShowEditModal(true);
  };

  // 🔹 Eliminar alumno
  const handleDelete = async (estudiante) => {
    if (!estudiante) return;

    // Confirmar antes de eliminar
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar al estudiante ${estudiante.nombre}?`
    );

    if (confirmar) {
      try {
        const docRef = doc(db, "estudiantes", estudiante.id);
        await deleteDoc(docRef);
        alert("✅ Estudiante eliminado correctamente.");
        obtenerDatos(); // Recargar la lista de estudiantes
      } catch (error) {
        console.error("Error eliminando estudiante:", error);
        alert("❌ Error al eliminar el estudiante.");
      }
    }
  };

  // 🔹 Guardar cambios en Firestore
  const handleSaveChanges = async () => {
    if (!selectedStudent) return;
    const docRef = doc(db, "estudiantes", selectedStudent.id);

    // Comparar datos antes y después para detectar cambios
    const cambiosRealizados = Object.keys(editedData).some(
      (key) => JSON.stringify(editedData[key]) !== JSON.stringify(selectedStudent[key])
    );

    if (!cambiosRealizados) {
      alert("⚠️ No se actualizó nada.");
      return;
    }

    try {
      await updateDoc(docRef, {
        ...editedData,
        matriculado: Boolean(editedData.matriculado), // Asegurar que sea booleano
      });

      alert("✅ Cambios realizados correctamente.");
      setShowEditModal(false); // Cierra el modal tras la actualización
      obtenerDatos(); // Recargar la lista de estudiantes
    } catch (error) {
      console.error("Error actualizando datos:", error);
      alert("❌ Error actualizando datos del estudiante.");
    }
  };

  return (
    <div className="gestion-container">
      <div className="gestion-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="gestion-logo" />
        <h1 className="gestion-title">Gestión de Alumnos</h1>
      </div>

      <div className="gestion-buttons">
        <button className="add-button" onClick={() => navigate("/agregar-alumno")}>
          ➕ Agregar Nuevo Alumno
        </button>
        
        <button className="back-button" onClick={() => navigate("/menu")}>
          Volver al Menú
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, RUT o correo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="table-container">
  <table className="responsive-table">
    <thead>
      <tr>
        <th>RUT</th>
        <th>Nombre</th>
        <th>Curso</th>
       
        <th>Apoderado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {estudiantesFiltrados.map((est) => (
        <tr key={est.id}>
          <td data-label="RUT">{est.id}</td>
          <td data-label="Nombre">{`${est.nombre} ${est.apellido_paterno} ${est.apellido_materno}`}</td>
          <td data-label="Curso">{est.curso}</td>
          
          <td data-label="Apoderado">{est.apoderado.nombre}</td>
          <td data-label="Acciones" className="actions-cell">
            <button className="edit-button" onClick={() => handleEdit(est)}>✏️ Editar</button>
            <button className="delete-button" onClick={() => handleDelete(est)}>
              ❌ Eliminar
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      {/* 🔹 Modal para edición */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal modal-fullscreen">
            <h2>Editar Alumno</h2>

            <label>RUT:</label>
            <input type="text" value={selectedStudent.id} disabled />

            <label>Curso:</label>
            <select
              value={editedData.curso}
              onChange={(e) => setEditedData({ ...editedData, curso: e.target.value })}
            >
              {cursos.map((curso) => (
                <option key={curso} value={curso}>{curso}</option>
              ))}
            </select>

            <label>Nombre:</label>
            <input type="text" value={editedData.nombre} onChange={(e) => setEditedData({ ...editedData, nombre: e.target.value })} />

            <label>Apellido Paterno:</label>
            <input type="text" value={editedData.apellido_paterno} onChange={(e) => setEditedData({ ...editedData, apellido_paterno: e.target.value })} />

            <label>Apellido Materno:</label>
            <input type="text" value={editedData.apellido_materno} onChange={(e) => setEditedData({ ...editedData, apellido_materno: e.target.value })} />

            <label>Fecha de Nacimiento:</label>
            <input type="date" value={editedData.fecha_nacimiento?.split(" ")[0]} onChange={(e) => setEditedData({ ...editedData, fecha_nacimiento: e.target.value })} />

            <label>Género:</label>
            <select value={editedData.genero} onChange={(e) => setEditedData({ ...editedData, genero: e.target.value })}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>

            <label>Correo Alumno:</label>
            <input type="email" value={editedData.email} onChange={(e) => setEditedData({ ...editedData, email: e.target.value.toUpperCase() })} />

            <label>Nombre Apoderado:</label>
            <input type="text" value={editedData.apoderado.nombre} onChange={(e) => setEditedData({ ...editedData, apoderado: { ...editedData.apoderado, nombre: e.target.value.toUpperCase() } })} />

            <label>Correo Apoderado:</label>
            <input type="email" value={editedData.apoderado.email} onChange={(e) => setEditedData({ ...editedData, apoderado: { ...editedData.apoderado, email: e.target.value.toUpperCase() } })} />

            <label>Teléfono 1:</label>
            <input type="text" value={editedData.telefono1} onChange={(e) => setEditedData({ ...editedData, telefono1: e.target.value })} />

            <label>Teléfono 2:</label>
            <input type="text" value={editedData.telefono2} onChange={(e) => setEditedData({ ...editedData, telefono2: e.target.value })} />

            <button className="edit-button" onClick={handleSaveChanges}>Guardar Cambios</button>
            <button className="delete-button" onClick={() => setShowEditModal(false)}>❌ Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionAlumnos;