const db = require('../../config/db');
const { registrarLog } = require('../../core/auditoria');

// Obtener todos los clientes
async function obtenerClientes(req, res) {
  try {
    const [clientes] = await db.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al consultar clientes' });
  }
}

// Crear un nuevo cliente
async function crearCliente(req, res) {
  const { nombre, telefono, correo } = req.body;

  if (!nombre || !telefono || !correo) {
    return res.status(400).json({ error: 'Nombre, teléfono y correo son obligatorios' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO clientes (nombre, telefono, correo) VALUES (?, ?, ?)',
      [nombre, telefono, correo]
    );

    await registrarLog(`Cliente creado ID: ${resultado.insertId}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Cliente registrado exitosamente',
      clienteId: resultado.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error interno al registrar cliente' });
  }
}

module.exports = { obtenerClientes, crearCliente };