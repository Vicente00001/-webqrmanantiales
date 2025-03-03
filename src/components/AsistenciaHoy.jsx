import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import "./AsistenciaHoy.css";
import logo from "../assets/LOGOMANANTIALES.png";

const AsistenciaHoy = () => {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [filteredEstudiantes, setFilteredEstudiantes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newEstado, setNewEstado] = useState("");
  const [newHora, setNewHora] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [sortOrder, setSortOrder] = useState("asc");
  const [contador, setContador] = useState({ presentes: 0, atrasados: 0, ausentes: 0 });

  // Obtener estudiantes desde Firestore
  useEffect(() => {
    const fetchEstudiantes = async () => {
      const snapshot = await getDocs(collection(db, "estudiantes"));
      const estudiantesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: `${doc.data().nombre} ${doc.data().apellido_paterno} ${doc.data().apellido_materno}`,
        curso: doc.data().curso || "Sin curso",
        estado: "Ausente",
        horaIngreso: "0",
      }));
      setEstudiantes(estudiantesData);
      setFilteredEstudiantes(estudiantesData);
      actualizarContador(estudiantesData);
    };
    fetchEstudiantes();
  }, []);

  // Clasificación de asistencia
const actualizarAsistencia = () => {
    const updatedEstudiantes = estudiantes.map((estudiante) => {
        // Generar un número aleatorio de minutos dentro del rango de 6:30 AM a 10:00 AM
        const horaAleatoria = Math.floor(Math.random() * (210)) + 390; // Minutos desde 6:30 AM (390) hasta 10:00 AM (600)
        const horas = Math.floor(horaAleatoria / 60);
        const minutos = horaAleatoria % 60;

        // Formatear horas y minutos con dos dígitos (ejemplo: 07:05)
        const horaFormateada = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

        // Determinar estado basado en la hora de ingreso
        let estado = "Presente";
        if (horaFormateada > "08:00") estado = "Atrasado"; // Después de las 8:00 AM
        if (horaFormateada < "06:30") estado = "Ausente"; // Antes de las 6:30 AM, considerarlo ausente

        return {
            ...estudiante,
            estado: Math.random() > 0.5 ? estado : "Ausente",
            horaIngreso: Math.random() > 0.5 ? horaFormateada : "0",
        };
    });

    setEstudiantes(updatedEstudiantes);
    setFilteredEstudiantes(updatedEstudiantes);
    actualizarContador(updatedEstudiantes);
};

// Actualizar el contador de estudiantes según el estado
const actualizarContador = (lista) => {
    const contadores = {
        presentes: lista.filter((e) => e.estado === "Presente").length,
        atrasados: lista.filter((e) => e.estado === "Atrasado").length,
        ausentes: lista.filter((e) => e.estado === "Ausente").length,
    };
    setContador(contadores);
};

  // Filtrar estudiantes por búsqueda
  useEffect(() => {
    const filtered = estudiantes.filter((estudiante) =>
      estudiante.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      estudiante.id.includes(searchQuery)
    );
    setFilteredEstudiantes(filtered);
  }, [searchQuery, estudiantes]);

  // Abrir el modal para seleccionar un estudiante y modificar su estado
  const handleOpenModal = (estudiante) => {
    setSelectedStudent(estudiante);
    setNewEstado(estudiante.estado);
    setNewHora(estudiante.horaIngreso !== "0" ? estudiante.horaIngreso : "08:00");
    setShowModal(true);
  };

  // Guardar cambios en Firestore
  const handleSaveChanges = async () => {
    if (!selectedStudent) return;

    const estudianteRef = doc(db, "estudiantes", selectedStudent.id);
    await updateDoc(estudianteRef, {
      estado: newEstado,
      horaIngreso: newEstado === "Ausente" ? "0" : newHora,
    });

    const updatedEstudiantes = estudiantes.map((est) =>
      est.id === selectedStudent.id
        ? { ...est, estado: newEstado, horaIngreso: newEstado === "Ausente" ? "0" : newHora }
        : est
    );

    setEstudiantes(updatedEstudiantes);
    setFilteredEstudiantes(updatedEstudiantes);
    actualizarContador(updatedEstudiantes);
    setShowModal(false);
  };

  // Mostrar mensaje emergente para "Generar QR de Alumno"
  const handleGenerarQR = () => {
    alert("🔜 Función de generación de QR aún no disponible.");
  };

  return (
    <div className="asistencia-container">
      <div className="asistencia-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="asistencia-logo" />
        <h1 className="asistencia-title">Asistencia de Hoy</h1>
      </div>

      <div className="asistencia-buttons">
        <button className="asistencia-button" onClick={actualizarAsistencia}>Actualizar Asistencia</button>
        <button className="asistencia-button" onClick={() => setShowModal(true)}>Marcar Atraso Justificado</button>
        <button className="asistencia-button" onClick={handleGenerarQR}>Generar QR de Alumno</button>
        <button className="back-button" onClick={() => navigate("/menu")}>Volver al Menú</button>
      </div>

      <div className="contador-asistencia">
        <p>✅ {contador.presentes} Presentes | ⏳ {contador.atrasados} Atrasados | ❌ {contador.ausentes} Ausentes</p>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Buscar por nombre o RUT..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="asistencia-list">
        <table>
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Curso</th>
              <th>Estado</th>
              <th>Hora de Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {filteredEstudiantes.map((estudiante) => (
              <tr key={estudiante.id} onClick={() => handleOpenModal(estudiante)}>
                <td>{estudiante.id}</td>
                <td>{estudiante.nombre}</td>
                <td>{estudiante.curso}</td>
                <td>{estudiante.estado}</td>
                <td>{estudiante.horaIngreso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
  <div className="modal-overlay">
    <div className="modal">
      <h2>Modificar Estado</h2>

      {/* Campo de selección con búsqueda integrada */}
      <label>Buscar Estudiante:</label>
      <select
        value={selectedStudent ? selectedStudent.id : ""}
        onChange={(e) => {
          const estudianteSeleccionado = estudiantes.find((est) => est.id === e.target.value);
          setSelectedStudent(estudianteSeleccionado);
          setNewEstado(estudianteSeleccionado.estado);
          setNewHora(estudianteSeleccionado.horaIngreso !== "0" ? estudianteSeleccionado.horaIngreso : "08:00");
        }}
      >
        <option value="">Seleccione un estudiante...</option>
        {estudiantes
          .filter((est) =>
            est.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            est.id.includes(searchQuery)
          )
          .map((est) => (
            <option key={est.id} value={est.id}>
              {est.id} - {est.nombre} ({est.curso})
            </option>
          ))}
      </select>

      {/* Campo de búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre o RUT..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {selectedStudent && (
        <>
          <p><strong>Nombre:</strong> {selectedStudent.nombre}</p>
          <p><strong>RUT:</strong> {selectedStudent.id}</p>
          <p><strong>Curso:</strong> {selectedStudent.curso}</p>

          <label>Estado:</label>
          <select value={newEstado} onChange={(e) => setNewEstado(e.target.value)}>
            <option value="Presente">Presente</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Ausente">Ausente</option>
          </select>

          <label>Hora de Ingreso:</label>
          <input
            type="time"
            value={newHora}
            onChange={(e) => setNewHora(e.target.value)}
            disabled={newEstado === "Ausente"}
          />

          <button onClick={handleSaveChanges}>Guardar</button>
        </>
      )}

      <button onClick={() => setShowModal(false)}>Cancelar</button>
    </div>
  </div>
)}


    </div>
  );
};

export default AsistenciaHoy;
