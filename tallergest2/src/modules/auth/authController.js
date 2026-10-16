const db = require('../../config/db');
const { verificarClave, generarToken } = require('../../core/seguridad');
const { registrarLog } = require('../../core/auditoria');

async function login(req, res) {
  const { nombre_usuario, clave } = req.body;

  if (!nombre_usuario || !clave) {
    return res.status(400).json({ error: 'Por favor ingrese usuario y contraseña' });
  }

  try {
    // Buscar usuario y su rol
    const [rows] = await db.query(
      `SELECT u.id, u.nombre_usuario, u.clave, u.rol_id, r.nombre AS rol_nombre 
       FROM usuarios u 
       INNER JOIN roles r ON u.rol_id = r.id 
       WHERE u.nombre_usuario = ?`,
      [nombre_usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows;

    // Verificar contraseña (soporta hash BCrypt)
    const esValido = await verificarClave(clave, usuario.clave);
    if (!esValido) {
      await registrarLog(`Intento fallido de login para usuario: ${nombre_usuario}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar Token JWT
    const token = generarToken(usuario);

    // Auditoría de login exitoso
    await registrarLog(`Inicio de sesión exitoso`, usuario.id);

    return res.json({
      mensaje: 'Autenticación exitosa',
      token,
      usuario: {
        id: usuario.id,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol_nombre
      }
    });
  } catch (error) {
    console.error('Error en Login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { login };