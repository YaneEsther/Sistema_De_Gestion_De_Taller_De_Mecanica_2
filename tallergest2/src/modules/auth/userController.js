const db = require('../../config/db');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, nombreUsuario, rol, estado, fechaCreacion FROM usuarios ORDER BY id DESC'
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// Crear un nuevo usuario
exports.createUser = async (req, res) => {
  const { nombre, nombreUsuario, clave, rol, estado } = req.body;

  if (!nombre || !nombreUsuario || !clave || !rol) {
    return res.status(400).json({ ok: false, message: 'Todos los campos obligatorios deben completarse' });
  }

  try {
    // Verificar si el usuario ya existe
    const [existing] = await db.query('SELECT id FROM usuarios WHERE nombreUsuario = ?', [nombreUsuario]);
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, message: 'El nombre de usuario ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(clave, salt);

    // Insertar usuario
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, nombreUsuario, clave, rol, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre, nombreUsuario, hashedPassword, rol, estado || 'Activo']
    );

    res.status(201).json({
      ok: true,
      message: 'Usuario creado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ ok: false, message: 'Error al registrar el usuario' });
  }
};