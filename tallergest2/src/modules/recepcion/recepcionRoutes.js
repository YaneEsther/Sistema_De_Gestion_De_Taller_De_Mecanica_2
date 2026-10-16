const express = require('express');
const router = express.Router();
const {
  crearRecepcion,
  obtenerRecepciones,
  crearDiagnostico,
  obtenerDiagnosticoPorRecepcion
} = require('./recepcionController');

router.get('/', obtenerRecepciones);
router.post('/', crearRecepcion);
router.post('/diagnostico', crearDiagnostico);
router.get('/:recepcionId/diagnostico', obtenerDiagnosticoPorRecepcion);

module.exports = router;