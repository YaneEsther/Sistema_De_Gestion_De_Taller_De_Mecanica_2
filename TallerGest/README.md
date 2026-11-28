# TallerGest – Sistema de Gestión de Taller Mecánico

Frontend (HTML + Bootstrap + JavaScript) en `public/` y servidor **Node.js + Express + Postgres (Neon)**.
Cada módulo tiene su propia tabla, así que también puedes consultar o insertar datos directamente en el editor SQL de Neon.

**Documentación completa:** carpeta `docs/` (se genera sola con `npm run docs`, ver más abajo).

## 1. Base de datos en Neon
1. En neon.com crea un proyecto y copia la **connection string** (botón *Connect*).
2. Quita `&channel_binding=require` del final si te da error. Las tablas se crean solas al iniciar el servidor.

## 2. Correr en tu PC
1. Copia `.env.example` como `.env` y completa `DATABASE_URL` y `JWT_SECRET`.
2. En la terminal de la carpeta del proyecto:
```
npm install
npm start
```
3. Abre http://localhost:3000 → usuario `admin`, contraseña `admin123` (o la de `ADMIN_PASSWORD`). Cámbiala en «Usuarios y roles».


| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon (obligatoria) |
| `JWT_SECRET` | Texto largo y secreto para firmar sesiones (obligatorio en producción) |
| `ADMIN_PASSWORD` | Contraseña del admin inicial (solo si no hay usuarios) |
| `SEED_DEMO` | `1` crea usuarios de demostración con la BD vacía |
| `APP_TZ` | Zona horaria (por defecto `America/Santo_Domingo`) |

## 3. Cómo está organizado el código
```
server.js, db.js, loadenv.js     servidor, esquema de tablas y lectura del .env
scripts/generar-docs.js          genera la documentación
public/*.html                    una página por pantalla (solo cargan js/cargador.js)
public/js/core/                  núcleo compartido (datos, tabla/formulario, paginación, listas con buscador, fotos...)
public/js/pantallas/             UN ARCHIVO POR PANTALLA: clientes.js, recepcion.js, pagos.js, ...
```
**Para modificar una pantalla, abre el archivo con el mismo nombre que la página** (por ejemplo `pantallas/diagnostico.js`).
Las pantallas de registros se definen con `pantalla('<modulo>', { campos, reglas, ... })` y el motor `core/crud.js` aporta
tabla, buscador, paginación, formulario y detalle. Las opciones disponibles están documentadas al inicio de `core/crud.js`


## 4. Qué hace el sistema (resumen)
- **Auditoría detallada:** quién hizo qué, sobre qué registro y qué datos cambiaron (antes → después).
- **Centro de ayuda por rol** (el administrador ve la de todos).
- **Paginación** en todas las tablas (10 por defecto; 5, 10, 25, 50 o 100) y botón «ojo» para ver el detalle en solo lectura.
- **Listas con buscador** para elegir cliente, vehículo, orden, factura..., un cliente puede tener varios vehículos y se puede registrar otro desde la recepción.
- **Notas compartidas:** el mecánico y el facturador ven las notas de la orden, la cotización y lo que dijo el cliente al aprobar.
- **El mecánico pide repuestos en el diagnóstico** y quien cotiza los carga con un clic.
- **Ejecución:** solo órdenes y etapas que corresponden al estado actual.
- **Turnos:** conteos del inicio, filtro «mis registros de este turno» y cierre de turno/caja, se reinician al cerrar o al cambiar de día.
- **Sesión única** por usuario, sin repetidos (usuarios, repuestos, servicios, placas, facturas) y control de stock.
- **Fotos de recepción** (JPG, PNG, WebP; hasta 12) como evidencia del estado del vehículo.

## 5. Documentación automática (estilo Mintlify)
```
npm run docs
```
Regenera la carpeta `docs/` leyendo el propio código: módulos, campos, roles, reglas, guías por rol, tablas de la base de datos y endpoints de la API.
Para verla como sitio web: `cd docs && npx mint dev`, o conecta el repositorio en mintlify.com apuntando a la carpeta `docs`.
Si cambias el código o los textos de ayuda (`public/js/core/ayuda-datos.js`), vuelve a ejecutar `npm run docs`.
