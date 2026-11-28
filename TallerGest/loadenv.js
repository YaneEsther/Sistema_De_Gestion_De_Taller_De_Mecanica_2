/* Lee el archivo .env (si existe) y carga sus variables. No pisa las que ya estén definidas en el sistema. */
const fs = require('fs'), path = require('path');
try {
  const txt = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const linea of txt.split(/\r?\n/)) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i < 1) continue;
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
} catch (e) { /* sin .env: se usan las variables del sistema */ }
