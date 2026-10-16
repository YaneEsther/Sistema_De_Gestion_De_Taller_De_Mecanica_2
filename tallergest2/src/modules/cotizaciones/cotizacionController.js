const db = require('../../config/db');
const { registrarLog } = require('../../core/auditoria');

// --- COTIZACIONES ---

// Generar cotización calculando automáticamente el total de la Orden de Trabajo
async function crearCotizacion(req, res) {
  const { orden_id, dias_vigencia } = req.body;

  if (!orden_id) {
    return res.status(400).json({ error: 'La orden de trabajo es obligatoria' });
  }

  try {
    // 1. Sumar mano de obra (servicios) de la orden
    const [servicios] = await db.query(
      'SELECT IFNULL(SUM(costo), 0) AS total_servicios FROM orden_servicios WHERE orden_id = ?',
      [orden_id]
    );

    // 2. Sumar repuestos consumidos en la orden
    const [repuestos] = await db.query(
      'SELECT IFNULL(SUM(cantidad * precio_unitario), 0) AS total_repuestos FROM orden_repuestos WHERE orden_id = ?',
      [orden_id]
    );

    const totalCalculado = parseFloat(servicios[0].total_servicios) + parseFloat(repuestos[0].total_repuestos);

    if (totalCalculado === 0) {
      return res.status(400).json({ error: 'La orden no tiene servicios ni repuestos cargados para cotizar.' });
    }

    // Calcular fecha de vigencia (por defecto 15 días)
    const fechaVigencia = new Date();
    fechaVigencia.setDate(fechaVigencia.getDate() + (parseInt(dias_vigencia) || 15));

    // 3. Crear la cotización
    const [resultado] = await db.query(
      'INSERT INTO cotizaciones (orden_id, total, vigencia) VALUES (?, ?, ?)',
      [orden_id, totalCalculado, fechaVigencia]
    );

    const cotizacionId = resultado.insertId;

    // 4. Copiar detalles a detalles_cotizacion
    const [servDetalles] = await db.query(
      `SELECT s.nombre AS descripcion, 1 AS cantidad, os.costo AS precio_unitario, os.costo AS subtotal 
       FROM orden_servicios os INNER JOIN servicios s ON os.servicio_id = s.id WHERE os.orden_id = ?`,
      [orden_id]
    );

    const [repDetalles] = await db.query(
      `SELECT r.nombre AS descripcion, ore.cantidad, ore.precio_unitario, (ore.cantidad * ore.precio_unitario) AS subtotal 
       FROM orden_repuestos ore INNER JOIN repuestos r ON ore.repuesto_id = r.id WHERE ore.orden_id = ?`,
      [orden_id]
    );

    const todosDetalles = [...servDetalles, ...repDetalles];

    for (const d of todosDetalles) {
      await db.query(
        'INSERT INTO detalles_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [cotizacionId, d.descripcion, d.cantidad, d.precio_unitario, d.subtotal]
      );
    }

    // 5. Actualizar estado de la orden a 'cotizada'
    await db.query('UPDATE ordenes_trabajo SET estado = "cotizada" WHERE id = ?', [orden_id]);

    await registrarLog(`Cotización ID: ${cotizacionId} generada para Orden ID: ${orden_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Cotización generada exitosamente',
      cotizacionId,
      total: totalCalculado
    });
  } catch (error) {
    console.error('Error al generar cotización:', error);
    res.status(500).json({ error: 'Error al generar la cotización' });
  }
}

// Obtener todas las cotizaciones
async function obtenerCotizaciones(req, res) {
  try {
    const [cotizaciones] = await db.query(`
      SELECT 
        cot.id AS cotizacion_id,
        cot.orden_id,
        cot.total,
        cot.vigencia,
        cot.fecha_creacion,
        v.placa,
        v.marca,
        v.modelo,
        c.nombre AS cliente_nombre,
        c.correo AS cliente_correo,
        o.estado AS orden_estado,
        f.id AS factura_id
      FROM cotizaciones cot
      INNER JOIN ordenes_trabajo o ON cot.orden_id = o.id
      INNER JOIN recepciones_vehiculo r ON o.recepcion_id = r.id
      INNER JOIN vehiculos v ON r.vehiculo_id = v.id
      INNER JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN facturas f ON f.cotizacion_id = cot.id
      ORDER BY cot.id DESC
    `);

    res.json(cotizaciones);
  } catch (error) {
    console.error('Error al consultar cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
}

// --- APROBACIÓN DEL CLIENTE ---

async function registrarAprobacionCliente(req, res) {
  const { cotizacion_id, aprobado } = req.body;

  if (!cotizacion_id || aprobado === undefined) {
    return res.status(400).json({ error: 'Cotización y respuesta de aprobación son requeridas' });
  }

  try {
    await db.query(
      'INSERT INTO aprobaciones_cliente (cotizacion_id, aprobado) VALUES (?, ?)',
      [cotizacion_id, aprobado]
    );

    // Obtener la orden asociada
    const [cot] = await db.query('SELECT orden_id FROM cotizaciones WHERE id = ?', [cotizacion_id]);

    if (cot.length > 0) {
      const nuevoEstado = aprobado ? 'aprobada' : 'cotizada';
      await db.query('UPDATE ordenes_trabajo SET estado = ? WHERE id = ?', [nuevoEstado, cot[0].orden_id]);
    }

    await registrarLog(`Aprobación registrada para Cotización ID: ${cotizacion_id} (Aprobado: ${aprobado})`, req.usuario ? req.usuario.id : null);

    res.json({ mensaje: 'Aprobación del cliente registrada correctamente' });
  } catch (error) {
    console.error('Error al registrar aprobación:', error);
    res.status(500).json({ error: 'Error al procesar la aprobación' });
  }
}

// --- FACTURACIÓN Y PAGOS ---

// Generar factura fiscal/comercial desde una cotización aprobada
async function generarFactura(req, res) {
  const { cotizacion_id } = req.body;

  if (!cotizacion_id) {
    return res.status(400).json({ error: 'Cotización requerida' });
  }

  try {
    const [cot] = await db.query('SELECT orden_id, total FROM cotizaciones WHERE id = ?', [cotizacion_id]);

    if (cot.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const [facturaExistente] = await db.query('SELECT id FROM facturas WHERE cotizacion_id = ?', [cotizacion_id]);
    if (facturaExistente.length > 0) {
      return res.status(400).json({ error: 'Esta cotización ya tiene una factura emitida' });
    }

    // Crear factura
    const [resultado] = await db.query(
      'INSERT INTO facturas (cotizacion_id, total) VALUES (?, ?)',
      [cotizacion_id, cot[0].total]
    );

    // Actualizar orden a 'facturada'
    await db.query('UPDATE ordenes_trabajo SET estado = "facturada" WHERE id = ?', [cot[0].orden_id]);

    await registrarLog(`Factura emitida ID: ${resultado.insertId} para Cotización ID: ${cotizacion_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Factura emitida con éxito',
      facturaId: resultado.insertId,
      total: cot[0].total
    });
  } catch (error) {
    console.error('Error al generar factura:', error);
    res.status(500).json({ error: 'Error al emitir la factura' });
  }
}

// Registrar pago a una factura
async function registrarPago(req, res) {
  const { factura_id, monto, metodo } = req.body;

  if (!factura_id || !monto || !metodo) {
    return res.status(400).json({ error: 'Factura, monto y método de pago son requeridos' });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO pagos (factura_id, monto, metodo) VALUES (?, ?, ?)',
      [factura_id, monto, metodo]
    );

    await registrarLog(`Pago de \$${monto} (${metodo}) registrado para Factura ID: ${factura_id}`, req.usuario ? req.usuario.id : null);

    res.status(201).json({
      mensaje: 'Pago registrado exitosamente',
      pagoId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
}

module.exports = {
  crearCotizacion,
  obtenerCotizaciones,
  registrarAprobacionCliente,
  generarFactura,
  registrarPago
};