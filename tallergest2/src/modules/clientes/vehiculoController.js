const db = require('../../config/db');
const { registrarLog } = require('../../core/auditoria');

// Obtener vehículos de un cliente específico
async function obtenerVehiculosPorCliente(req, res) {
  const { clienteId } = req.params;
  try {
    const [vehiculos] = await db.query(
      'SELECT * FROM vehiculos WHERE cliente_id = ? ORDER BY id DESC',
      [clienteId]
    );
    res.json(vehiculos);
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({ error: 'Error al obtener vehículos del cliente' });
  }
}

// Registrar un nuevo vehículo asociado a un cliente
async function crearVehiculo(req, res) {
  const { placa, marca, modelo, anio, cliente_id } = req.body;

  if (!placa || !marca || !modelo || !anio || !cliente_id) {
    return res.status(400).json({ error: 'Todos los campos del vehículo son requeridos' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO vehiculos (placa, marca, modelo, anio, cliente_id) VALUES (?, ?, ?, ?, ?)',
      [placa.toUpperCase(), marca, modelo, anio, cliente_id]
    );

    await registrarLog(`Vehículo registrado (Placa: ${placa}) para cliente ID: ${cliente_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Vehículo registrado con éxito',
      vehiculoId: resultado.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La placa ya se encuentra registrada en el sistema' });
    }
    console.error('Error al registrar vehículo:', error);
    res.status(500).json({ error: 'Error interno al registrar vehículo' });
  }
}

// Obtener el historial de mantenimiento de un vehículo
async function obtenerHistorialVehiculo(req, res) {
  const { vehiculoId } = req.params;
  try {
    const [historial] = await db.query(
      'SELECT * FROM historial_mantenimiento WHERE vehiculo_id = ? ORDER BY fecha DESC',
      [vehiculoId]
    );
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al consultar historial del vehículo' });
  }
}

module.exports = { obtenerVehiculosPorCliente, crearVehiculo, obtenerHistorialVehiculo };