const express = require('express');
const router = express.Router();
const {
  obtenerServicios,
  crearServicio,
  obtenerRepuestos,
  crearRepuesto,
  agregarServicioAOrden,
  agregarRepuestoAOrden
} = require('./inventarioController');

// Rutas de Servicios
router.get('/servicios', obtenerServicios);
router.post('/servicios', crearServicio);

// Rutas de Repuestos
router.get('/repuestos', obtenerRepuestos);
router.post('/repuestos', crearRepuesto);

// Carga de consumo en Órdenes
router.post('/orden-servicio', agregarServicioAOrden);
router.post('/orden-repuesto', agregarRepuestoAOrden);

module.exports = router;