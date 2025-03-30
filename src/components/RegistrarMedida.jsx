import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDoc,
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import "./MedidasDisciplinarias.css";
import logo from "../assets/LOGOMANANTIALES.png";

const RegistrarMedida = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { alumno } = location.state || {};
  const [medidasSinAtender, setMedidasSinAtender] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedMedida, setSelectedMedida] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [fechaAtencion, setFechaAtencion] = useState("");
  const user = auth.currentUser;
  const userRole = localStorage.getItem("userRole");

  // Obtener medidas sin atender
  useEffect(() => {
    const fetchMedidasSinAtender = async () => {
      const medidasRef = collection(db, "medidas_disciplinarias");
      const q = query(medidasRef, where("estado", "==", "Sin atender"));
      const snapshot = await getDocs(q);
      const medidas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMedidasSinAtender(medidas);
    };

    fetchMedidasSinAtender();
  }, []);

  const handleAtenderMedida = (medida) => {
    setSelectedMedida(medida);
    setShowModal(true);
  };
  
  const handleEliminarMedida = async (medidaId) => {
    if (window.confirm("¿Estás seguro de eliminar esta medida?")) {
      try {
        await deleteDoc(doc(db, "medidas_disciplinarias", medidaId));
        setMedidasSinAtender(medidasSinAtender.filter(m => m.id !== medidaId));
      } catch (error) {
        console.error("Error al eliminar la medida: ", error);
      }
    }
  };
  
  const handleGuardarMedida = async () => {
    if (!selectedMedida || !fechaAtencion) {
      alert("Por favor complete la fecha de atención");
      return;
    }
  
    try {
      const medidaRef = doc(db, "medidas_disciplinarias", selectedMedida.id);
      await updateDoc(medidaRef, {
        estado: "Atendida",
        mensaje: mensaje || "Sin mensaje adicional",
        fechaAtencion: fechaAtencion,
        atendidoPor: user.uid,
        nombreAtendidoPor: user.displayName || user.email,
        fechaActualizacion: serverTimestamp()
      });
  
      setMedidasSinAtender(medidasSinAtender.filter(m => m.id !== selectedMedida.id));
      setShowModal(false);
      setMensaje("");
      setFechaAtencion("");
    } catch (error) {
      console.error("Error al actualizar la medida: ", error);
    }
  };

  // Función mejorada para contar atrasos
  const contarAtrasosEstudiante = async (estudianteId) => {
    const asistenciasRef = collection(db, "asistencias");
    const q = query(
      asistenciasRef, 
      where("estudiante_id", "==", estudianteId),
      where("estado", "==", "Atrasado") // Ahora filtra por "Atrasado"
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  };

  // Verificar si ya existe medida para estos atrasos (incluyendo atendidas)
  const existeMedidaParaAtrasos = async (estudianteId, atrasos) => {
    const medidasRef = collection(db, "medidas_disciplinarias");
    const q = query(
      medidasRef,
      where("estudiante_id", "==", estudianteId),
      where("cantidad_atrasos", "==", atrasos)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty; // Retorna true si existe alguna medida (atendida o no)
  };

  // Determinar el tipo de medida según atrasos
  const getTipoMedida = (atrasos) => {
    if (atrasos >= 20) return "Firma de compromiso y posible medida disciplinaria";
    if (atrasos >= 15) return "Segunda citación del apoderado";
    if (atrasos >= 10) return "Medidas de apoyo pedagógico o psicosocial";
    if (atrasos >= 5) return "Citación del apoderado";
    if (atrasos >= 3) return "Amonestación verbal";
    return null;
  };

  // Generar medida solo si corresponde y no existe previamente
  const generarMedidaDisciplinaria = async (estudianteId) => {
    const atrasos = await contarAtrasosEstudiante(estudianteId);
    const tipoMedida = getTipoMedida(atrasos);
    
    if (!tipoMedida) return;

    const yaExisteMedida = await existeMedidaParaAtrasos(estudianteId, atrasos);
    if (yaExisteMedida) return;

    const estudianteData = await obtenerDatosEstudiante(estudianteId);
    if (!estudianteData) return;

    const medidaData = {
      estudiante_id: estudianteId,
      nombre_estudiante: `${estudianteData.nombre} ${estudianteData.apellidoPaterno} ${estudianteData.apellidoMaterno}`,
      cantidad_atrasos: atrasos,
      tipo_medida: tipoMedida,
      fecha: serverTimestamp(),
      estado: "Sin atender",
      rut: estudianteData.rut
    };

    try {
      await addDoc(collection(db, "medidas_disciplinarias"), medidaData);
      // Actualizar lista
      const q = query(collection(db, "medidas_disciplinarias"), where("estado", "==", "Sin atender"));
      const snapshot = await getDocs(q);
      const medidas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedidasSinAtender(medidas);
    } catch (error) {
      console.error("Error al generar medida disciplinaria:", error);
    }
  };

  // Obtener datos del estudiante
  const obtenerDatosEstudiante = async (estudianteId) => {
    const estudianteRef = doc(db, "estudiantes", estudianteId);
    const estudianteDoc = await getDoc(estudianteRef);
    return estudianteDoc.exists() ? estudianteDoc.data() : null;
  };

  // Verificar al cargar el componente
  useEffect(() => {
    if (alumno?.rut) {
      generarMedidaDisciplinaria(alumno.rut);
    }
  }, [alumno]);

  return (
    <div className="medidas-container">
      <div className="medidas-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="medidas-logo" />
        <h1 className="medidas-title">Registrar Medida Disciplinaria</h1>
      </div>

      <div className="table-container">
        <h2>Medidas Sin Atender</h2>
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Atrasos</th>
              <th>Tipo de Medida</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {medidasSinAtender.map((medida) => (
              <tr key={medida.id}>
                <td>{medida.nombre_estudiante}</td>
                <td>{medida.cantidad_atrasos}</td>
                <td>{medida.tipo_medida}</td>
                <td>
                  {medida.fecha?.toDate 
                    ? medida.fecha.toDate().toLocaleString() 
                    : "Reciente"}
                </td>
                <td>
                  <button
                    className="medidas-button completed-button"
                    onClick={() => handleAtenderMedida(medida)}
                  >
                    Atender medida
                  </button>
                  {userRole === 'admin' && (
                    <button
                      className="medidas-button delete-button"
                      onClick={() => handleEliminarMedida(medida.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Atender Medida</h2>
            <div className="form-group">
              <label>Estudiante:</label>
              <p>{selectedMedida?.nombre_estudiante}</p>
            </div>
            <div className="form-group">
              <label>Tipo de Medida:</label>
              <p>{selectedMedida?.tipo_medida}</p>
            </div>
            <div className="form-group">
              <label>Mensaje (opcional):</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Ingrese un mensaje adicional..."
              />
            </div>
            <div className="form-group">
              <label>Fecha y Hora de Atención:</label>
              <input
                type="datetime-local"
                value={fechaAtencion}
                onChange={(e) => setFechaAtencion(e.target.value)}
                required
              />
            </div>
            <div className="modal-buttons">
              <button className="medidas-button" onClick={handleGuardarMedida}>
                Guardar
              </button>
              <button className="back-button" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        className="medidas-button"
        onClick={() => alumno?.rut && generarMedidaDisciplinaria(alumno.rut)}
      >
        Verificar Atrasos Ahora
      </button>

      <button className="back-button" onClick={() => navigate("/medidas-disciplinarias")}>
        Volver
      </button>
    </div>
  );
};

export default RegistrarMedida;