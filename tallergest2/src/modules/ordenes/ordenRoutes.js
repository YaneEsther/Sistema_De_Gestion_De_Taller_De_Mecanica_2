const express = require('express');
const router = express.Router();
const {
  obtenerMecanicos,
  crearMecanico,
  obtenerOrdenes,
  asignarMecanico,
  cambiarEstadoOrden
} = require('./ordenController');

// Rutas de Mecánicos
router.get('/mecanicos', obtenerMecanicos);
router.post('/mecanicos', crearMecanico);

// Rutas de Órdenes de Trabajo
router.get('/', obtenerOrdenes);
router.put('/:ordenId/mecanico', asignarMecanico);
router.put('/:ordenId/estado', cambiarEstadoOrden);

module.exports = router;