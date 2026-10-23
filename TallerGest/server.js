/* TallerGest – servidor (Express + SQLite). Sirve el frontend de /public y la API /api */
const express = require('express'), Database = require('better-sqlite3'), bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'), path = require('path'), fs = require('fs'), crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'tallergest.db');
const TZ = process.env.APP_TZ || 'America/Santo_Domingo';
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('AVISO: define JWT_SECRET; sin él las sesiones se cierran al reiniciar.');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS registros(col TEXT NOT NULL, id TEXT NOT NULL, datos TEXT NOT NULL, PRIMARY KEY(col,id))');

const COLS = ['clientes','vehiculos','historial','recepcion','diagnostico','ordenes','mecanicos','servicios','repuestos',
  'cotizaciones','aprobacion','ejecucion','facturacion','pagos','usuarios','auditoria','notif','cierres','cfg'];
const qAll = db.prepare('SELECT datos FROM registros WHERE col=? ORDER BY rowid');
const qOne = db.prepare('SELECT datos FROM registros WHERE col=? AND id=?');
const qUp = db.prepare('INSERT INTO registros(col,id,datos) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET datos=excluded.datos');
const qDel = db.prepare('DELETE FROM registros WHERE col=? AND id=?');
const all = c => qAll.all(c).map(r => JSON.parse(r.datos));
const one = (c, id) => { const r = qOne.get(c, String(id)); return r ? JSON.parse(r.datos) : null; };
const pub = u => { const { hash, clave, ...r } = u; return r; };
const ahora = () => new Date().toLocaleString('es-DO', { timeZone: TZ });

/* Usuario inicial (solo si no hay usuarios). Cambia la contraseña al entrar. */
if (!all('usuarios').length) {
  const pass = process.env.ADMIN_PASSWORD || 'admin123';
  qUp.run('usuarios', '1', JSON.stringify({ id: 1, usuario: 'admin', nombre: 'Administrador', rol: 'admin', estado: 'Activo', hash: bcrypt.hashSync(pass, 10) }));
  if (process.env.SEED_DEMO === '1') {
    [[2,'mecanico','Carlos Díaz','mecanico','mec123'],[3,'recepcion','María López','recepcion','rec123'],[4,'factura','Ana Torres','facturador','fac123']]
      .forEach(([id, usuario, nombre, rol, p]) => qUp.run('usuarios', String(id), JSON.stringify({ id, usuario, nombre, rol, estado: 'Activo', hash: bcrypt.hashSync(p, 10) })));
  }
  console.log('Usuario inicial creado: admin' + (process.env.ADMIN_PASSWORD ? '' : ' / admin123 (¡cámbiala!)'));
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

function auth(req, res, next) {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    const p = jwt.verify(t, SECRET), u = one('usuarios', p.id);
    if (!u || u.estado !== 'Activo') throw new Error('x');
    req.user = u; next();
  } catch { res.status(401).json({ error: 'Sesión no válida' }); }
}

const fails = new Map();
app.post('/api/login', (req, res) => {
  const ip = req.ip, f = fails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 600000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 8) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  const { usuario = '', clave = '' } = req.body || {};
  const u = all('usuarios').find(x => String(x.usuario).toLowerCase() === String(usuario).trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(clave), u.hash || '')) { f.n++; fails.set(ip, f); return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); }
  if (u.estado !== 'Activo') return res.status(403).json({ error: 'Tu usuario está inactivo. Contacta al administrador.' });
  fails.delete(ip);
  const a = { id: Date.now() + '-' + crypto.randomInt(1000), fecha: ahora(), usuario: u.usuario, nombre: u.nombre, accion: 'Inicio de sesión', modulo: 'Login' };
  qUp.run('auditoria', a.id, JSON.stringify(a));
  res.json({ token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '12h' }), user: pub(u) });
});

app.get('/api/data', auth, (req, res) => {
  const adm = req.user.rol === 'admin', out = {};
  for (const c of COLS) {
    let a = all(c);
    if (c === 'usuarios') a = a.map(pub);
    else if (c === 'auditoria') a = adm ? a.reverse().slice(0, 500) : [];
    else if (c === 'notif') a = a.filter(x => String(x.para) === String(req.user.id)).reverse();
    else if (c === 'cierres' && !adm) a = a.filter(x => String(x.por) === String(req.user.id));
    out[c] = a;
  }
  res.json(out);
});

app.post('/api/data/:col', auth, (req, res) => {
  const c = req.params.col, u = req.user, adm = u.rol === 'admin';
  if (!COLS.includes(c)) return res.status(404).json({ error: 'Colección desconocida' });
  if ((c === 'usuarios' || c === 'cfg') && !adm) return res.status(403).json({ error: 'Solo el administrador puede hacer esto.' });
  const up = Array.isArray(req.body.up) ? req.body.up : [], del = Array.isArray(req.body.del) ? req.body.del : [];
  try {
    db.transaction(() => {
      for (const r of up) {
        if (!r || r.id === undefined || r.id === '') throw new Error('Registro sin id');
        const id = String(r.id); const rec = { ...r };
        if (c === 'usuarios') {
          const prev = one('usuarios', id);
          if (!rec.usuario || !rec.nombre || !rec.rol) throw new Error('Faltan datos del usuario.');
          if (all('usuarios').some(x => String(x.id) !== id && String(x.usuario).toLowerCase() === String(rec.usuario).toLowerCase())) throw new Error('Ese nombre de usuario ya existe.');
          if (rec.clave) rec.hash = bcrypt.hashSync(String(rec.clave), 10);
          else if (prev) rec.hash = prev.hash;
          else throw new Error('La contraseña es obligatoria.');
          delete rec.clave;
        }
        if (c === 'auditoria') { if (one(c, id)) continue; rec.usuario = u.usuario; rec.nombre = u.nombre; }
        qUp.run(c, id, JSON.stringify(rec));
      }
      if (c !== 'auditoria') for (const id of del) {
        if (c === 'usuarios' && String(id) === String(u.id)) throw new Error('No puedes eliminar tu propio usuario.');
        qDel.run(c, String(id));
      }
      if (c === 'usuarios' && !all('usuarios').some(x => x.rol === 'admin' && x.estado === 'Activo'))
        throw new Error('Debe existir al menos un administrador activo.');
    })();
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/respaldo', auth, (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo el administrador.' });
  db.pragma('wal_checkpoint(TRUNCATE)');
  res.download(DB_PATH, 'tallergest-respaldo.db');
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log('TallerGest en http://localhost:' + PORT + '  (BD: ' + DB_PATH + ')'));