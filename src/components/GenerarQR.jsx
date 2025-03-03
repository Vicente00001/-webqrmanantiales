import { useNavigate } from "react-router-dom";
import "./GenerarQR.css"; // Importamos los estilos
import logo from "../assets/LOGOMANANTIALES.png";

const GenerarQR = () => {
  const navigate = useNavigate();

  const handleGenerarTodosQR = () => {
    alert("🔜 Función en desarrollo: Generar QR para todos los alumnos.");
  };

  const handleDescargarQR = () => {
    alert("🔜 Función en desarrollo: Descargar Códigos QR en PDF.");
  };

  const handleAsignarQR = () => {
    alert("🔜 Función en desarrollo: Asignar QR a un alumno manualmente.");
  };

  return (
    <div className="qr-container">
      {/* Encabezado con logo y título */}
      <div className="qr-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="qr-logo" />
        <h1 className="qr-title">Gestión de Códigos QR</h1>
      </div>

      {/* Botones alineados verticalmente */}
      <div className="qr-buttons">
        <button className="qr-button" onClick={handleGenerarTodosQR}>
          Generar QR para Todos los Alumnos
        </button>
        <button className="qr-button" onClick={handleDescargarQR}>
          Descargar Códigos QR
        </button>
        <button className="qr-button" onClick={handleAsignarQR}>
          Asignar QR a un Alumno Manualmente
        </button>
        <button className="back-button" onClick={() => navigate("/menu")}>
          Volver al Menú
        </button>
      </div>
    </div>
  );
};

export default GenerarQR;
