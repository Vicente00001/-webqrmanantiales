import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import "./MedidasDisciplinarias.css"; // Importamos los estilos
import logo from "../assets/LOGOMANANTIALES.png";

const GenerarAtrasos = () => {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [filteredEstudiantes, setFilteredEstudiantes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstudiante, setSelectedEstudiante] = useState(null);
  const [fecha, setFecha] = useState("");
  const currentUser = auth.currentUser;

  // Obtener todos los estudiantes
  useEffect(() => {
    const fetchEstudiantes = async () => {
      const estudiantesRef = collection(db, "estudiantes");
      const snapshot = await getDocs(estudiantesRef);
      const estudiantesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre || "",
        apellido_paterno: doc.data().apellido_paterno || "",
        apellido_materno: doc.data().apellido_materno || "",
        curso: doc.data().curso || "",
      }));
      setEstudiantes(estudiantesList);
      setFilteredEstudiantes(estudiantesList); // Inicialmente mostrar todos los estudiantes
    };

    fetchEstudiantes();
  }, []);

  // Filtrar estudiantes según el término de búsqueda
  useEffect(() => {
    const results = estudiantes.filter((estudiante) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (estudiante.id && estudiante.id.toLowerCase().includes(searchLower)) || // Buscar por RUT
        (estudiante.nombre && estudiante.nombre.toLowerCase().includes(searchLower)) || // Buscar por nombre
        (estudiante.apellido_paterno && estudiante.apellido_paterno.toLowerCase().includes(searchLower)) || // Buscar por apellido paterno
        (estudiante.apellido_materno && estudiante.apellido_materno.toLowerCase().includes(searchLower)) || // Buscar por apellido materno
        (estudiante.curso && estudiante.curso.toLowerCase().includes(searchLower)) // Buscar por curso
      );
    });
    setFilteredEstudiantes(results);
  }, [searchTerm, estudiantes]);

  // Manejar el envío del formulario para generar un atraso
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEstudiante || !fecha) {
      alert("Por favor, selecciona un estudiante y una fecha.");
      return;
    }

    const asistenciasRef = collection(db, "asistencias");

    try {
      await addDoc(asistenciasRef, {
        estudiante_id: selectedEstudiante.id,
        fecha: fecha,
        estado: "Atrasado",
        hora: new Date().toLocaleTimeString(),
        inspector_id: currentUser.uid,
        timestamp: serverTimestamp(),
      });
      alert("Atraso registrado correctamente");
      navigate("/menu"); // Redirigir al menú principal
    } catch (error) {
      console.error("Error al registrar el atraso: ", error);
      alert("Hubo un error al registrar el atraso.");
    }
  };

  return (
    <div className="medidas-container">
      {/* Encabezado con logo y título */}
      <div className="medidas-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="medidas-logo" />
        <h1 className="medidas-title">Generar Atraso</h1>
      </div>

      {/* Buscador */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Buscar por RUT, nombre, apellidos o curso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Botón para volver al menú */}
      <button className="back-button" onClick={() => navigate("/menu")}>
        Volver al Menú
      </button>

      {/* Listado de estudiantes filtrados */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Apellido Paterno</th>
              <th>Apellido Materno</th>
              <th>Curso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEstudiantes.map((estudiante) => (
              <tr key={estudiante.id}>
                <td>{estudiante.id}</td>
                <td>{estudiante.nombre}</td>
                <td>{estudiante.apellido_paterno}</td>
                <td>{estudiante.apellido_materno}</td>
                <td>{estudiante.curso}</td>
                <td>
                  <button
                    className="medidas-button"
                    onClick={() => setSelectedEstudiante(estudiante)}
                  >
                    Seleccionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulario para generar atraso */}
      {selectedEstudiante && (
        <form onSubmit={handleSubmit} className="medidas-form">
          <div className="form-group">
            <label>Estudiante Seleccionado:</label>
            <input
              type="text"
              value={`${selectedEstudiante.nombre} ${selectedEstudiante.apellido_paterno} ${selectedEstudiante.apellido_materno} - ${selectedEstudiante.curso}`}
              readOnly
            />
          </div>
          <div className="form-group">
            <label>Fecha del Atraso:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="medidas-button">
            Generar Atraso
          </button>
        </form>
      )}

      
    </div>
  );
};

export default GenerarAtrasos;