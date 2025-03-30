import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./Notificaciones.css";
import logo from "../assets/LOGOMANANTIALES.png";

const Notificaciones = () => {
  const navigate = useNavigate();
  const [notificacionesActivadas, setNotificacionesActivadas] = useState(false);
  const [medidaSeleccionada, setMedidaSeleccionada] = useState("3");
  const [frecuenciaAtrasos, setFrecuenciaAtrasos] = useState(3);
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [atrasosActuales, setAtrasosActuales] = useState(3); 

  // Opciones de medidas disciplinarias y sus atrasos predeterminados
  const medidasDisciplinarias = {
    "3": { nombre: "Amonestación verbal", atrasos: 3 },
    "5": { nombre: "Citación del apoderado", atrasos: 5 },
    "10": { nombre: "Medidas de apoyo pedagógico o psicosocial", atrasos: 10 },
    "15": { nombre: "Segunda citación del apoderado", atrasos: 15 },
    "20": { nombre: "Firma de compromiso y posible medida disciplinaria", atrasos: 20 },
  };

  // Obtener configuración desde Firestore
  useEffect(() => {
    const obtenerConfiguracion = async () => {
      const docRef = doc(db, "configuracion", "notificaciones");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setNotificacionesActivadas(docSnap.data().activadas);
        setFrecuenciaAtrasos(docSnap.data().frecuencia || 3);
        setMensajePersonalizado(docSnap.data().mensajes?.[medidaSeleccionada] || "");
        setAtrasosActuales(medidasDisciplinarias[medidaSeleccionada].atrasos);
      }
    };
    obtenerConfiguracion();
  }, [medidaSeleccionada]);

  // Guardar configuración en Firestore
  const guardarConfiguracion = async () => {
    try {
      const docRef = doc(db, "configuracion", "notificaciones");
      await setDoc(docRef, {
        activadas: notificacionesActivadas,
        frecuencia: frecuenciaAtrasos,
        mensajes: {
          [medidaSeleccionada]: mensajePersonalizado,
        },
      }, { merge: true });

      setAtrasosActuales(frecuenciaAtrasos); // Actualizar cantidad de atrasos actuales

      alert(`✅ Éxito: Se ajustó la medida "${medidasDisciplinarias[medidaSeleccionada].nombre}" a la frecuencia de atrasos ${frecuenciaAtrasos}`);
    } catch (error) {
      alert(`❌ Error al guardar los cambios: ${error.message}`);
    }
  };

  return (
    <div className="notificaciones-container">
      <div className="notificaciones-box">
        <div className="notificaciones-header">
          <img src={logo} alt="Logo Colegio Manantiales" className="notificaciones-logo" />
          <h1 className="notificaciones-title">Notificaciones Automáticas</h1>
        </div>

        {/* Switch para activar/desactivar notificaciones */}
        <div className="switch-container">
          <label className="switch-label">Activar Notificaciones:</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={notificacionesActivadas}
              onChange={() => setNotificacionesActivadas(!notificacionesActivadas)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        {/* Selección de Medida Disciplinaria */}
        <div className="medida-container">
          <label className="medida-label">Seleccionar Medida Disciplinaria:</label>
          <select
            value={medidaSeleccionada}
            onChange={(e) => {
              setMedidaSeleccionada(e.target.value);
              setAtrasosActuales(medidasDisciplinarias[e.target.value].atrasos);
            }}
            className="medida-select"
          >
            {Object.keys(medidasDisciplinarias).map((key) => (
              <option key={key} value={key}>{medidasDisciplinarias[key].nombre}</option>
            ))}
          </select>
        </div>

        {/* Cantidad de atrasos actual (No editable) */}
        <div className="frecuencia-container">
          <label className="frecuencia-label">Atrasos actuales para esta medida:</label>
          <input type="number" value={atrasosActuales} disabled className="frecuencia-input bloqueado" />
        </div>

        {/* Configuración de Frecuencia Editable */}
        <div className="frecuencia-container">
          <label className="frecuencia-label">Nueva cantidad de atrasos:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={frecuenciaAtrasos}
            onChange={(e) => setFrecuenciaAtrasos(parseInt(e.target.value, 10))}
            className="frecuencia-input"
          />
        </div>

        {/* Configuración de Mensaje */}
        <div className="mensaje-container">
          <label className="mensaje-label">Mensaje Personalizado (Máx. 400 caracteres):</label>
          <textarea
            value={mensajePersonalizado}
            onChange={(e) => setMensajePersonalizado(e.target.value)}
            maxLength="400"
            className="mensaje-textarea"
          />
        </div>

        {/* Botón para guardar cambios */}
        <button className="guardar-button" onClick={guardarConfiguracion}>
          Guardar Cambios
        </button>

        {/* Botón para volver al menú */}
        <button className="back-button" onClick={() => navigate("/menu")}>
          Volver al Menú
        </button>
      </div>
    </div>
  );
};

export default Notificaciones;
