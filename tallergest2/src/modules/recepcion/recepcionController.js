const db = require('../../config/db');
const { registrarLog } = require('../../core/auditoria');

// Registrar la recepción de un vehículo
async function crearRecepcion(req, res) {
  const { vehiculo_id, observaciones } = req.body;

  if (!vehiculo_id) {
    return res.status(400).json({ error: 'El vehículo es obligatorio para la recepción' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO recepciones_vehiculo (vehiculo_id, observaciones) VALUES (?, ?)',
      [vehiculo_id, observaciones || 'Sin observaciones iniciales']
    );

    // Crear automáticamente la Orden de Trabajo inicial asociada en estado 'recibida'
    await db.query(
      'INSERT INTO ordenes_trabajo (recepcion_id, estado) VALUES (?, "recibida")',
      [resultado.insertId]
    );

    await registrarLog(`Recepción creada ID: ${resultado.insertId} para vehículo ID: ${vehiculo_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Vehículo recibido en el taller correctamente',
      recepcionId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar recepción:', error);
    res.status(500).json({ error: 'Error interno al registrar la recepción' });
  }
}

// Obtener todas las recepciones registradas con datos del vehículo y cliente
async function obtenerRecepciones(req, res) {
  try {
    const [recepciones] = await db.query(`
      SELECT 
        r.id AS recepcion_id,
        r.fecha_recepcion,
        r.observaciones,
        v.id AS vehiculo_id,
        v.placa,
        v.marca,
        v.modelo,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        o.id AS orden_id,
        o.estado AS orden_estado,
        d.id AS diagnostico_id
      FROM recepciones_vehiculo r
      INNER JOIN vehiculos v ON r.vehiculo_id = v.id
      INNER JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN ordenes_trabajo o ON o.recepcion_id = r.id
      LEFT JOIN diagnosticos d ON d.recepcion_id = r.id
      ORDER BY r.id DESC
    `);

    res.json(recepciones);
  } catch (error) {
    console.error('Error al consultar recepciones:', error);
    res.status(500).json({ error: 'Error al obtener la lista de recepciones' });
  }
}

// Registrar el diagnóstico técnico del vehículo
async function crearDiagnostico(req, res) {
  const { recepcion_id, hallazgos } = req.body;

  if (!recepcion_id || !hallazgos) {
    return res.status(400).json({ error: 'La recepción y los hallazgos del diagnóstico son obligatorios' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO diagnosticos (recepcion_id, hallazgos) VALUES (?, ?)',
      [recepcion_id, hallazgos]
    );

    // Actualizar el estado de la Orden de Trabajo a 'diagnosticada'
    await db.query(
      'UPDATE ordenes_trabajo SET estado = "diagnosticada" WHERE recepcion_id = ?',
      [recepcion_id]
    );

    await registrarLog(`Diagnóstico registrado ID: ${resultado.insertId} para recepción ID: ${recepcion_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Diagnóstico registrado con éxito',
      diagnosticoId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar diagnóstico:', error);
    res.status(500).json({ error: 'Error al guardar el diagnóstico' });
  }
}

// Obtener el diagnóstico de una recepción específica
async function obtenerDiagnosticoPorRecepcion(req, res) {
  const { recepcionId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM diagnosticos WHERE recepcion_id = ? ORDER BY id DESC LIMIT 1',
      [recepcionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se ha registrado diagnóstico para esta recepción' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al consultar diagnóstico:', error);
    res.status(500).json({ error: 'Error al consultar el diagnóstico' });
  }
}

module.exports = {
  crearRecepcion,
  obtenerRecepciones,
  crearDiagnostico,
  obtenerDiagnosticoPorRecepcion
};