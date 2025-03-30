import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, addDoc, doc, getDoc } from "firebase/firestore";
import "./MedidasDisciplinarias.css";
import logo from "../assets/LOGOMANANTIALES.png";

const MedidasDisciplinarias = () => {
  const navigate = useNavigate();
  const [alumnosConAtrasos, setAlumnosConAtrasos] = useState([]);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historialMedidas, setHistorialMedidas] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detallesAtrasos, setDetallesAtrasos] = useState([]);
  const userRole = localStorage.getItem("userRole");

  // Función para manejar fechas (ya sea Timestamp o string)
  const formatFecha = (fecha) => {
    if (!fecha) return "Sin fecha";
    try {
      // Si es un objeto Timestamp de Firestore
      if (typeof fecha.toDate === 'function') {
        return fecha.toDate().toLocaleDateString();
      }
      // Si ya es una cadena de fecha
      if (typeof fecha === 'string') {
        return new Date(fecha).toLocaleDateString() || fecha;
      }
      return "Fecha no válida";
    } catch (error) {
      console.error("Error al formatear fecha:", error);
      return "Fecha no válida";
    }
  };


  // Obtener alumnos con atrasos
  useEffect(() => {
    const fetchAlumnosConAtrasos = async () => {
      try {
        const asistenciasRef = collection(db, "asistencias");
        const q = query(asistenciasRef, where("estado", "==", "Atrasado"));
        const snapshot = await getDocs(q);

        const alumnos = {};

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const rut = data.estudiante_id;

          try {
            const estudianteRef = doc(db, "estudiantes", rut);
            const estudianteDoc = await getDoc(estudianteRef);

            if (estudianteDoc.exists()) {
              const estudianteData = estudianteDoc.data();

              if (alumnos[rut]) {
                alumnos[rut].atrasos += 1;
                alumnos[rut].detalles.push({
                  fecha: formatFecha(data.fecha),
                  hora: data.hora || "Sin hora registrada",
                  inspector_id: data.inspector_id
                });
              } else {
                alumnos[rut] = {
                  nombre: estudianteData.nombre?.toUpperCase() || "Sin nombre",
                  apellidoPaterno: estudianteData.apellido_paterno?.toUpperCase() || "Sin apellido paterno",
                  apellidoMaterno: estudianteData.apellido_materno?.toUpperCase() || "Sin apellido materno",
                  curso: estudianteData.curso?.toUpperCase() || "Sin curso",
                  atrasos: 1,
                  correo: estudianteData.email || "Sin correo",
                  telefono1: estudianteData.telefono1 || "Sin teléfono 1",
                  telefono2: estudianteData.telefono2 || "Sin teléfono 2",
                  detalles: [{
                    fecha: formatFecha(data.fecha),
                    hora: data.hora || "Sin hora registrada",
                    inspector_id: data.inspector_id
                  }]
                };
              }
            } else {
              console.warn(`No se encontró el estudiante con RUT ${rut}`);
            }
          } catch (error) {
            console.error(`Error al obtener datos del estudiante ${rut}:`, error);
          }
        }

        const alumnosArray = Object.keys(alumnos).map((rut) => ({
          rut,
          ...alumnos[rut],
        }));

        alumnosArray.sort((a, b) => b.atrasos - a.atrasos);
        setAlumnosConAtrasos(alumnosArray);
      } catch (error) {
        console.error("Error al obtener asistencias atrasadas:", error);
      }
    };

    fetchAlumnosConAtrasos();
  }, []);


 
  // Obtener historial de medidas disciplinarias (solo las atendidas)
