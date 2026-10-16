const db = require('../../config/db');
const { registrarLog } = require('../../core/auditoria');

// --- GESTIÓN DE MECÁNICOS ---

// Obtener la lista de mecánicos
async function obtenerMecanicos(req, res) {
  try {
    const [mecanicos] = await db.query('SELECT * FROM mecanicos ORDER BY id DESC');
    res.json(mecanicos);
  } catch (error) {
    console.error('Error al obtener mecánicos:', error);
    res.status(500).json({ error: 'Error al consultar mecánicos' });
  }
}

// Registrar un nuevo mecánico
async function crearMecanico(req, res) {
  const { nombre, especialidad } = req.body;

  if (!nombre || !especialidad) {
    return res.status(400).json({ error: 'El nombre y la especialidad son requeridos' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO mecanicos (nombre, especialidad, disponible) VALUES (?, ?, TRUE)',
      [nombre, especialidad]
    );

    await registrarLog(`Mecánico registrado ID: ${resultado.insertId}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Mecánico registrado correctamente',
      mecanicoId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar mecánico:', error);
    res.status(500).json({ error: 'Error interno al registrar mecánico' });
  }
}

// --- GESTIÓN DE ÓRDENES DE TRABAJO ---

// Obtener todas las órdenes con detalles de vehículo, cliente, mecánico y diagnóstico
async function obtenerOrdenes(req, res) {
  try {
    const [ordenes] = await db.query(`
      SELECT 
        o.id AS orden_id,
        o.estado,
        o.fecha_creacion,
        r.id AS recepcion_id,
        r.observaciones AS recepcion_observaciones,
        v.placa,
        v.marca,
        v.modelo,
        c.nombre AS cliente_nombre,
        m.id AS mecanico_id,
        m.nombre AS mecanico_nombre,
        d.hallazgos AS diagnostico_hallazgos
      FROM ordenes_trabajo o
      INNER JOIN recepciones_vehiculo r ON o.recepcion_id = r.id
      INNER JOIN vehiculos v ON r.vehiculo_id = v.id
      INNER JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN mecanicos m ON o.mecanico_id = m.id
      LEFT JOIN diagnosticos d ON d.recepcion_id = r.id
      ORDER BY o.id DESC
    `);

    res.json(ordenes);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al listar las órdenes de trabajo' });
  }
}

// Asignar un mecánico a una orden de trabajo (Operación + Transición de estado)
async function asignarMecanico(req, res) {
  const { ordenId } = req.params;
  const { mecanico_id } = req.body;

  if (!mecanico_id) {
    return res.status(400).json({ error: 'Debe seleccionar un mecánico válido' });
  }

  try {
    // Asignar mecánico a la orden
    await db.query(
      'UPDATE ordenes_trabajo SET mecanico_id = ? WHERE id = ?',
      [mecanico_id, ordenId]
    );

    await registrarLog(`Mecánico ID: ${mecanico_id} asignado a la Orden ID: ${ordenId}`, req.usuario ? req.usuario.id : null);

    res.json({ mensaje: 'Mecánico asignado exitosamente a la orden' });
  } catch (error) {
    console.error('Error al asignar mecánico:', error);
    res.status(500).json({ error: 'Error al asignar mecánico' });
  }
}

// Actualizar el estado de la Orden de Trabajo (Control de Estados ENUM)
async function cambiarEstadoOrden(req, res) {
  const { ordenId } = req.params;
  const { nuevoEstado } = req.body;

  const estadosValidos = ['recibida', 'diagnosticada', 'cotizada', 'aprobada', 'en_ejecucion', 'finalizada', 'facturada'];

  if (!estadosValidos.includes(nuevoEstado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  try {
    await db.query(
      'UPDATE ordenes_trabajo SET estado = ? WHERE id = ?',
      [nuevoEstado, ordenId]
    );

    await registrarLog(`Estado de la Orden ID: ${ordenId} cambiado a: ${nuevoEstado}`, req.usuario ? req.usuario.id : null);

    res.json({ mensaje: `Estado actualizado a '${nuevoEstado}' correctamente` });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ error: 'Error al actualizar el estado de la orden' });
  }
}

module.exports = {
  obtenerMecanicos,
  crearMecanico,
  obtenerOrdenes,
  asignarMecanico,
  cambiarEstadoOrden
};