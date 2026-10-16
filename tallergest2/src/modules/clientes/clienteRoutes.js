const express = require('express');
const router = express.Router();
const { obtenerClientes, crearCliente } = require('./clienteController');
const { obtenerVehiculosPorCliente, crearVehiculo, obtenerHistorialVehiculo } = require('./vehiculoController');

// Rutas de Clientes
router.get('/', obtenerClientes);
router.post('/', crearCliente);

// Rutas de Vehículos e Historial
router.get('/:clienteId/vehiculos', obtenerVehiculosPorCliente);
router.post('/vehiculos', crearVehiculo);
router.get('/vehiculos/:vehiculoId/historial', obtenerHistorialVehiculo);

module.exports = router;