useEffect(() => {
  const fetchHistorialMedidas = async () => {
    try {
      const medidasRef = collection(db, "medidas_disciplinarias");
      // Filtramos solo las medidas con estado "Atendida"
      const q = query(medidasRef, where("estado", "==", "Atendida"));
      const snapshot = await getDocs(q);
      
      // Obtenemos los datos de cada medida y también el nombre del inspector
      const medidas = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const medidaData = docSnap.data();
          
          // Obtenemos el nombre del inspector que atendió la medida
          let nombreInspector = medidaData.nombreAtendidoPor || "Sin nombre";
          
          // Si tenemos el UID del inspector, buscamos sus datos completos
          if (medidaData.atendidoPor) {
            try {
              const inspectorRef = doc(db, "usuarios", medidaData.atendidoPor);
              const inspectorSnap = await getDoc(inspectorRef);
              
              if (inspectorSnap.exists()) {
                const inspectorData = inspectorSnap.data();
                nombreInspector = `${inspectorData.nombre || ""} ${inspectorData.apellido || ""}`.trim() || nombreInspector;
              }
            } catch (error) {
              console.error("Error al obtener datos del inspector:", error);
            }
          }
          
          // Formateamos el nombre del alumno (nombre + apellido paterno)
          const nombreCompleto = medidaData.nombre_estudiante || "";
          const partesNombre = nombreCompleto.split(" ");
          const nombreAlumno = partesNombre.length > 0 ? partesNombre[0] : "";
          const apellidoPaterno = partesNombre.length > 1 ? partesNombre[1] : "";
          const nombreMostrar = `${nombreAlumno} ${apellidoPaterno}`.trim();
          
          return {
            id: docSnap.id,
            ...medidaData,
            nombreMostrar,
            nombreInspector,
            // Aseguramos que tenemos una fecha válida
            fecha: medidaData.fechaActualizacion || medidaData.fecha || new Date()
          };
        })
      );

      // Ordenamos por fecha (más reciente primero)
      medidas.sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB - fechaA;
      });
      
      setHistorialMedidas(medidas);
    } catch (error) {
      console.error("Error al obtener historial de medidas:", error);
    }
  };

  fetchHistorialMedidas();
}, []);

  const getTipoMedida = (atrasos) => {
    if (atrasos >= 20) return "Firma de compromiso y posible medida";
    if (atrasos >= 15) return "Segunda citación del apoderado";
    if (atrasos >= 10) return "Medidas de apoyo pedagógico o psicosocial";
    if (atrasos >= 5) return "Citación del apoderado";
    if (atrasos >= 3) return "Amonestación verbal";
    return "Sin medida";
  };

  const handleRegistrarMedida = (alumno) => {
    navigate("/registrar-medida", { state: { alumno } });
  };

  const handleGenerarCitaciones = (alumno) => {
    alert(`📩 Datos de contacto de ${alumno.nombre} ${alumno.apellidoPaterno}:
      Correo: ${alumno.correo}
      Teléfono 1: ${alumno.telefono1}
      Teléfono 2: ${alumno.telefono2}`);
  };

  const handleVerDetalles = async (alumno) => {
    // Primero obtenemos todos los atrasos del alumno con los datos del inspector
    const detallesCompletos = await Promise.all(
      alumno.detalles.map(async (detalle) => {
        // Si no hay inspector_id, retornamos los datos básicos
        if (!detalle.inspector_id) {
          return {
            ...detalle,
            responsable: "Sin inspector registrado"
          };
        }
  
        try {
          // Buscamos el inspector en la colección "usuarios"
          const inspectorRef = doc(db, "usuarios", detalle.inspector_id);
          const inspectorSnap = await getDoc(inspectorRef);
  
          if (inspectorSnap.exists()) {
            const inspectorData = inspectorSnap.data();
            return {
              ...detalle,
              responsable: `${inspectorData.nombre || "Sin nombre"} ${inspectorData.apellido || "Sin apellido"}`.trim()
            };
          } else {
            return {
              ...detalle,
              responsable: "Inspector no encontrado"
            };
          }
        } catch (error) {
          console.error("Error al obtener inspector:", error);
          return {
            ...detalle,
            responsable: "Error al cargar inspector"
          };
        }
      })
    );
  
    setDetallesAtrasos(detallesCompletos);
    setModalOpen(true);
  };
  

  const filteredAlumnos = alumnosConAtrasos.filter(alumno => {
    const searchLower = searchTerm.toLowerCase();
    return (
      alumno.nombre.toLowerCase().includes(searchLower) ||
      alumno.apellidoPaterno.toLowerCase().includes(searchLower) ||
      alumno.apellidoMaterno.toLowerCase().includes(searchLower) ||
      alumno.curso.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="medidas-container">
      <div className="medidas-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="medidas-logo" />
        <h1 className="medidas-title">Gestión de Medidas Disciplinarias</h1>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o curso..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="alumnos-list">
        <h2>ALUMNOS CON ATRASOS AÑO 2025</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>RUT</th>
                <th>Nombre</th>
                <th>Apellidos</th>
                <th>Curso</th>
                <th>Atrasos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlumnos.map((alumno) => (
                <tr key={alumno.rut} onClick={() => setSelectedAlumno(alumno)}>
                  <td>{alumno.rut}</td>
                  <td>{alumno.nombre}</td>
                  <td>{alumno.apellidoPaterno} {alumno.apellidoMaterno}</td>
                  <td>{alumno.curso}</td>
                  <td>{alumno.atrasos}</td>
                  <td className="actions-cell">
                    <button
                      className="medidas-button contact-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerarCitaciones(alumno);
                      }}
                    >
                      Contacto
                    </button>
                    <button
                      className="medidas-button details-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerDetalles(alumno);
                      }}
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>

      <button
          className="medidas-button register-button"
          onClick={() => handleRegistrarMedida(selectedAlumno)}
        >
          Registrar Medida
        </button>

      <button
        className="medidas-button historial-button"
        onClick={() => setShowHistorial(!showHistorial)}
      >
        {showHistorial ? "Ocultar Historial" : "Ver Historial de Medidas"}
      </button>

      {showHistorial && (
  <div className="historial-list">
    <h2>Historial de Medidas Disciplinarias Atendidas</h2>
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Alumno</th>
            <th>Atrasos</th>
            <th>Medida</th>
            <th>Atendido por</th>
            <th>Mensaje</th>
          </tr>
        </thead>
        <tbody>
          {historialMedidas.map((medida) => (
            <tr key={medida.id}>
              <td>{formatFecha(medida.fecha)}</td>
              <td>{medida.nombreMostrar}</td>
              <td>{medida.atrasos_reales || medida.cantidad_atrasos || "N/A"}</td>
              <td>{medida.tipo_medida}</td>
              <td>{medida.nombreInspector}</td>
              <td>{medida.mensaje || "Sin mensaje"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{modalOpen && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>Detalles de Atrasos</h3>
      <div className="detalles-container">
        {detallesAtrasos.map((detalle, index) => (
          <div key={index} className="detalle-item">
            <p><strong>Fecha:</strong> {detalle.fecha}</p>
            <p><strong>Hora:</strong> {detalle.hora}</p>
            <p><strong>Registrado por:</strong> {detalle.responsable}</p>
            {index < detallesAtrasos.length - 1 && <hr />}
          </div>
        ))}
      </div>
      <button 
        className="medidas-button close-button"
        onClick={() => setModalOpen(false)}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

      <button className="back-button" onClick={() => navigate("/menu")}>
        Volver al Menú
      </button>
    </div>
  );
};

export default MedidasDisciplinarias;