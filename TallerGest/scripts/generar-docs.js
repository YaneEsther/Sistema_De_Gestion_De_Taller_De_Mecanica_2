#!/usr/bin/env node
/* Genera la documentación del sistema en la carpeta docs/ (formato Mintlify: docs.json + páginas .mdx).
   Todo se lee del propio código, así que al cambiar el código basta con volver a ejecutar:  npm run docs*/
const fs = require('fs'), path = require('path'), vm = require('vm'), Module = require('module');
const RAIZ = path.join(__dirname, '..'), JS = path.join(RAIZ, 'public', 'js'), OUT = path.join(RAIZ, 'docs');

/* ---------- 1. Cargar el frontend y la base de datos sin navegador ni PostgreSQL ---------- */
const ctx = vm.createContext({ document: { body: { dataset: { m: 'docs' } } }, sessionStorage: { getItem: () => null }, localStorage: { getItem: () => null }, window: {}, console });
const leer = f => fs.readFileSync(path.join(JS, f), 'utf8');
const pantallas = fs.readdirSync(path.join(JS, 'pantallas')).filter(f => f.endsWith('.js')).sort();
for (const f of ['core/base.js', 'core/modulos.js', 'core/ayuda-datos.js', ...pantallas.map(p => 'pantallas/' + p)]) vm.runInContext(leer(f), ctx, { filename: f });
const dato = expr => vm.runInContext(expr, ctx);
const M = dato('M'), ROLES = dato('ROLES'), HELP = dato('HELP'), HELP_COMUN = dato('HELP_COMUN'), EST = dato('EST_AYUDA'), FLUJO = dato('FLUJO'), ESTADOS = dato('ESTADOS');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/docs';
const cargaOriginal = Module._load;
Module._load = function (r, ...a) { return r === 'pg' ? { Pool: class { on() {} }, types: { setTypeParser() {} } } : cargaOriginal.call(this, r, ...a); };
const { SCHEMA } = require(path.join(RAIZ, 'db.js'));
Module._load = cargaOriginal;

