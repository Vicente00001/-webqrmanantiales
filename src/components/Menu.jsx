import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import * as XLSX from "xlsx";
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

  const handleGenerarExcel = async () => {
    const confirmar = window.confirm("¿Está seguro que desea exportar el historial de atrasos a Excel?");
    if (!confirmar) return;
  
    try {
      alert("Generando archivo Excel... Esto puede tomar unos momentos.");
  
      // Obtener todos los estudiantes
      const estudiantesSnapshot = await getDocs(collection(db, "estudiantes"));
      const estudiantes = {};
      const cursos = new Set();
  
      estudiantesSnapshot.forEach(doc => {
        const data = doc.data();
        estudiantes[doc.id] = data;
        cursos.add(data.curso);
      });
  
      // Obtener todas las asistencias con estado "Atrasado" o "Justificado"
      const asistenciasSnapshot = await getDocs(query(
        collection(db, "asistencias"),
        where("estado", "in", ["Atrasado", "Justificado"])
      ));
  
      // Contar atrasos por estudiante
      const atrasosPorEstudiante = {};
      
      asistenciasSnapshot.forEach(doc => {
        const asistencia = doc.data();
        const estudianteId = asistencia.estudiante_id;
        
        if (!atrasosPorEstudiante[estudianteId]) {
          atrasosPorEstudiante[estudianteId] = {
            totalAtrasos: 0,
            totalJustificados: 0,
            detalles: []
          };
        }
        
        if (asistencia.estado === "Atrasado") {
          atrasosPorEstudiante[estudianteId].totalAtrasos++;
        } else if (asistencia.estado === "Justificado") {
          atrasosPorEstudiante[estudianteId].totalJustificados++;
        }
        
        atrasosPorEstudiante[estudianteId].detalles.push(asistencia);
      });
  
      // Crear un libro de Excel
      const workbook = XLSX.utils.book_new();
  
      // Función para crear una hoja con estilos
      const crearHojaConEstilos = (datos, nombreHoja) => {
        // Convertir datos a hoja de cálculo
        const worksheet = XLSX.utils.json_to_sheet(datos);
        
        // Añadir estilos directamente a las celdas
        datos.forEach((estudiante, index) => {
          const row = index + 2; // +2 porque la fila 1 es el encabezado
          
          // Estilo para atrasos (rojo)
          if (estudiante["Total Atrasos"] > 0) {
            const cellAtrasos = XLSX.utils.encode_cell({c: 4, r: row-1}); // Columna D (4)
            worksheet[cellAtrasos].s = {
              fill: {fgColor: {rgb: "FFCCCC"}},
              font: {bold: true, color: {rgb: "FF0000"}}
            };
          }
          
          // Estilo para justificados (verde)
          if (estudiante["Total Justificados"] > 0) {
            const cellJustificados = XLSX.utils.encode_cell({c: 5, r: row-1}); // Columna E (5)
            worksheet[cellJustificados].s = {
              fill: {fgColor: {rgb: "CCFFCC"}},
              font: {bold: true, color: {rgb: "008000"}}
            };
          }
        });
        
        // Ajustar el ancho de las columnas
        worksheet["!cols"] = [
          { width: 15 }, // RUT
          { width: 20 }, // Nombre
          { width: 20 }, // Apellido
          { width: 10 }, // Curso
          { width: 15 }, // Total Atrasos
          { width: 15 }, // Total Justificados
          { width: 15 }  // Total General
        ];
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);
      };
  
      // Para cada curso, crear una hoja
      Array.from(cursos).forEach(curso => {
        // Filtrar estudiantes por curso
        const estudiantesDelCurso = Object.entries(estudiantes)
          .filter(([id, estudiante]) => estudiante.curso === curso)
          .map(([id, estudiante]) => {
            const atrasos = atrasosPorEstudiante[id] || {
              totalAtrasos: 0,
              totalJustificados: 0,
              detalles: []
            };
            
            return {
              "RUT": id,
              "Nombre": estudiante.nombre,
              "Apellido": estudiante.apellido,
              "Curso": estudiante.curso,
              "Total Atrasos": atrasos.totalAtrasos,
              "Total Justificados": atrasos.totalJustificados,
              "Total General": atrasos.totalAtrasos + atrasos.totalJustificados
            };
          });
  
        // Crear hoja para el curso con estilos
        crearHojaConEstilos(estudiantesDelCurso, `Curso ${curso}`);
      });
  
      // Crear hoja de resumen general
      const resumenGeneral = Object.entries(estudiantes).map(([id, estudiante]) => {
        const atrasos = atrasosPorEstudiante[id] || {
          totalAtrasos: 0,
          totalJustificados: 0,
          detalles: []
        };
        
        return {
          "RUT": id,
          "Nombre": estudiante.nombre,
          "Apellido": estudiante.apellido,
          "Curso": estudiante.curso,
          "Total Atrasos": atrasos.totalAtrasos,
          "Total Justificados": atrasos.totalJustificados,
          "Total General": atrasos.totalAtrasos + atrasos.totalJustificados
        };
      });
  
      // Crear hoja de resumen con estilos
      crearHojaConEstilos(resumenGeneral, "Resumen General");
  
      // Crear hoja de estudiantes con incidencias (1 o más atrasos o justificados)
      const estudiantesConIncidencias = Object.entries(estudiantes)
        .filter(([id]) => {
          const atrasos = atrasosPorEstudiante[id] || {
            totalAtrasos: 0,
            totalJustificados: 0
          };
          return atrasos.totalAtrasos > 0 || atrasos.totalJustificados > 0;
        })
        .map(([id, estudiante]) => {
          const atrasos = atrasosPorEstudiante[id] || {
            totalAtrasos: 0,
            totalJustificados: 0,
            detalles: []
          };
          
          // Determinar el tipo de incidencia
          let tipo = "";
          if (atrasos.totalAtrasos > 0 && atrasos.totalJustificados > 0) {
            tipo = "Atrasos y Justificados";
          } else if (atrasos.totalAtrasos > 0) {
            tipo = "Atrasos";
          } else {
            tipo = "Justificados";
          }
          
          return {
            "RUT": id,
            "Nombre": estudiante.nombre,
            "Apellido": estudiante.apellido,
            "Curso": estudiante.curso,
            "Total Atrasos": atrasos.totalAtrasos,
            "Total Justificados": atrasos.totalJustificados,
            "Total General": atrasos.totalAtrasos + atrasos.totalJustificados,
            "Tipo": tipo,
            "Detalle Atrasos": atrasos.detalles
              .filter(d => d.estado === "Atrasado")
              .map(d => `${d.fecha} ${d.hora}`).join("\n"),
            "Detalle Justificados": atrasos.detalles
              .filter(d => d.estado === "Justificado")
              .map(d => `${d.fecha} ${d.hora} (${d.justificacion || 'sin justificación'})`).join("\n")
          };
        });
  
      // Ordenar estudiantes por mayor cantidad de incidencias
      estudiantesConIncidencias.sort((a, b) => {
        const totalA = a["Total General"];
        const totalB = b["Total General"];
        return totalB - totalA;
      });
  
      // Crear hoja de incidencias con estilos
      if (estudiantesConIncidencias.length > 0) {
        // Preparar datos para Excel (sin objetos complejos)
        const datosParaExcel = estudiantesConIncidencias.map(e => ({
          ...e,
          "Detalle Atrasos": e["Detalle Atrasos"],
          "Detalle Justificados": e["Detalle Justificados"]
        }));
  
        const incidenciasWorksheet = XLSX.utils.json_to_sheet(datosParaExcel);
        
        // Aplicar estilos a la hoja de incidencias
        estudiantesConIncidencias.forEach((estudiante, index) => {
          const row = index + 2;
          
          // Estilo para atrasos (rojo)
          if (estudiante["Total Atrasos"] > 0) {
            const cellAtrasos = XLSX.utils.encode_cell({c: 4, r: row-1});
            incidenciasWorksheet[cellAtrasos].s = {
              fill: {fgColor: {rgb: "FF9999"}},
              font: {bold: true, color: {rgb: "990000"}}
            };
          }
          
          // Estilo para justificados (verde)
          if (estudiante["Total Justificados"] > 0) {
            const cellJustificados = XLSX.utils.encode_cell({c: 5, r: row-1});
            incidenciasWorksheet[cellJustificados].s = {
              fill: {fgColor: {rgb: "99FF99"}},
              font: {bold: true, color: {rgb: "006600"}}
            };
          }
        });
        
        // Ajustar el ancho de las columnas
        incidenciasWorksheet["!cols"] = [
          { width: 15 }, // RUT
          { width: 20 }, // Nombre
          { width: 20 }, // Apellido
          { width: 10 }, // Curso
          { width: 15 }, // Total Atrasos
          { width: 15 }, // Total Justificados
          { width: 15 }, // Total General
          { width: 20 }, // Tipo
          { width: 40 }, // Detalle Atrasos
          { width: 40 }  // Detalle Justificados
        ];
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(workbook, incidenciasWorksheet, "Incidencias");
      }
  
      // Generar archivo Excel y descargar
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Atrasos_Estudiantes_${fecha}.xlsx`);
  
      alert(`Archivo Excel generado con éxito. Se encontraron ${estudiantesConIncidencias.length} estudiantes con incidencias.`);
    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("Ocurrió un error al generar el archivo Excel. Por favor, intente nuevamente.");
    }
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
        <button className="menu-button" onClick={() => navigate("/asistencia-hoy")}>Ver Atrasos</button>
        <button className="menu-button" onClick={() => navigate("/historial-asistencia")}>Consultar Historial Individual de Atrasos </button>
        <button className="menu-button" onClick={handleGenerarExcel}>Exportar Historial en EXCEL</button>
        <button className="menu-button" onClick={() => navigate("/medidas-disciplinarias")}>Gestión de Medidas Disciplinarias</button>

        {/* 🔹 Solo administradores pueden ver estos botones */}
        {rol === "admin" && (
          <>
            <h1 className="menu-title">Administración:</h1>
            
            <button className="menu-button" onClick={() => navigate("/generar-atraso")}>Generar Atraso</button>
            <button className="menu-button" onClick={() => navigate("/modificar-asistencia")}>Modificar Atraso</button>
            <button className="menu-button" onClick={() => navigate("/historial-atrasos")}>Historial General de Atrasos</button>
            <button className="menu-button" onClick={() => navigate("/gestion-alumnos")}>Gestión de Alumnos</button>
            <button className="menu-button" onClick={() => navigate("/generar-qr")}>Gestión de Códigos QR</button>
            <button className="menu-button" onClick={() => navigate("/registrar-usuario")}>Registrar Usuario</button>
          </>
        )}

        
      </div>
    </div>
  );
};

export default Menu;