import { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Reutiliza los estilos del login
import logo from "../assets/logo colegio manantiales.jpg";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      // Verificar si el correo existe en la colección "usuarios" (opcional)
      // Aquí puedes agregar la lógica para verificar en Firestore si lo necesitas.

      // Enviar correo de restablecimiento de contraseña
      await sendPasswordResetEmail(auth, email);
      setMessage("Se ha enviado un correo para restablecer tu contraseña.");
    } catch (error) {
      setError("Error: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo Colegio Manantiales" className="login-logo" />
        <h1 className="login-title">Restablecer Contraseña</h1>
        <h2 className="login-subtitle">Ingresa tu correo electrónico</h2>
        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-success">{message}</p>}
        <form onSubmit={handleResetPassword}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <button type="submit" className="login-button">Restablecer Contraseña</button>
        </form>
        {/* Enlace para volver al login */}
        <button onClick={() => navigate("/login")} className="forgot-password-link">
          Volver al Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;