const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./modules/auth/authRoutes');
const clienteRoutes = require('./modules/clientes/clienteRoutes');
const recepcionRoutes = require('./modules/recepcion/recepcionRoutes');
const ordenRoutes = require('./modules/ordenes/ordenRoutes');
const inventarioRoutes = require('./modules/inventario/inventarioRoutes');
const cotizacionRoutes = require('./modules/cotizaciones/cotizacionRoutes');
const userRoutes = require('./modules/auth/userRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/recepcion', recepcionRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/users', userRoutes);

// Servidor escuchando
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(` TallerGest v2 ejecutándose en: http://localhost:${PORT}/login.html`);
  console.log(`=================================`);
});