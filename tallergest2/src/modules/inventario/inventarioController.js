const db = require('../../config/db');
const { registrarLog } = require('../../core/auditoria');

// --- SERVICIOS (MANO DE OBRA) ---

// Obtener catálogo de servicios
async function obtenerServicios(req, res) {
  try {
    const [servicios] = await db.query('SELECT * FROM servicios ORDER BY id DESC');
    res.json(servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al consultar catálogo de servicios' });
  }
}

// Registrar un nuevo servicio
async function crearServicio(req, res) {
  const { nombre, costo_mano_obra } = req.body;

  if (!nombre || costo_mano_obra === undefined) {
    return res.status(400).json({ error: 'Nombre y costo de mano de obra son requeridos' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO servicios (nombre, costo_mano_obra) VALUES (?, ?)',
      [nombre, costo_mano_obra]
    );

    await registrarLog(`Servicio creado ID: ${resultado.insertId}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Servicio registrado con éxito',
      servicioId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar servicio:', error);
    res.status(500).json({ error: 'Error al guardar el servicio' });
  }
}

// --- REPUESTOS (INVENTARIO DE INSUMOS) ---

// Obtener todos los repuestos en existencia
async function obtenerRepuestos(req, res) {
  try {
    const [repuestos] = await db.query('SELECT * FROM repuestos ORDER BY id DESC');
    res.json(repuestos);
  } catch (error) {
    console.error('Error al obtener repuestos:', error);
    res.status(500).json({ error: 'Error al consultar inventario de repuestos' });
  }
}

// Crear un nuevo repuesto
async function crearRepuesto(req, res) {
  const { nombre, existencia, precio_unitario } = req.body;

  if (!nombre || existencia === undefined || precio_unitario === undefined) {
    return res.status(400).json({ error: 'Todos los campos del repuesto son obligatorios' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO repuestos (nombre, existencia, precio_unitario) VALUES (?, ?, ?)',
      [nombre, existencia, precio_unitario]
    );

    await registrarLog(`Repuesto registrado ID: ${resultado.insertId}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Repuesto ingresado al inventario',
      repuestoId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar repuesto:', error);
    res.status(500).json({ error: 'Error al guardar el repuesto' });
  }
}

// --- CONSUMO EN ÓRDENES DE TRABAJO ---

// Agregar un servicio a una orden de trabajo
async function agregarServicioAOrden(req, res) {
  const { orden_id, servicio_id, costo } = req.body;

  if (!orden_id || !servicio_id || costo === undefined) {
    return res.status(400).json({ error: 'Orden, servicio y costo son obligatorios' });
  }

  try {
    await db.query(
      'INSERT INTO orden_servicios (orden_id, servicio_id, costo) VALUES (?, ?, ?)',
      [orden_id, servicio_id, costo]
    );

    await registrarLog(`Servicio ID: ${servicio_id} agregado a Orden ID: ${orden_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({ mensaje: 'Servicio asignado a la orden de trabajo' });
  } catch (error) {
    console.error('Error al asignar servicio a la orden:', error);
    res.status(500).json({ error: 'Error al agregar servicio a la orden' });
  }
}

// Agregar un repuesto a una orden de trabajo y descontar de existencia (Stock)
async function agregarRepuestoAOrden(req, res) {
  const { orden_id, repuesto_id, cantidad, precio_unitario } = req.body;

  if (!orden_id || !repuesto_id || !cantidad || precio_unitario === undefined) {
    return res.status(400).json({ error: 'Orden, repuesto, cantidad y precio son requeridos' });
  }

  try {
    // 1. Verificar stock disponible
    const [repuesto] = await db.query('SELECT existencia FROM repuestos WHERE id = ?', [repuesto_id]);
    
    if (repuesto.length === 0) {
      return res.status(404).json({ error: 'El repuesto especificado no existe' });
    }

    if (repuesto[0].existencia < cantidad) {
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${repuesto[0].existencia}` });
    }

    // 2. Cargar repuesto a la orden
    await db.query(
      'INSERT INTO orden_repuestos (orden_id, repuesto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      [orden_id, repuesto_id, cantidad, precio_unitario]
    );

    // 3. Descontar del inventario general
    await db.query(
      'UPDATE repuestos SET existencia = existencia - ? WHERE id = ?',
      [cantidad, repuesto_id]
    );

    await registrarLog(`Repuesto ID: ${repuesto_id} (Cant: ${cantidad}) cargado a Orden ID: ${orden_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({ mensaje: 'Repuesto cargado a la orden y stock actualizado' });
  } catch (error) {
    console.error('Error al agregar repuesto a la orden:', error);
    res.status(500).json({ error: 'Error al procesar el repuesto' });
  }
}

module.exports = {
  obtenerServicios,
  crearServicio,
  obtenerRepuestos,
  crearRepuesto,
  agregarServicioAOrden,
  agregarRepuestoAOrden
};