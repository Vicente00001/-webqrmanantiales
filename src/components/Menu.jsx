import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import "./Menu.css";
import logo from "../assets/LOGOMANANTIALES.png";

const Menu = () => {
  const navigate = useNavigate();
  const [rol, setRol] = useState(null);

  useEffect(() => {
    const obtenerRolUsuario = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRol(docSnap.data().rol);
        }
      }
    };

    obtenerRolUsuario();
  }, []);

  const handleLogout = async () => {
    auth.signOut();
    navigate("/login");
  };

  return (
    <div className="menu-container">
      {/* Barra superior con logo y botón de cerrar sesión */}
      <div className="menu-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="menu-logo" />
        <button className="logout-button" onClick={handleLogout}>Cerrar Sesión</button>
      </div>

      {/* Contenido central con los botones */}
      <div className="menu-content">
        <h1 className="menu-title">Menú Principal</h1>
        <button className="menu-button" onClick={() => navigate("/asistencia-hoy")}>Ver Asistencia</button>

        {/* 🔹 Solo administradores pueden ver estos botones */}
        {rol === "admin" && (
          <>
            <button className="menu-button">Registrar Inspector</button>
            <button className="menu-button">Modificar Asistencia</button>
            <button className="menu-button" onClick={() => navigate("/generar-qr")}>Gestión de Códigos QR</button>
            <button className="menu-button">Notificaciones Automáticas</button>
          </>
        )}

        <button className="menu-button">Consultar Historial de Asistencia</button>
        <button className="menu-button">Exportar Historial en PDF</button>
        <button className="menu-button">Gestión de Medidas Disciplinarias</button>
      </div>
    </div>
  );
};

export default Menu;
