import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Menu from "./components/Menu";
import ProtectedRoute from "./components/ProtectedRoute"; // Importa la ruta protegida
import AsistenciaHoy from "./components/AsistenciaHoy"; // Importa la pantalla de asistencia
import GenerarQR from "./components/GenerarQR"; 
import HistorialAsistencia from "./components/HistorialAsistencia"; // Importamos la nueva screen
import MedidasDisciplinarias from "./components/MedidasDisciplinarias"; // Importamos la nueva screen
import ModificarAsistencia from "./components/ModificarAsistencia"; // Importamos la nueva screen
import Notificaciones from "./components/Notificaciones";
import GestionAlumnos from "./components/GestionAlumnos";
import AgregarAlumno from "./components/AgregarAlumno";
import ForgotPassword from "./components/ForgotPassword";
import RegistrarUsuario from "./components/RegistrarUsuario";
import RegistrarMedida from "./components/RegistrarMedida";
import GenerarAtrasos from "./components/GenerarAtrasos";
import HistorialAtrasos from "./components/HistorialAtrasos";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} /> 
      <Route path="/register" element={<Register />} />
      {/* Protege la ruta del menú */}
      <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
      <Route path="/asistencia-hoy" element={<AsistenciaHoy />} />
      <Route path="/generar-qr" element={<ProtectedRoute><GenerarQR /></ProtectedRoute>} /> 
      <Route path="/historial-asistencia" element={<HistorialAsistencia />} />
      <Route path="/medidas-disciplinarias" element={<MedidasDisciplinarias />} />
      <Route path="/modificar-asistencia" element={<ModificarAsistencia />} />
      <Route path="/notificaciones" element={<ProtectedRoute adminOnly={true}><Notificaciones /></ProtectedRoute>} />
      <Route path="/gestion-alumnos" element={<GestionAlumnos />} />
      <Route path="/agregar-alumno" element={<AgregarAlumno />} />
      <Route path="/registrar-usuario" element={<RegistrarUsuario />} />
      <Route path="/registrar-medida" element={<RegistrarMedida />} />
      <Route path="/generar-atraso" element={<GenerarAtrasos />} />
      <Route path="/historial-atrasos" element={<HistorialAtrasos />} />
    </Routes>
  </BrowserRouter>
);
