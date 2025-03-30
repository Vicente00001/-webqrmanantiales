import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./ModificarAsistencia.css";
import logo from "../assets/LOGOMANANTIALES.png";

const HistorialAsistencia = () => {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEstudiantes, setFilteredEstudiantes] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [atrasos, setAtrasos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAtraso, setSelectedAtraso] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [estadisticas, setEstadisticas] = useState(null);

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
            where("estudiante_id", "==", selectedStudent.rut)
          );
          
          const snapshot = await getDocs(q);
          const atrasosData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              fecha: data.fecha || "Sin fecha",
              hora: data.hora || "No registrada",
            };
          });

          // Ordenar por fecha (más reciente primero)
          atrasosData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          
          setAtrasos(atrasosData);
          calcularEstadisticas(atrasosData);
        } catch (error) {
          console.error("Error al cargar atrasos:", error);
          alert("Error al cargar el historial del estudiante");
        }
      }
    };
    fetchAtrasos();
  }, [selectedStudent]);

  // Calcular estadísticas de asistencia
  const calcularEstadisticas = (registros) => {
    const totalDiasClase = 173;
    const totalAtrasos = registros.filter(a => a.estado === "Atrasado").length;
    const totalJustificados = registros.filter(a => a.estado === "Justificado").length;
    const porcentajeAsistencia = ((totalAtrasos * 100) / totalDiasClase).toFixed(2);
    
    setEstadisticas({
      totalDiasClase,
      totalAtrasos,
      totalJustificados,
      porcentajeAsistencia
    });
  };

  // Seleccionar estudiante
  const handleSelectStudent = (est) => {
    setSelectedStudent(est);
    setSearchQuery(`${est.rut} - ${est.nombre}`);
    setFilteredEstudiantes([]);
    setEstadisticas(null);
  };

  // Abrir modal para agregar observaciones
  const handleAgregarObservacion = (atraso) => {
    setSelectedAtraso(atraso);
    setObservacion(atraso.mensaje || "");
    setModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Guardar observación
  const handleSaveObservacion = async () => {
    if (!selectedAtraso || !observacion) {
      alert("Por favor ingresa una observación");
      return;
    }

    try {
      const atrasoRef = doc(db, "asistencias", selectedAtraso.id);
      await updateDoc(atrasoRef, {
        mensaje: observacion,
      });

      // Actualizar la lista de atrasos
      setAtrasos(atrasos.map(atraso => 
        atraso.id === selectedAtraso.id 
          ? { ...atraso, mensaje: observacion } 
          : atraso
      ));

      setModalOpen(false);
      alert("Observación agregada correctamente");
    } catch (error) {
      console.error("Error al actualizar el atraso:", error);
      alert("Ocurrió un error al agregar la observación");
    }
  };

  const generarPDF = () => {
    if (!selectedStudent || atrasos.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
  
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`Historial de Atrasos - ${selectedStudent.nombre}`, 15, 20);
    
    // Subtítulo
    doc.setFontSize(12);
    doc.text(`Curso: ${selectedStudent.curso} - Año 2025`, 15, 30);
    
    // Estadísticas
    doc.setFontSize(12);
    doc.text("Estadísticas de Asistencia:", 15, 45);
    doc.text(`- Días de clase totales: ${estadisticas.totalDiasClase}`, 20, 55);
    doc.text(`- Atrasos registrados: ${estadisticas.totalAtrasos}`, 20, 65);
    doc.text(`- Atrasos justificados: ${estadisticas.totalJustificados}`, 20, 75);
    doc.text(`- Porcentaje de atrasos: ${estadisticas.porcentajeAsistencia}%`, 20, 85);
    
    // Tabla de atrasos - FORMA CORRECTA para estas versiones
    autoTable(doc, {
      startY: 95,
      head: [['Fecha', 'Hora', 'Estado', 'Observaciones']],
      body: atrasos.map(atraso => [
        atraso.fecha,
        atraso.hora,
        atraso.estado || "Sin estado",
        atraso.mensaje || "Ninguna"
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [211, 47, 47] }
    });
    
    // Guardar PDF
    doc.save(`asistencia_${selectedStudent.rut}.pdf`);
  };

  return (
    <div className="modificar-container">
      <div className="modificar-box">
        <div className="modificar-header">
          <img src={logo} alt="Logo Colegio Manantiales" className="modificar-logo" />
          <h1 className="modificar-title">Historial de Asistencia</h1>
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

            {/* Estadísticas */}
            {estadisticas && (
              <div className="estadisticas-container">
                <h3>Estadísticas de Asistencia</h3>
                <p><strong>Días de clase totales:</strong> {estadisticas.totalDiasClase}</p>
                <p><strong>Atrasos registrados:</strong> {estadisticas.totalAtrasos}</p>
                <p><strong>Atrasos justificados:</strong> {estadisticas.totalJustificados}</p>
                <p><strong>Porcentaje de atrasos:</strong> {estadisticas.porcentajeAsistencia}%</p>
              </div>
            )}

            <h3>Registros de Atrasos</h3>
            {atrasos.length > 0 ? (
              <table className="atrasos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
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
                      <td>{atraso.mensaje || "Ninguna"}</td>
                      <td>
                        <button 
                          onClick={() => handleAgregarObservacion(atraso)}
                          className="observacion-button"
                        >
                          Agregar observación
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

        {/* Modal para agregar observaciones */}
        {modalOpen && (
          <div className="modal-backdrop">
            <div className="modal-simple">
              <h3>Agregar Observación</h3>
              <p><strong>Fecha:</strong> {selectedAtraso?.fecha}</p>
              <p><strong>Hora:</strong> {selectedAtraso?.hora}</p>
              
              <div className="modal-input-group">
                <label>Observación:</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ingrese la observación..."
                  rows={4}
                />
              </div>

              <div className="modal-button-group">
                <button onClick={handleSaveObservacion} className="modal-btn modal-btn-primary">
                  Guardar
                </button>
                <button onClick={handleCloseModal} className="modal-btn modal-btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modificar-buttons">
          <button 
            onClick={generarPDF} 
            className="pdf-button"
            disabled={!selectedStudent || atrasos.length === 0}
          >
            Exportar historial en PDF
          </button>
          <button className="back-button" onClick={() => navigate("/menu")}>
            Volver al Menú
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistorialAsistencia;