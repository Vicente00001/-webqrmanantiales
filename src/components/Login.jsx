import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo colegio manantiales.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Limpiar error previo

    try {
      // Iniciar sesión con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Obtener el rol del usuario desde Firestore
      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        const userRole = userData.rol; // "admin" o "inspector"

        // Guardar el rol en el estado o en localStorage (opcional)
        localStorage.setItem("userRole", userRole);

        // Redirigir al menú
        navigate("/menu");
      } else {
        setError("No se encontró información del usuario en Firestore.");
      }
    } catch (error) {
      // Mensaje de error personalizado para credenciales inválidas
      if (error.code === "auth/invalid-credential") {
        setError("Credenciales inválidas, intente nuevamente.");
      } else {
        setError("Error al iniciar sesión: " + error.message);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo Colegio Manantiales" className="login-logo" />
        <h1 className="login-title">Bienvenido al Sistema de Asistencia</h1>
        <h2 className="login-subtitle">Colegio Manantiales del Elqui</h2>
        {error && <p className="login-error">{error}</p>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"} // Cambia el tipo de input
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
          <button type="submit" className="login-button">Ingresar</button>
        </form>
        {/* Enlace para "Olvidé mi contraseña" */}
        <Link to="/forgot-password" className="forgot-password-link">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
};

export default Login;