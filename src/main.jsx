import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Menu from "./components/Menu";
import ProtectedRoute from "./components/ProtectedRoute"; // Importa la ruta protegida
import AsistenciaHoy from "./components/AsistenciaHoy"; // Importa la pantalla de asistencia
import GenerarQR from "./components/GenerarQR"; 


ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Protege la ruta del menú */}
      <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
      <Route path="/asistencia-hoy" element={<AsistenciaHoy />} />
      <Route path="/generar-qr" element={<ProtectedRoute><GenerarQR /></ProtectedRoute>} /> 
    </Routes>
  </BrowserRouter>
);
