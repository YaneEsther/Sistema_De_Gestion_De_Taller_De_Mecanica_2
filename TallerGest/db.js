/* TallerGest – capa de base de datos (Postgres / Neon). Una tabla por modulo. */
const { Pool, types } = require('pg');
types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));      // NUMERIC -> number
types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));       // BIGINT -> number
types.setTypeParser(1082, v => v);                                         // DATE -> 'YYYY-MM-DD'
types.setTypeParser(1184, v => (v === null ? null : new Date(v).toISOString())); // TIMESTAMPTZ -> ISO

const URL_BD = process.env.DATABASE_URL;
if (!URL_BD) { console.error('Falta la variable DATABASE_URL (cadena de conexión de Neon).'); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(URL_BD);
const pool = new Pool({ connectionString: URL_BD, ssl: local ? false : { rejectUnauthorized: true }, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000 });
pool.on('error', e => console.error('Conexión inactiva cerrada por la BD (se reabre sola):', e.message));

/* Tipos: t=texto, n=numero decimal, i=entero, d=fecha, ts=fecha y hora, b=booleano, j=JSON */
const SQL_T = { t: 'TEXT', n: 'NUMERIC', i: 'INTEGER', d: 'DATE', ts: 'TIMESTAMPTZ', b: 'BOOLEAN', j: 'JSONB' };
const snake = k => k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
const AUD = [['por', 't'], ['porNombre', 't'], ['creado', 'ts']]; // quien y cuando lo creo (lo llena la app)

/* tabla -> columnas [clave, tipo, referencia?]. El orden respeta las dependencias (padres primero). */
const SCHEMA = {
  usuarios: { cols: [['usuario', 't'], ['nombre', 't'], ['rol', 't'], ['estado', 't'], ['hash', 't']] },
  clientes: { cols: [['nombre', 't'], ['telefono', 't'], ['correo', 't'], ['direccion', 't'], ...AUD] },
  vehiculos: { cols: [['placa', 't'], ['marca', 't'], ['modelo', 't'], ['anio', 'i'], ['cliente', 't', 'clientes'], ...AUD] },
  ordenes: { cols: [['codigo', 't'], ['cliente', 't', 'clientes'], ['vehiculo', 't', 'vehiculos'], ['estado', 't'], ['fecha', 'd'], ['motivo', 't'], ['actualizado', 'ts'], ...AUD] },
  historial: { cols: [['vehiculo', 't', 'vehiculos'], ['cliente', 't', 'clientes'], ['orden', 't', 'ordenes'], ['fecha', 'd'], ['servicio', 't'], ['km', 'i'], ['tecnico', 't'], ...AUD] },
  recepcion: { cols: [['cliente', 't', 'clientes'], ['vehiculo', 't', 'vehiculos'], ['orden', 't', 'ordenes'], ['fecha', 'd'], ['km', 'i'], ['obs', 't'], ...AUD] },
  diagnostico: { cols: [['orden', 't', 'ordenes'], ['vehiculo', 't', 'vehiculos'], ['resultado', 't'], ['hallazgos', 't'], ['necesidades', 'j'], ['otras', 't'], ...AUD] },
  mecanicos: { cols: [['orden', 't', 'ordenes'], ['mecanico', 't', 'usuarios'], ['fecha', 'd'], ...AUD] },
  servicios: { cols: [['descripcion', 't'], ['categoria', 't'], ['precio', 'n'], ...AUD] },
  repuestos: { cols: [['codigo', 't'], ['descripcion', 't'], ['stock', 'i'], ['precio', 'n'], ...AUD] },
  cotizaciones: { cols: [['orden', 't', 'ordenes'], ['descripcion', 't'], ['items', 'j'], ['subtotal', 'n'], ['itbis', 'n'], ['total', 'n'], ['estado', 't'], ['stockDesc', 'b'], ['nota', 't'], ...AUD] },
  aprobacion: { cols: [['cotizacion', 't', 'cotizaciones'], ['decision', 't'], ['fecha', 'd'], ['comentario', 't'], ...AUD] },
  ejecucion: { cols: [['orden', 't', 'ordenes'], ['etapa', 't'], ['notas', 't'], ...AUD] },
  facturacion: { cols: [['numero', 't'], ['orden', 't', 'ordenes'], ['descripcion', 't'], ['items', 'j'], ['subtotal', 'n'], ['itbis', 'n'], ['total', 'n'], ['fecha', 'd'], ...AUD] },
  pagos: { cols: [['factura', 't', 'facturacion'], ['monto', 'n'], ['metodo', 't'], ['fecha', 'd'], ['detalle', 't'], ['recibido', 'n'], ['devuelta', 'n'], ['marca', 't'], ['ultimos4', 't'], ['autorizacion', 't'], ['cuotas', 't'], ['banco', 't'], ['referencia', 't'], ['ncheque', 't'], ['notas', 't'], ...AUD] },
  auditoria: { cols: [['fecha', 't'], ['usuario', 't'], ['nombre', 't'], ['accion', 't'], ['modulo', 't'], ['registro', 't'], ['detalle', 't'], ['creado', 'ts']] },
  notif: { cols: [['para', 't', 'usuarios', 'CASCADE'], ['texto', 't'], ['fecha', 't'], ['leida', 'b']] },
  cierres: { cols: [['por', 't'], ['nombre', 't'], ['rol', 't'], ['desde', 'ts'], ['hasta', 'ts'], ['pagos', 'i'], ['total', 'n'], ['metodos', 'j'], ['resumen', 't']] },
  cfg: { cols: [['nombre', 't'], ['rnc', 't'], ['telefono', 't'], ['correo', 't'], ['direccion', 't'], ['pie', 't'], ['logo', 't']] }
};
const COLS = Object.keys(SCHEMA);
for (const t of COLS) {
  const s = SCHEMA[t]; s.map = {};
  s.cols.forEach(([k, ty]) => { s.map[k] = { sql: snake(k), ty }; });
}

function colDef([k, ty, ref, del]) {
  let d = `${snake(k)} ${SQL_T[ty]}`;
  if (k === 'creado') d += ' DEFAULT now()';
  if (ref) d += ` REFERENCES ${ref}(id) ON DELETE ${del || 'RESTRICT'}`;
  return d;
}
function ddl() {
  const out = ["CREATE SEQUENCE IF NOT EXISTS tg_seq START 1000"];
  for (const t of COLS) {
    const cols = SCHEMA[t].cols.map(colDef);
    out.push(`CREATE TABLE IF NOT EXISTS ${t}(
  id TEXT PRIMARY KEY DEFAULT nextval('tg_seq')::text,
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  ${cols.join(',\n  ')},
  extra JSONB NOT NULL DEFAULT '{}'
)`);
  }
  // Si se agregan columnas nuevas en versiones futuras, se crean solas en bases ya existentes
  for (const t of COLS) for (const c of SCHEMA[t].cols) out.push(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ${colDef(c)}`);
  out.push('CREATE UNIQUE INDEX IF NOT EXISTS usuarios_usuario_uq ON usuarios (lower(usuario))');
  out.push(`CREATE TABLE IF NOT EXISTS recepcion_fotos(
  id TEXT PRIMARY KEY DEFAULT nextval('tg_seq')::text,
  recepcion TEXT NOT NULL REFERENCES recepcion(id) ON DELETE CASCADE,
  nombre TEXT, tipo TEXT NOT NULL, datos BYTEA NOT NULL,
  por TEXT, creado TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
  out.push('CREATE INDEX IF NOT EXISTS recepcion_fotos_rec ON recepcion_fotos(recepcion)');
  out.push(`CREATE TABLE IF NOT EXISTS sesiones(
  id TEXT PRIMARY KEY,
  usuario TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT, agente TEXT
)`);
  out.push('CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones(usuario)');
  return out;
}
/* Reglas anti-duplicados (sin importar mayúsculas ni espacios). Si ya hay datos repetidos, avisa y sigue. */
const UNICOS = [
  'CREATE UNIQUE INDEX IF NOT EXISTS repuestos_desc_uq ON repuestos (lower(btrim(descripcion)))',
  'CREATE UNIQUE INDEX IF NOT EXISTS repuestos_codigo_uq ON repuestos (lower(btrim(codigo)))',
  'CREATE UNIQUE INDEX IF NOT EXISTS servicios_desc_uq ON servicios (lower(btrim(descripcion)))',
  "CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_placa_uq ON vehiculos (lower(regexp_replace(placa, '[[:space:]-]', '', 'g')))"
];
async function init() {
  for (const q of ddl()) await pool.query(q);
  for (const q of UNICOS) { try { await pool.query(q); } catch (e) { console.warn('AVISO: no se pudo crear una regla anti-duplicados (¿ya hay datos repetidos?):', e.message); } }
}

/* fila de la BD -> objeto JSON como lo espera el frontend (sin nulos) */
function aObjeto(t, row) {
  const o = { id: row.id };
  for (const [k, { sql }] of Object.entries(SCHEMA[t].map)) if (row[sql] !== null && row[sql] !== undefined) o[k] = row[sql];
  Object.assign(o, row.extra || {});
  return o;
}
function valor(ty, v, k) {
  if (v === undefined || v === null || v === '') return null;
  if (ty === 'n' || ty === 'i') { const n = Number(v); if (!Number.isFinite(n)) throw new Error(`El campo «${k}» debe ser un número.`); return ty === 'i' ? Math.round(n) : n; }
  if (ty === 'b') return v === true || v === 'true';
  if (ty === 'j') return JSON.stringify(v);
  return String(v);
}
/* objeto del frontend -> [columnas, valores]; lo que no es columna va a extra */
function aFila(t, rec) {
  const { map } = SCHEMA[t], cols = ['id'], vals = [String(rec.id)], extra = {};
  for (const [k, v] of Object.entries(rec)) {
    if (k === 'id') continue;
    if (map[k]) { cols.push(map[k].sql); vals.push(valor(map[k].ty, v, k)); }
    else extra[k] = v;
  }
  cols.push('extra'); vals.push(JSON.stringify(extra));
  return [cols, vals];
}
async function guardar(c, t, rec) {
  const [cols, vals] = aFila(t, rec);
  const ph = cols.map((_, i) => '$' + (i + 1)).join(',');
  const upd = cols.filter(x => x !== 'id').map(x => `${x}=EXCLUDED.${x}`).join(',');
  // Una columna 'creado' vacía no debe pisar la fecha por defecto al insertar
  await c.query(`INSERT INTO ${t}(${cols.join(',')}) VALUES(${ph}) ON CONFLICT(id) DO UPDATE SET ${upd}`, vals);
}
const MSG_UNICO = {
  repuestos_desc_uq: 'Ya existe un repuesto con esa descripción.',
  repuestos_codigo_uq: 'Ese código de repuesto ya existe. Cierra el formulario y vuelve a abrirlo para generar otro.',
  servicios_desc_uq: 'Ya existe un servicio con esa descripción.',
  vehiculos_placa_uq: 'Ya existe un vehículo con esa placa.',
  usuarios_usuario_uq: 'Ese nombre de usuario ya existe.'
};
const TABLAS = { clientes: 'clientes', vehiculos: 'vehículos', ordenes: 'órdenes de trabajo', historial: 'historial', recepcion: 'recepciones', diagnostico: 'diagnósticos', mecanicos: 'asignaciones de mecánico', cotizaciones: 'cotizaciones', aprobacion: 'aprobaciones', ejecucion: 'ejecuciones', facturacion: 'facturas', pagos: 'pagos', usuarios: 'usuarios', notif: 'notificaciones', recepcion_fotos: 'fotos de recepción' };
function traducir(e) {
  if (e.code === '23503') {
    const d = e.detail || '';
    const ref = d.match(/is still referenced from table "([^"]+)"/), falta = d.match(/is not present in table "([^"]+)"/);
    if (ref) return `No se puede eliminar: todavía hay ${TABLAS[ref[1]] || ref[1]} relacionados con este registro. Elimínalos primero.`;
    if (falta) return `Falta un dato relacionado: el registro de «${TABLAS[falta[1]] || falta[1]}» que elegiste ya no existe. Actualiza la página e inténtalo de nuevo.`;
    return 'Hay un problema con registros relacionados. Actualiza la página e inténtalo de nuevo.';
  }
  if (e.code === '23505') return MSG_UNICO[e.constraint] || 'Ya existe un registro con ese valor único.';
  if (e.code === '22007' || e.code === '22008') return 'Fecha no válida.';
  return e.message;
}

module.exports = { pool, SCHEMA, COLS, init, aObjeto, aFila, guardar, traducir, ddl };
