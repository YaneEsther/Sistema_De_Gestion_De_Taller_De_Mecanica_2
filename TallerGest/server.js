/* TallerGest – servidor (Express + Postgres/Neon). Sirve el frontend de /public y la API /api */
const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), path = require('path'), crypto = require('crypto');
const { pool, SCHEMA, COLS, init, aObjeto, guardar, traducir } = require('./db');

const PORT = process.env.PORT || 3000;
const TZ = process.env.APP_TZ || 'America/Santo_Domingo';
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('AVISO: define JWT_SECRET; sin él las sesiones se cierran al reiniciar.');
const MAX_FOTOS = 12, MAX_FOTO_BYTES = 3 * 1024 * 1024, TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

const pub = u => { const { hash, clave, ...r } = u; return r; };
const ahora = () => new Date().toLocaleString('es-DO', { timeZone: TZ });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => { console.error(e); res.status(500).json({ error: traducir(e) }); });
const rowsOf = async (sql, p = []) => (await pool.query(sql, p)).rows;
const getUser = async id => { const r = await rowsOf('SELECT * FROM usuarios WHERE id=$1', [String(id)]); return r[0] ? aObjeto('usuarios', r[0]) : null; };
const audit = (c, u, accion, modulo) => guardar(c, 'auditoria', { id: Date.now() + '-' + crypto.randomInt(1000), fecha: ahora(), usuario: u.usuario, nombre: u.nombre, accion, modulo });

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

const auth = wrap(async (req, res, next) => {
  try {
    const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET), u = await getUser(p.id);
    if (!u || u.estado !== 'Activo') throw new Error('x');
    req.user = u;
  } catch (e) { return res.status(401).json({ error: 'Sesión no válida' }); }
  next();
});
const soloRoles = (...r) => (req, res, next) => r.includes(req.user.rol) ? next() : res.status(403).json({ error: 'No tienes permiso para esto.' });

const fails = new Map();
app.post('/api/login', wrap(async (req, res) => {
  const ip = req.ip, f = fails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 600000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 8) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  const { usuario = '', clave = '' } = req.body || {};
  const r = await rowsOf('SELECT * FROM usuarios WHERE lower(usuario)=lower($1)', [String(usuario).trim()]), u = r[0] && aObjeto('usuarios', r[0]);
  if (!u || !bcrypt.compareSync(String(clave), u.hash || '')) { f.n++; fails.set(ip, f); return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); }
  if (u.estado !== 'Activo') return res.status(403).json({ error: 'Tu usuario está inactivo. Contacta al administrador.' });
  fails.delete(ip);
  await audit(pool, u, 'Inicio de sesión', 'Login');
  res.json({ token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '12h' }), user: pub(u) });
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
  if (!TIPOS_FOTO.includes(tipo)) return res.status(400).json({ error: 'Solo se permiten imágenes JPG, PNG o WebP.' });
  const buf = Buffer.from(String(datos).replace(/^data:[^,]+,/, ''), 'base64');
  if (!buf.length) return res.status(400).json({ error: 'Imagen vacía.' });
  if (buf.length > MAX_FOTO_BYTES) return res.status(400).json({ error: 'La imagen es demasiado grande (máx. 3 MB).' });
  if (!(await rowsOf('SELECT 1 FROM recepcion WHERE id=$1', [id])).length) return res.status(404).json({ error: 'La recepción aún no está guardada.' });
  if ((await rowsOf('SELECT count(*)::int AS n FROM recepcion_fotos WHERE recepcion=$1', [id]))[0].n >= MAX_FOTOS)
    return res.status(400).json({ error: `Máximo ${MAX_FOTOS} fotos por recepción.` });
  const r = await rowsOf('INSERT INTO recepcion_fotos(recepcion,nombre,tipo,datos,por) VALUES($1,$2,$3,$4,$5) RETURNING id', [id, String(nombre).slice(0, 120), tipo, buf, String(req.user.id)]);
  await audit(pool, req.user, 'Subió foto de recepción', 'recepcion');
  res.json({ ok: true, id: r[0].id });
}));
app.get('/api/fotos/:id', auth, soloRoles('admin', 'recepcion'), wrap(async (req, res) => {
  const r = (await rowsOf('SELECT tipo, datos FROM recepcion_fotos WHERE id=$1', [String(req.params.id)]))[0];
  if (!r) return res.status(404).json({ error: 'Foto no encontrada' });
  res.setHeader('Content-Type', r.tipo); res.setHeader('Cache-Control', 'private, max-age=86400'); res.send(r.datos);
}));
app.delete('/api/fotos/:id', auth, soloRoles('admin', 'recepcion'), wrap(async (req, res) => {
  await pool.query('DELETE FROM recepcion_fotos WHERE id=$1', [String(req.params.id)]);
  await audit(pool, req.user, 'Eliminó foto de recepción', 'recepcion');
  res.json({ ok: true });
}));

/* Respaldo en JSON de todas las tablas (las fotos no se incluyen; Neon también guarda historial de restauración) */
app.get('/api/respaldo', auth, soloRoles('admin'), wrap(async (req, res) => {
  const out = {};
  for (const c of COLS) out[c] = (await rowsOf(`SELECT * FROM ${c} ORDER BY seq`)).map(r => aObjeto(c, r));
  res.setHeader('Content-Disposition', 'attachment; filename="tallergest-respaldo.json"');
  res.json(out);
}));

app.use(express.static(path.join(__dirname, 'public')));
arranque().then(() => app.listen(PORT, '0.0.0.0', () => console.log('TallerGest en http://localhost:' + PORT + '  (BD: Postgres/Neon)')))
  .catch(e => { console.error('No se pudo iniciar (revisa DATABASE_URL):', e.message); process.exit(1); });
