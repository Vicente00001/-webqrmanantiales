import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Reutiliza los estilos del login
import logo from "../assets/logo colegio manantiales.jpg";

const RegistrarUsuario = () => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("inspector"); // Rol por defecto: inspector
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegistrarUsuario = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validar campos obligatorios
    if (!nombre || !apellido || !correo || !password || !confirmPassword || !rol) {
      setError("Por favor, complete todos los campos.");
      return;
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Confirmar si se está creando un administrador
    if (rol === "admin") {
      const confirmar = window.confirm(
        "¿Está seguro de crear otro usuario de administrador?"
      );
      if (!confirmar) return; // Si el usuario cancela, no se procede
    }

    try {
      // Verificar si el correo ya existe en la colección "usuarios"
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("correo", "==", correo));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("El correo ya está registrado.");
        return;
      }

      // Crear usuario en Firebase Auth pero sin iniciar sesión automáticamente
      await createUserWithEmailAndPassword(auth, correo, password);

      // Guardar información adicional en Firestore (nombre y apellido en MAYÚSCULAS)
      const user = auth.currentUser; // Obtiene al usuario creado desde la autenticación
      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: nombre.toUpperCase(), // Convertir a mayúsculas
        apellido: apellido.toUpperCase(), // Convertir a mayúsculas
        correo,
        rol,
      });

      setMessage("Usuario creado satisfactoriamente.");
      setTimeout(() => navigate("/menu"), 2000); // Redirigir al menú después de 2 segundos
    } catch (error) {
      setError("Error al registrar el usuario: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo Colegio Manantiales" className="login-logo" />
        <h1 className="login-title">Registrar Nuevo Usuario</h1>
        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}
        <form onSubmit={handleRegistrarUsuario}>
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="text"
            placeholder="Apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            className="login-input"
          />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="login-input"
            required
          >
            <option value="inspector">Inspector</option>
            <option value="admin">Administrador</option>
          </select>
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
            <button
              type="button"
              className="show-password-button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirmar Contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="login-input"
            />
            <button
              type="button"
              className="show-password-button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <button type="submit" className="login-button">Registrar Usuario</button>
        </form>
        {/* Enlace para volver al menú */}
        <button onClick={() => navigate("/menu")} className="login-button">
          Volver al Menú
        </button>
      </div>
    </div>
  );
};

export default RegistrarUsuario;
