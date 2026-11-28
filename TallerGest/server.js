/* TallerGest – servidor (Express + Postgres/Neon). Sirve el frontend de /public y la API /api */
require('./loadenv');
const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), path = require('path'), crypto = require('crypto');
const { pool, SCHEMA, COLS, init, aObjeto, guardar, traducir } = require('./db');

const PORT = process.env.PORT || 3000;
const TZ = process.env.APP_TZ || 'America/Santo_Domingo';
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('AVISO: define JWT_SECRET; sin él las sesiones se cierran al reiniciar.');
const SESION_ACTIVA_SEG = 180; // sin actividad por este tiempo, la sesión deja de bloquear nuevos inicios
const MAX_FOTOS = 12, MAX_FOTO_BYTES = 3 * 1024 * 1024, TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

const pub = u => { const { hash, clave, ...r } = u; return r; };
const ahora = () => new Date().toLocaleString('es-DO', { timeZone: TZ });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => { console.error(e); console.error(e.detail || ''); res.status(500).json({ error: traducir(e) }); });
const rowsOf = async (sql, p = []) => (await pool.query(sql, p)).rows;
const getUser = async id => { const r = await rowsOf('SELECT * FROM usuarios WHERE id=$1', [String(id)]); return r[0] ? aObjeto('usuarios', r[0]) : null; };
const audit = (c, u, accion, modulo, registro = '', detalle = '') => guardar(c, 'auditoria', { id: Date.now() + '-' + crypto.randomInt(1000), fecha: ahora(), usuario: u.usuario, nombre: u.nombre, accion, modulo, registro, detalle });

async function arranque() {
  await init();
  const n = (await rowsOf('SELECT count(*)::int AS n FROM usuarios'))[0].n;
  if (!n) {
    const pass = process.env.ADMIN_PASSWORD || 'admin123';
    await guardar(pool, 'usuarios', { id: '1', usuario: 'admin', nombre: 'Administrador', rol: 'admin', estado: 'Activo', hash: bcrypt.hashSync(pass, 10) });
    if (process.env.SEED_DEMO === '1')
      for (const [id, usuario, nombre, rol, p] of [[2,'mecanico','Carlos Díaz','mecanico','mec123'],[3,'recepcion','María López','recepcion','rec123'],[4,'factura','Ana Torres','facturador','fac123']])
        await guardar(pool, 'usuarios', { id: String(id), usuario, nombre, rol, estado: 'Activo', hash: bcrypt.hashSync(p, 10) });
    console.log('Usuario inicial creado: admin' + (process.env.ADMIN_PASSWORD ? '' : ' / admin123 (¡cámbiala!)'));
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

const MSG_SESION = 'Tu sesión terminó. Es posible que hayas iniciado sesión en otro dispositivo o pestaña, o que se haya cerrado.';
const auth = wrap(async (req, res, next) => {
  let p;
  try { p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); }
  catch (e) { return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo.' }); }
  const ses = (await rowsOf('SELECT usuario FROM sesiones WHERE id=$1', [String(p.sid || '')]))[0];
  if (!ses || ses.usuario !== String(p.id)) return res.status(401).json({ error: MSG_SESION });
  const u = await getUser(p.id);
  if (!u || u.estado !== 'Activo') return res.status(401).json({ error: 'Tu usuario está inactivo o ya no existe.' });
  req.user = u; req.sid = p.sid;
  await pool.query("UPDATE sesiones SET ultima=now() WHERE id=$1 AND ultima < now() - interval '15 seconds'", [p.sid]);
  next();
});
const soloRoles = (...r) => (req, res, next) => r.includes(req.user.rol) ? next() : res.status(403).json({ error: 'No tienes permiso para esto.' });

const fails = new Map();
app.post('/api/login', wrap(async (req, res) => {
  const ip = req.ip, f = fails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 600000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 8) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  const { usuario = '', clave = '', forzar = false } = req.body || {};
  const r = await rowsOf('SELECT * FROM usuarios WHERE lower(usuario)=lower($1)', [String(usuario).trim()]), u = r[0] && aObjeto('usuarios', r[0]);
  if (!u || !bcrypt.compareSync(String(clave), u.hash || '')) { f.n++; fails.set(ip, f); if (u) await audit(pool, u, 'Intento de acceso fallido', 'Login', u.usuario, 'Contraseña incorrecta'); return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); }
  if (u.estado !== 'Activo') { await audit(pool, u, 'Acceso denegado', 'Login', u.usuario, 'Usuario inactivo'); return res.status(403).json({ error: 'Tu usuario está inactivo. Contacta al administrador.' }); }
  fails.delete(ip);
  const activa = (await rowsOf("SELECT 1 FROM sesiones WHERE usuario=$1 AND ultima > now() - ($2::int * interval '1 second')", [u.id, SESION_ACTIVA_SEG])).length > 0;
  if (activa && !forzar) {
    await audit(pool, u, 'Inicio de sesión bloqueado', 'Login', u.usuario, 'Ya tenía una sesión activa en otro dispositivo o pestaña');
    return res.status(409).json({ activa: true, error: 'Este usuario ya tiene una sesión activa en otro dispositivo o pestaña. Cierra esa sesión antes de iniciar una nueva.' });
  }
  await pool.query('DELETE FROM sesiones WHERE usuario=$1', [u.id]);
  const sid = crypto.randomUUID();
  await pool.query('INSERT INTO sesiones(id, usuario, ip, agente) VALUES($1,$2,$3,$4)', [sid, u.id, req.ip, String(req.headers['user-agent'] || '').slice(0, 200)]);
  await audit(pool, u, activa ? 'Inicio de sesión (cerró la sesión anterior)' : 'Inicio de sesión', 'Login', u.usuario);
  res.json({ token: jwt.sign({ id: u.id, sid }, SECRET, { expiresIn: '12h' }), user: pub(u) });
}));

