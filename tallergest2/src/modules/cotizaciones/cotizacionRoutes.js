const express = require('express');
const router = express.Router();
const {
  crearCotizacion,
  obtenerCotizaciones,
  registrarAprobacionCliente,
  generarFactura,
  registrarPago
} = require('./cotizacionController');

router.get('/', obtenerCotizaciones);
router.post('/', crearCotizacion);
router.post('/aprobar', registrarAprobacionCliente);
router.post('/facturar', generarFactura);
router.post('/pagos', registrarPago);

module.exports = router;