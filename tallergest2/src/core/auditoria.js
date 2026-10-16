const db = require('../config/db');

async function registrarLog(accion, usuarioId = null) {
  try {
    await db.query(
      'INSERT INTO logs_auditoria (accion, usuario_id) VALUES (?, ?)',
      [accion, usuarioId]
    );
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
}

module.exports = { registrarLog };