app.post('/api/logout', auth, wrap(async (req, res) => {
  await pool.query('DELETE FROM sesiones WHERE id=$1', [req.sid]);
  await audit(pool, req.user, 'Cierre de sesión', 'Login', req.user.usuario);
  res.json({ ok: true });
}));

app.get('/api/data', auth, wrap(async (req, res) => {
  const adm = req.user.rol === 'admin', uid = String(req.user.id), out = {};
  await Promise.all(COLS.map(async c => {
    let rows;
    if (c === 'auditoria') rows = adm ? await rowsOf('SELECT * FROM auditoria ORDER BY seq DESC LIMIT 500') : [];
    else if (c === 'notif') rows = await rowsOf('SELECT * FROM notif WHERE para=$1 ORDER BY seq DESC', [uid]);
    else if (c === 'cierres' && !adm) rows = await rowsOf('SELECT * FROM cierres WHERE por=$1 ORDER BY seq', [uid]);
    else rows = await rowsOf(`SELECT * FROM ${c} ORDER BY seq`);
    let a = rows.map(r => aObjeto(c, r));
    if (c === 'usuarios') a = a.map(pub);
    out[c] = a;
  }));
  if (adm) {
    const on = new Set((await rowsOf("SELECT usuario FROM sesiones WHERE ultima > now() - ($1::int * interval '1 second')", [SESION_ACTIVA_SEG])).map(x => x.usuario));
    out.usuarios.forEach(x => { if (on.has(String(x.id))) x.enLinea = true; });
  }
  /* Fotos de recepción: solo metadatos (la imagen se pide aparte) */
  const fotos = await rowsOf('SELECT id, recepcion, nombre FROM recepcion_fotos ORDER BY creado, id'), por = {};
  fotos.forEach(f => (por[f.recepcion] = por[f.recepcion] || []).push({ id: f.id, nombre: f.nombre }));
  out.recepcion.forEach(r => { r.fotos = por[r.id] || []; });
  res.json(out);
}));

app.post('/api/data/:col', auth, wrap(async (req, res) => {
  const c = req.params.col, u = req.user, adm = u.rol === 'admin';
  if (!COLS.includes(c)) return res.status(404).json({ error: 'Colección desconocida' });
  if ((c === 'usuarios' || c === 'cfg') && !adm) return res.status(403).json({ error: 'Solo el administrador puede hacer esto.' });
  const up = Array.isArray(req.body.up) ? req.body.up : [], del = Array.isArray(req.body.del) ? req.body.del : [];
  const cl = await pool.connect();
  try {
    await cl.query('BEGIN');
    for (const r of up) {
      if (!r || r.id === undefined || r.id === '') throw new Error('Registro sin id');
      const id = String(r.id), rec = { ...r, id };
      if (c === 'recepcion') delete rec.fotos;
      if (c === 'usuarios') delete rec.enLinea;
      if (c === 'usuarios') {
        const prev = (await cl.query('SELECT hash FROM usuarios WHERE id=$1', [id])).rows[0];
        if (!rec.usuario || !rec.nombre || !rec.rol) throw new Error('Faltan datos del usuario.');
        if ((await cl.query('SELECT 1 FROM usuarios WHERE id<>$1 AND lower(usuario)=lower($2)', [id, String(rec.usuario)])).rowCount) throw new Error('Ese nombre de usuario ya existe.');
        if (rec.clave) rec.hash = bcrypt.hashSync(String(rec.clave), 10);
        else if (prev) rec.hash = prev.hash;
        else throw new Error('La contraseña es obligatoria.');
        delete rec.clave;
      }
      if (c === 'auditoria') {
        if ((await cl.query('SELECT 1 FROM auditoria WHERE id=$1', [id])).rowCount) continue;
        rec.usuario = u.usuario; rec.nombre = u.nombre;
      }
      await guardar(cl, c, rec);
    }
    if (c !== 'auditoria') for (const id of del) {
      if (c === 'usuarios' && String(id) === String(u.id)) throw new Error('No puedes eliminar tu propio usuario.');
      await cl.query(`DELETE FROM ${c} WHERE id=$1`, [String(id)]);
    }
    if (c === 'usuarios' && !(await cl.query("SELECT 1 FROM usuarios WHERE rol='admin' AND estado='Activo'")).rowCount)
      throw new Error('Debe existir al menos un administrador activo.');
    await cl.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await cl.query('ROLLBACK').catch(() => {}); res.status(400).json({ error: traducir(e) }); }
  finally { cl.release(); }
}));

