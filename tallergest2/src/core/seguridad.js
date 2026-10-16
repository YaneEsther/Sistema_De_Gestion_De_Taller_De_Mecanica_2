const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function verificarClave(claveIngresada, claveHash) {
  return await bcrypt.compare(claveIngresada, claveHash);
}

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre_usuario: usuario.nombre_usuario, rol_id: usuario.rol_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { verificarClave, generarToken };