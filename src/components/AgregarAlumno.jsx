import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import "./GestionAlumnos.css";
import logo from "../assets/LOGOMANANTIALES.png";

const AgregarAlumno = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    rut: "",
    curso: "",
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    fecha_nacimiento: "",
    genero: "",
    email: "",
    apoderado: {
      nombre: "",
      email: "",
    },
    telefono1: "",
    telefono2: "",
    matriculado: false,
  });

  const [cursos, setCursos] = useState([]);

  const obtenerCursos = async () => {
    const snapshot = await getDocs(collection(db, "estudiantes"));
    const estudiantesData = snapshot.docs.map((doc) => doc.data().curso);
    const cursosUnicos = [...new Set(estudiantesData.filter(Boolean))];
    setCursos(cursosUnicos);
  };

  useEffect(() => {
    obtenerCursos();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes("apoderado.")) {
      const apoderadoField = name.split(".")[1];
      setFormData({
        ...formData,
        apoderado: {
          ...formData.apoderado,
          [apoderadoField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const verificarRUTExistente = async (rut) => {
    const estudianteRef = doc(db, "estudiantes", rut);
    const estudianteDoc = await getDoc(estudianteRef);
    return estudianteDoc.exists();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rut || !formData.nombre || !formData.apellido_paterno || 
        !formData.apellido_materno || !formData.apoderado.nombre || !formData.apoderado.email) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    if (!formData.rut.includes("-")) {
      alert("El RUT debe incluir un guión (-) antes del dígito verificador.");
      return;
    }

    const rutExistente = await verificarRUTExistente(formData.rut);
    if (rutExistente) {
      alert("❌ El RUT ya está registrado. No se puede crear otro alumno con el mismo RUT, por favor, vuelva a la pestaña anterior y elimine o edite el registro si lo desea");
      return;
    }

    try {
      const estudianteRef = doc(db, "estudiantes", formData.rut);
      await setDoc(estudianteRef, {
        ...formData,
        fecha_nacimiento: `${formData.fecha_nacimiento} 00:00:00`,
        matriculado: Boolean(formData.matriculado),
      });

      alert("✅ Alumno agregado correctamente.");
      navigate("/gestion-alumnos");
    } catch (error) {
      console.error("Error agregando alumno:", error);
      alert("❌ Error al agregar el alumno.");
    }
  };

  return (
    <div className="gestion-container">
      <div className="gestion-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="gestion-logo" />
        <h1 className="gestion-title">Agregar Nuevo Alumno</h1>
      </div>

      <div className="modal-overlay">
        <div className="modal-content-wrapper">
          <div className="modal modal-fullscreen">
            <h2>Datos del Alumno</h2>
            
            <form onSubmit={handleSubmit} className="form-scrollable">
              <div className="form-group">
                <label>RUT:</label>
                <input
                  type="text"
                  name="rut"
                  value={formData.rut}
                  onChange={handleChange}
                  placeholder="Ej: 12345678-9"
                  required
                />
              </div>

              <div className="form-group">
                <label>Curso:</label>
                <select name="curso" value={formData.curso} onChange={handleChange} required>
                  <option value="">Seleccione un curso</option>
                  {cursos.map((curso) => (
                    <option key={curso} value={curso}>
                      {curso}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Nombre del alumno"
                  required
                />
              </div>

              <div className="form-group">
                <label>Apellido Paterno:</label>
                <input
                  type="text"
                  name="apellido_paterno"
                  value={formData.apellido_paterno}
                  onChange={handleChange}
                  placeholder="Apellido paterno"
                  required
                />
              </div>

              <div className="form-group">
                <label>Apellido Materno:</label>
                <input
                  type="text"
                  name="apellido_materno"
                  value={formData.apellido_materno}
                  onChange={handleChange}
                  placeholder="Apellido materno"
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha de Nacimiento:</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Género:</label>
                <select name="genero" value={formData.genero} onChange={handleChange} required>
                  <option value="">Seleccione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>

              <div className="form-group">
                <label>Correo Alumno:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Correo del alumno"
                />
              </div>

              <div className="form-group">
                <label>Nombre Apoderado:</label>
                <input
                  type="text"
                  name="apoderado.nombre"
                  value={formData.apoderado.nombre}
                  onChange={handleChange}
                  placeholder="Nombre completo del apoderado"
                  required
                />
              </div>

              <div className="form-group">
                <label>Correo Apoderado:</label>
                <input
                  type="email"
                  name="apoderado.email"
                  value={formData.apoderado.email}
                  onChange={handleChange}
                  placeholder="Correo del apoderado"
                  required
                />
              </div>

              <div className="form-group">
                <label>Teléfono 1:</label>
                <input
                  type="text"
                  name="telefono1"
                  value={formData.telefono1}
                  onChange={handleChange}
                  placeholder="Teléfono 1"
                />
              </div>

              <div className="form-group">
                <label>Teléfono 2:</label>
                <input
                  type="text"
                  name="telefono2"
                  value={formData.telefono2}
                  onChange={handleChange}
                  placeholder="Teléfono 2"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="matriculado"
                    checked={formData.matriculado}
                    onChange={handleChange}
                  />
                  Matriculado
                </label>
              </div>

              <div className="form-buttons">
                <button type="submit" className="add-button">
                  Guardar Alumno
                </button>
                <button
                  type="button"
                  className="back-button"
                  onClick={() => navigate("/gestion-alumnos")}
                >
                  Volver
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgregarAlumno;