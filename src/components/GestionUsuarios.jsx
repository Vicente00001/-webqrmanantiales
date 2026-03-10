import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { getAuth, deleteUser, getAdditionalUserInfo } from "firebase/auth";
import "./DiseñoGestion.css";
import logo from "../assets/LOGOMANANTIALES.png";

const GestionUsuarios = () => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Obtener todos los usuarios y verificar rol del usuario actual
  const obtenerUsuarios = async () => {
    setIsLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      // Obtener rol del usuario actual
      if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          setCurrentUserRole(userDoc.data().rol);
        }
      }

      // Obtener todos los usuarios
      const snapshot = await getDocs(collection(db, "usuarios"));
      const usuariosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        nombre: doc.data().nombre?.toUpperCase() || "",
        apellido: doc.data().apellido?.toUpperCase() || "",
        email: doc.data().email?.toLowerCase() || "",
      }));
      
      setUsuarios(usuariosData);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      alert("Error al cargar los usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  // Filtrar usuarios por búsqueda
  const usuariosFiltrados = usuarios.filter((user) =>
    Object.values(user)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Seleccionar usuario y abrir modal de edición
  const handleEdit = (usuario) => {
    setSelectedUser(usuario);
    setEditedData(usuario);
    setShowEditModal(true);
  };

  // Eliminar usuario de Firestore y Authentication
  const handleDelete = async (usuario) => {
    if (!usuario) return;

    const auth = getAuth();
    const currentUser = auth.currentUser;

    // Verificar que el usuario actual es admin
    if (currentUserRole !== "admin") {
      alert("❌ Solo los administradores pueden eliminar usuarios");
      return;
    }

    // Verificar que no se está eliminando a sí mismo
    if (currentUser.uid === usuario.id) {
      alert("❌ No puedes eliminarte a ti mismo");
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de eliminar al usuario ${usuario.nombre} ${usuario.apellido}?\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      // 1. Eliminar de Authentication
      try {
        const userToDelete = await getAdditionalUserInfo(usuario.id);
        if (userToDelete) {
          await deleteUser(userToDelete);
          console.log("Usuario eliminado de Authentication");
        }
      } catch (authError) {
        console.warn("No se pudo eliminar de Auth (puede que no exista):", authError);
      }

      // 2. Eliminar de Firestore
      const docRef = doc(db, "usuarios", usuario.id);
      await deleteDoc(docRef);
      
      alert("✅ Usuario eliminado correctamente de ambos sistemas.");
      obtenerUsuarios();
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      alert(`❌ Error al eliminar el usuario: ${error.message}`);
    }
  };

  // Guardar cambios en Firestore
  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    
    const auth = getAuth();
    const currentUser = auth.currentUser;

    // Verificar permisos
    if (currentUserRole !== "admin" && currentUser.uid !== selectedUser.id) {
      alert("❌ Solo puedes editar tu propio perfil o necesitas ser administrador");
      return;
    }

    const docRef = doc(db, "usuarios", selectedUser.id);

    const cambiosRealizados = Object.keys(editedData).some(
      (key) => JSON.stringify(editedData[key]) !== JSON.stringify(selectedUser[key])
    );

    if (!cambiosRealizados) {
      alert("⚠️ No se detectaron cambios para guardar.");
      return;
    }

    try {
      await updateDoc(docRef, editedData);
      alert("✅ Cambios realizados correctamente.");
      setShowEditModal(false);
      obtenerUsuarios();
    } catch (error) {
      console.error("Error actualizando datos:", error);
      alert("❌ Error actualizando datos del usuario.");
    }
  };

  if (isLoading) {
    return (
      <div className="gestion-container">
        <div className="loading-spinner">
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-container">
      <div className="gestion-header">
        <img src={logo} alt="Logo Colegio Manantiales" className="gestion-logo" />
        <h1 className="gestion-title">Gestión de Usuarios</h1>
      </div>

      <div className="gestion-buttons">
        {currentUserRole === "admin" && (
          <button className="add-button" onClick={() => navigate("/registrar-usuario")}>
            ➕ Agregar Nuevo Usuario
          </button>
        )}
        
        <button className="back-button" onClick={() => navigate("/menu")}>
          Volver al Menú
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o correo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length > 0 ? (
              usuariosFiltrados.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nombre">{user.nombre}</td>
                  <td data-label="Apellido">{user.apellido}</td>
                  <td data-label="Correo">{user.correo}</td>
                  <td data-label="Rol">{user.rol}</td>
                  <td data-label="Acciones" className="actions-cell">
                    <button 
                      className="edit-button" 
                      onClick={() => handleEdit(user)}
                      disabled={currentUserRole !== "admin" && getAuth().currentUser.uid !== user.id}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="delete-button" 
                      onClick={() => handleDelete(user)}
                      disabled={currentUserRole !== "admin"}
                    >
                      ❌ Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  {searchQuery ? "No se encontraron usuarios con ese criterio" : "No hay usuarios registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para edición */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal modal-fullscreen">
            <h2>Editar Usuario</h2>

            <div className="form-scrollable">
              <div className="form-group">
                <label>Nombre:</label>
                <input 
                  type="text" 
                  value={editedData.nombre || ""} 
                  onChange={(e) => setEditedData({ ...editedData, nombre: e.target.value.toUpperCase() })} 
                />
              </div>

              <div className="form-group">
                <label>Apellido:</label>
                <input 
                  type="text" 
                  value={editedData.apellido || ""} 
                  onChange={(e) => setEditedData({ ...editedData, apellido: e.target.value.toUpperCase() })} 
                />
              </div>

              <div className="form-group">
                <label>Correo:</label>
                <input 
                  type="email" 
                  value={editedData.email || ""} 
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value.toLowerCase() })} 
                />
              </div>

              <div className="form-group">
                <label>Rol:</label>
                <select
                  value={editedData.rol || "inspector"}
                  onChange={(e) => setEditedData({ ...editedData, rol: e.target.value })}
                  disabled={currentUserRole !== "admin"}
                >
                  <option value="inspector">Inspector</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="form-buttons">
              <button className="add-button" onClick={handleSaveChanges}>
                Guardar Cambios
              </button>
              <button className="back-button" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;