/* ---------- utilidades ---------- */
const mdx = s => String(s ?? '').replace(/[{}<>]/g, c => ({ '{': '&#123;', '}': '&#125;', '<': '&lt;', '>': '&gt;' }[c]));
const celda = s => mdx(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rolesTxt = rs => rs.map(r => ROLES[r]).join(', ');
const comentario = f => { const m = fs.readFileSync(f, 'utf8').match(/^\/\*\s*([\s\S]*?)\*\//); return m ? m[1].split('\n')[0].trim() : ''; };
const escribir = (rel, txt) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'); };
const pagina = (titulo, desc, cuerpo) => `---\ntitle: "${titulo.replace(/"/g, "'")}"\ndescription: "${String(desc).replace(/"/g, "'")}"\n---\n\n${cuerpo}`;
const slugRol = { admin: 'administrador', recepcion: 'recepcionista', mecanico: 'mecanico', facturador: 'facturador' };
fs.rmSync(OUT, { recursive: true, force: true });

/* ---------- 2. Páginas ---------- */
const mods = Object.entries(M);
const crudMods = mods.filter(([, m]) => !m.custom && m.f);
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));

escribir('index.mdx', pagina('TallerGest', 'Sistema de gestión para talleres mecánicos', `
**TallerGest** organiza el trabajo de un taller mecánico: desde que el cliente deja su vehículo hasta que paga la factura.
Versión ${pkg.version}. Servidor Node.js + Express, base de datos PostgreSQL (Neon) y una interfaz web con Bootstrap.

<CardGroup cols={2}>
  <Card title="Inicio rápido" icon="rocket" href="/inicio-rapido">Instálalo y ábrelo en tu computadora.</Card>
  <Card title="Flujo de una orden" icon="route" href="/flujo-de-una-orden">Del ingreso del vehículo al pago.</Card>
  <Card title="Guías por rol" icon="users" href="/guias/administrador">Paso a paso para cada tipo de usuario.</Card>
  <Card title="Referencia técnica" icon="code" href="/arquitectura">Arquitectura, base de datos y API.</Card>
</CardGroup>

## Qué incluye
${crudMods.map(([, m]) => `- **${mdx(m.t)}** — ${rolesTxt(m.r)}`).join('\n')}
${mods.filter(([, m]) => m.custom).map(([, m]) => `- **${mdx(m.t)}** — ${rolesTxt(m.r)}`).join('\n')}

## Roles
| Rol | Qué hace |
|---|---|
${Object.keys(ROLES).map(r => `| ${ROLES[r]} | ${celda(HELP[r === 'admin' ? 'admin' : r].r)} |`).join('\n')}
`));

escribir('inicio-rapido.mdx', pagina('Inicio rápido', 'Cómo instalar y ejecutar TallerGest', `
<Steps>
  <Step title="Crea la base de datos en Neon">
    Entra a neon.com, crea un proyecto y copia la cadena de conexión (botón *Connect*). Las tablas se crean solas al iniciar el servidor.
  </Step>
  <Step title="Configura el archivo .env">
    Copia \`.env.example\` como \`.env\` y completa \`DATABASE_URL\` (sin comillas y sin \`&channel_binding=require\`) y \`JWT_SECRET\` (un texto largo y secreto).
  </Step>
  <Step title="Instala y arranca">
    \`\`\`bash
    npm install
    npm start
    \`\`\`
  </Step>
  <Step title="Entra al sistema">
    Abre http://localhost:3000 con el usuario \`admin\` y la contraseña definida en \`ADMIN_PASSWORD\` (por defecto \`admin123\`; cámbiala en *Usuarios y roles*).
  </Step>
</Steps>

<Warning>Nunca subas el archivo \`.env\` a GitHub: contiene la contraseña de tu base de datos.</Warning>

## Variables de entorno
| Variable | Uso |
|---|---|
| \`DATABASE_URL\` | Cadena de conexión de Neon (obligatoria) |
| \`JWT_SECRET\` | Texto secreto para firmar las sesiones (obligatorio en producción) |
| \`ADMIN_PASSWORD\` | Contraseña del administrador inicial (solo si no hay usuarios) |
| \`SEED_DEMO\` | \`1\` crea usuarios de demostración con la base vacía |
| \`APP_TZ\` | Zona horaria (por defecto \`America/Santo_Domingo\`) |

## Publicar el servidor
Sube el proyecto a GitHub y despliégalo en Render, Railway o similar (Node 20+, comando \`npm start\`). Los datos y las fotos viven en Neon, así que no necesitas disco persistente: solo agrega las variables de arriba en el panel del hosting.
`));

escribir('conceptos.mdx', pagina('Conceptos clave', 'Turnos, auditoría, sesiones y otras ideas del sistema', `
## Turno
El turno de cada usuario empieza en su **último cierre** o a las **00:00 del día**, lo que sea más reciente. El inicio muestra lo que registraste en el turno, y la mayoría de las tablas permiten filtrar «Solo mis registros de este turno». Al cerrar turno (o al cambiar de día) todo vuelve a empezar. Facturación y administración cierran con el **cierre de caja** en *Reportes*.

## Auditoría
Cada alta, cambio o eliminación guarda quién lo hizo, sobre qué registro y qué datos cambiaron (valor anterior → valor nuevo). También se registran los cambios automáticos de estado, los descuentos de stock, las fotos y los accesos (incluidos los fallidos).

## Sesión única
Un usuario solo puede tener una sesión activa a la vez. Si intenta entrar desde otro dispositivo o pestaña, se le avisa y puede elegir cerrar la otra sesión. Una sesión sin actividad por 3 minutos deja de bloquear nuevos inicios.

## Listas con buscador
Los campos de cliente, vehículo, orden, factura y similares se llenan escribiendo parte del nombre, la placa o el número.

## Paginación
Las tablas muestran 10 registros por defecto; se puede elegir 5, 10, 25, 50 o 100 y la elección se recuerda por pantalla.

## Sin duplicados
No se permiten repetidos (sin importar mayúsculas, tildes ni espacios) en: ${crudMods.filter(([, m]) => m.dup).map(([k, m]) => `${mdx(m.t)} (${m.f.find(f => f[0] === m.dup[0])[1]})`).join(', ')}.

## Fotos de recepción
Se aceptan JPG, PNG y WebP (GIF y BMP se convierten). No se aceptan PDF, videos ni HEIC/HEIF. Máximo 12 por recepción; se reducen a 1280 px en el navegador.
`));

escribir('flujo-de-una-orden.mdx', pagina('Flujo de una orden', 'Estados y responsables de cada paso', `
Una orden de trabajo se crea sola al recibir el vehículo y avanza únicamente hacia adelante.

## Pasos y responsables
| # | Paso | Módulo | Responsable |
|---|---|---|---|
${FLUJO.map((s, i) => `| ${i + 1} | ${s[0]} | ${mdx(M[s[1]].t)} | ${rolesTxt(s[2])} |`).join('\n')}

## Estados
| Estado | Significado |
|---|---|
${EST.map(e => `| ${e[0]} | ${celda(e[1])} |`).join('\n')}

\`\`\`mermaid
flowchart LR
${ESTADOS.map((e, i) => i < ESTADOS.length - 1 ? `  E${i}["${e}"] --> E${i + 1}["${ESTADOS[i + 1]}"]` : '').filter(Boolean).join('\n')}
\`\`\`
`));

escribir('roles-y-permisos.mdx', pagina('Roles y permisos', 'Qué módulos ve cada rol', `
| Módulo | ${Object.values(ROLES).join(' | ')} |
|---|${Object.keys(ROLES).map(() => ':-:').join('|')}|
${mods.map(([k, m]) => `| ${mdx(m.t)} | ${Object.keys(ROLES).map(r => m.r.includes(r) ? (m.soloLectura && m.soloLectura.includes(r) ? 'Solo ver' : m.ro ? 'Solo ver' : '✔') : '').join(' | ')} |`).join('\n')}

<Note>«Solo ver» significa que puede abrir el detalle de los registros pero no crearlos, editarlos ni eliminarlos. El mecánico solo ve las órdenes que le asignaron.</Note>
`));

for (const r of Object.keys(ROLES)) {
  const h = HELP[r];
  escribir(`guias/${slugRol[r]}.mdx`, pagina('Guía: ' + ROLES[r], h.r, `
## ¿Cómo hago...?
<AccordionGroup>
${h.t.map(([t, pasos]) => `  <Accordion title="${t.replace(/"/g, "'")}">\n    <Steps>\n${pasos.map(p => `      <Step title="${mdx(p).replace(/"/g, "'")}" />`).join('\n')}\n    </Steps>\n  </Accordion>`).join('\n')}
</AccordionGroup>

## Preguntas frecuentes
<AccordionGroup>
${[...h.q, ...HELP_COMUN].map(([q, a]) => `  <Accordion title="${q.replace(/"/g, "'")}">\n    ${mdx(a)}\n  </Accordion>`).join('\n')}
</AccordionGroup>
`));
}

for (const [k, m] of mods) {
  const tipo = f => f[2] === 'number' ? 'Número' : f[2] === 'date' ? 'Fecha' : f[2] === 'textarea' ? 'Texto largo' : f[2] === 'password' ? 'Contraseña' : f[2] === 'ref' ? `Relación con «${mdx((M[f[3]] || {}).t || f[3])}»` : f[2] === 'select' ? 'Lista' : f[2] === 'tel' ? 'Teléfono' : f[2] === 'email' ? 'Correo' : 'Texto';
  const archivo = path.join(JS, 'pantallas', k + '.js');
  const desc = fs.existsSync(archivo) ? comentario(archivo).replace(/^PANTALLA ·\s*/, '') : '';
  const tareas = Object.keys(ROLES).flatMap(r => HELP[r].t.filter(([t, p]) => p.some(x => x.includes('«' + m.t + '»'))).map(([t, p]) => ({ r, t, p })));
  const reglas = [];
  if (m.dup) reglas.push(`No permite repetidos en **${m.f.find(f => f[0] === m.dup[0])[1]}** (ignora mayúsculas, tildes y espacios).`);
  if (m.ro) reglas.push('Solo lectura para todos los roles.');
  if (m.soloLectura) reglas.push(`Solo lectura para: ${rolesTxt(m.soloLectura)}.`);
  if (m.turno) reglas.push('Permite filtrar «Solo mis registros de este turno».');
  if (m.clienteVehiculo) reglas.push('El cliente se elige escribiendo su nombre y luego se elige uno de sus vehículos (se puede registrar otro vehículo desde el mismo formulario).');
  if (m.despues) reglas.push('Al guardar dispara acciones automáticas (cambio de estado de la orden, avisos a otros roles, stock o historial).');
  if (m.antesEliminar) reglas.push('Valida antes de eliminar (no se borra si hay registros relacionados).');
  if (m.pie || m.cuerpo || m.alAbrir) reglas.push('Su formulario incluye secciones especiales además de los campos básicos.');
  const campos = m.f ? `## Campos\n| Campo | Tipo | Detalle |\n|---|---|---|\n${m.f.map(f => `| ${celda(f[1])} | ${tipo(f)} | ${f[2] === 'select' ? celda(f[3].map(o => ROLES[o] || o).join(', ')) : ''} |`).join('\n')}\n` : '';
  escribir(`modulos/${k}.mdx`, pagina(m.t, desc || 'Pantalla del sistema', `
<Info>Acceso: ${rolesTxt(m.r)}</Info>

${campos}
${reglas.length ? '## Reglas\n' + reglas.map(x => '- ' + x).join('\n') + '\n' : ''}
${tareas.length ? '## Cómo se usa\n' + tareas.map(t => `### ${mdx(t.t)} · ${ROLES[t.r]}\n${t.p.map((p, i) => `${i + 1}. ${mdx(p)}`).join('\n')}`).join('\n\n') : ''}
`));
}

/* Arquitectura: se lista cada archivo con la primera línea de su comentario */
const arch = dir => fs.readdirSync(path.join(JS, dir)).filter(f => f.endsWith('.js')).sort().map(f => `| \`js/${dir}/${f}\` | ${celda(comentario(path.join(JS, dir, f)))} |`).join('\n');
escribir('arquitectura.mdx', pagina('Arquitectura', 'Cómo está organizado el código', `
## Vista general
\`\`\`mermaid
flowchart LR
  N["Navegador (HTML + Bootstrap + JS)"] -->|"/api con token"| S["server.js (Express)"]
  S --> D["db.js"]
  D --> P[("PostgreSQL en Neon")]
\`\`\`

## Backend
| Archivo | Función |
|---|---|
| \`server.js\` | ${celda(comentario(path.join(RAIZ, 'server.js')))} |
| \`db.js\` | ${celda(comentario(path.join(RAIZ, 'db.js')))} |
| \`loadenv.js\` | ${celda(comentario(path.join(RAIZ, 'loadenv.js')))} |
| \`scripts/generar-docs.js\` | Genera esta documentación |

## Frontend
Cada página HTML carga \`js/cargador.js\`, que incluye el núcleo (\`js/core\`), luego **el archivo de esa pantalla** (\`js/pantallas/<pagina>.js\`) y por último el arranque. Para modificar una pantalla, busca su archivo con el mismo nombre que la página.

### Núcleo (\`js/core\`)
| Archivo | Función |
|---|---|
${arch('core')}

### Pantallas (\`js/pantallas\`)
| Archivo | Función |
|---|---|
${arch('pantallas')}

## Cómo se define una pantalla
Las pantallas de registros se configuran con \`pantalla('<modulo>', { ... })\` y el motor de \`core/crud.js\` aporta la tabla, el buscador, la paginación, el formulario y el detalle. Opciones disponibles:

\`\`\`text
${(fs.readFileSync(path.join(JS, 'core', 'crud.js'), 'utf8').match(/Cada pantalla[\s\S]*?\*\//) || [''])[0].replace(/\*\/$/, '').trim()}
\`\`\`
`));

/* Base de datos */
const tipoSql = { t: 'texto', n: 'decimal', i: 'entero', d: 'fecha', ts: 'fecha y hora', b: 'sí/no', j: 'JSON' };
const snake = k => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const rel = [];
Object.entries(SCHEMA).forEach(([t, s]) => s.cols.forEach(([k, , ref]) => { if (ref) rel.push([ref, t, k]); }));
escribir('base-de-datos.mdx', pagina('Base de datos', 'Tablas y relaciones en PostgreSQL', `
Cada módulo tiene su propia tabla. Todas incluyen \`id\` (texto, se genera solo si se inserta a mano), \`seq\` (orden de inserción) y \`extra\` (JSON con datos adicionales). Las tablas se crean y se actualizan solas al iniciar el servidor.

\`\`\`mermaid
erDiagram
${rel.map(([p, h, c]) => `  ${p} ||--o{ ${h} : "${snake(c)}"`).join('\n')}
\`\`\`

${Object.entries(SCHEMA).map(([t, s]) => `## ${t}\n| Columna | Tipo | Relación |\n|---|---|---|\n${s.cols.map(([k, ty, ref, del]) => `| \`${snake(k)}\` | ${tipoSql[ty]} | ${ref ? `→ \`${ref}\`${del === 'CASCADE' ? ' (se borra en cascada)' : ''}` : ''} |`).join('\n')}\n`).join('\n')}

## recepcion_fotos
Fotos de la recepción: \`recepcion\` (→ \`recepcion\`, en cascada), \`nombre\`, \`tipo\`, \`datos\` (imagen), \`por\`, \`creado\`.

## sesiones
Una fila por sesión activa: \`usuario\` (→ \`usuarios\`, en cascada), \`creado\`, \`ultima\` (último movimiento), \`ip\`, \`agente\`. Garantiza una sola sesión por usuario.
`));

/* API: se leen las rutas de server.js */
const srv = fs.readFileSync(path.join(RAIZ, 'server.js'), 'utf8');
const DESC = { 'POST /api/login': 'Inicia sesión (409 si ya hay una sesión activa; `forzar: true` cierra la anterior)', 'POST /api/logout': 'Cierra la sesión actual', 'GET /api/data': 'Devuelve todos los módulos que puede ver el usuario', 'POST /api/data/:col': 'Guarda cambios `{up:[...], del:[ids]}` de un módulo', 'POST /api/recepcion/:id/fotos': 'Sube una foto (JPG, PNG o WebP, máx. 3 MB)', 'GET /api/fotos/:id': 'Devuelve la imagen de una foto', 'DELETE /api/fotos/:id': 'Elimina una foto' };
const rutas = [...srv.matchAll(/app\.(get|post|put|delete)\('(\/api[^']*)',([^\n]*)/g)].map(m => {
  const roles = (m[3].match(/soloRoles\(([^)]*)\)/) || [])[1];
  const acceso = roles ? roles.replace(/'/g, '').split(',').map(x => ROLES[x.trim()] || x.trim()).join(', ') : /\bauth\b/.test(m[3]) ? 'Cualquier usuario con sesión' : 'Público';
  return `| \`${m[1].toUpperCase()}\` | \`${m[2]}\` | ${acceso} | ${celda(DESC[m[1].toUpperCase() + ' ' + m[2]] || '')} |`;
});
escribir('api.mdx', pagina('API', 'Endpoints del servidor', `
Todas las rutas (salvo el login) requieren el encabezado \`Authorization: Bearer <token>\`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
${rutas.join('\n')}

<Note>Los módulos de \`/api/data/:col\` son: ${Object.keys(SCHEMA).map(t => '`' + t + '`').join(', ')}. Algunos solo los puede escribir el administrador (\`usuarios\`, \`cfg\`).</Note>
`));

escribir('seguridad.mdx', pagina('Seguridad', 'Cómo se protege el sistema', `
- **Contraseñas** guardadas con bcrypt (nunca en texto plano).
- **Sesiones** con token firmado (JWT, 12 horas) ligado a una sesión en la base de datos: al cerrar o reemplazar la sesión, el token deja de servir.
- **Una sola sesión** por usuario.
- **Límite de intentos** de inicio de sesión por dirección IP.
- **Roles**: el servidor valida el rol en las operaciones sensibles (usuarios, configuración, fotos); el resto del control fino está en la interfaz.
- **Auditoría** de cambios y accesos, solo visible para el administrador.
- **Secretos** en variables de entorno (\`.env\` no se sube al repositorio).
`));

/* Configuración del sitio */
const grupo = (g, p) => ({ group: g, pages: p });
fs.writeFileSync(path.join(OUT, 'docs.json'), JSON.stringify({
  $schema: 'https://mintlify.com/docs.json', theme: 'mint', name: 'TallerGest', description: 'Documentación de TallerGest, sistema de gestión para talleres mecánicos',
  colors: { primary: '#1E3A6D', light: '#D18B00', dark: '#1E3A6D' },
  navigation: { groups: [
    grupo('Primeros pasos', ['index', 'inicio-rapido', 'conceptos', 'flujo-de-una-orden', 'roles-y-permisos']),
    grupo('Guías por rol', Object.keys(ROLES).map(r => 'guias/' + slugRol[r])),
    grupo('Módulos', mods.map(([k]) => 'modulos/' + k)),
    grupo('Referencia técnica', ['arquitectura', 'base-de-datos', 'api', 'seguridad'])
  ] }
}, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'README.md'), `# Documentación de TallerGest

Esta carpeta se genera sola con \`npm run docs\` (no la edites a mano: se sobrescribe).

- Ver como sitio web: \`cd docs && npx mint dev\` (abre http://localhost:3000).
- Publicarla: conecta el repositorio en mintlify.com y apunta a la carpeta \`docs\`.
`);
const n = fs.readdirSync(OUT, { recursive: true }).filter(f => f.endsWith('.mdx')).length;
console.log(`Documentación generada en docs/ (${n} páginas).`);