/* ---- Fotos de recepción del vehículo (evidencia del estado en que se entrega) ---- */
app.post('/api/recepcion/:id/fotos', auth, soloRoles('admin', 'recepcion'), wrap(async (req, res) => {
  const id = String(req.params.id), { nombre = '', tipo = '', datos = '' } = req.body || {};
  if (!TIPOS_FOTO.includes(tipo)) return res.status(400).json({ error: 'Formato no admitido. Solo se aceptan imágenes JPG, PNG o WebP.' });
  const buf = Buffer.from(String(datos).replace(/^data:[^,]+,/, ''), 'base64');
  if (!buf.length) return res.status(400).json({ error: 'Imagen vacía.' });
  if (buf.length > MAX_FOTO_BYTES) return res.status(400).json({ error: 'La imagen es demasiado grande (máx. 3 MB).' });
  if (!(await rowsOf('SELECT 1 FROM recepcion WHERE id=$1', [id])).length) return res.status(404).json({ error: 'La recepción aún no está guardada.' });
  if ((await rowsOf('SELECT count(*)::int AS n FROM recepcion_fotos WHERE recepcion=$1', [id]))[0].n >= MAX_FOTOS)
    return res.status(400).json({ error: `Máximo ${MAX_FOTOS} fotos por recepción.` });
  const r = await rowsOf('INSERT INTO recepcion_fotos(recepcion,nombre,tipo,datos,por) VALUES($1,$2,$3,$4,$5) RETURNING id', [id, String(nombre).slice(0, 120), tipo, buf, String(req.user.id)]);
  const rv = (await rowsOf('SELECT v.placa FROM recepcion r LEFT JOIN vehiculos v ON v.id=r.vehiculo WHERE r.id=$1', [id]))[0];
  await audit(pool, req.user, 'Agregó foto', 'recepcion', rv && rv.placa ? 'Vehículo ' + rv.placa : 'Recepción ' + id, 'Foto: ' + (String(nombre).slice(0, 80) || 'sin nombre'));
  res.json({ ok: true, id: r[0].id });
}));
app.get('/api/fotos/:id', auth, soloRoles('admin', 'recepcion', 'mecanico'), wrap(async (req, res) => {
  const r = (await rowsOf('SELECT tipo, datos FROM recepcion_fotos WHERE id=$1', [String(req.params.id)]))[0];
  if (!r) return res.status(404).json({ error: 'Foto no encontrada' });
  res.setHeader('Content-Type', r.tipo); res.setHeader('Cache-Control', 'private, max-age=86400'); res.send(r.datos);
}));
app.delete('/api/fotos/:id', auth, soloRoles('admin', 'recepcion'), wrap(async (req, res) => {
  const fo = (await rowsOf('SELECT f.nombre, v.placa, f.recepcion FROM recepcion_fotos f LEFT JOIN recepcion r ON r.id=f.recepcion LEFT JOIN vehiculos v ON v.id=r.vehiculo WHERE f.id=$1', [String(req.params.id)]))[0];
  await pool.query('DELETE FROM recepcion_fotos WHERE id=$1', [String(req.params.id)]);
  if (fo) await audit(pool, req.user, 'Eliminó foto', 'recepcion', fo.placa ? 'Vehículo ' + fo.placa : 'Recepción ' + fo.recepcion, 'Foto: ' + (fo.nombre || 'sin nombre'));
  res.json({ ok: true });
}));

app.use(express.static(path.join(__dirname, 'public')));
arranque().then(() => app.listen(PORT, '0.0.0.0', () => console.log('TallerGest en http://localhost:' + PORT + '  (BD: Postgres/Neon)')))
  .catch(e => { console.error('No se pudo iniciar (revisa DATABASE_URL):', e.message); process.exit(1); });
