# TallerGest – Sistema de Gestión de Taller Mecánico

Frontend (HTML + Bootstrap + JS) en `public/` y servidor **Node.js + Express + SQLite** en `server.js`.

## Correr en tu PC
1. Instala Node.js 20 o superior.
2. En la carpeta del proyecto: `npm install` y luego `npm start`.
3. Abre http://localhost:3000 — usuario `admin`, contraseña `admin123` (cámbiala en «Usuarios y roles»).
4. Para crear también usuarios de demostración (mecanico/mec123, recepcion/rec123, factura/fac123) ejecuta con `SEED_DEMO=1` la primera vez
   (en Windows PowerShell: `$env:SEED_DEMO=1; npm start`). Borra la carpeta `data/` para empezar de cero.

Los compañeros de la misma red Wi-Fi pueden entrar con `http://IP-de-tu-PC:3000`.

## Variables de entorno
| Variable | Uso |
|---|---|
| `JWT_SECRET` | Texto largo y secreto para firmar sesiones (obligatorio en producción) |
| `ADMIN_PASSWORD` | Contraseña del admin inicial (solo se usa si la BD está vacía) |
| `DB_PATH` | Ruta del archivo SQLite (en el hosting, dentro del volumen: `/data/tallergest.db`) |
| `SEED_DEMO` | `1` para crear usuarios de demostración al iniciar con BD vacía |
| `APP_TZ` | Zona horaria (por defecto `America/Santo_Domingo`) |

## Publicar en Railway (recomendado)
1. Sube la carpeta a un repositorio de GitHub (`.gitignore` ya excluye `node_modules` y `data`).
2. En railway.com: **New Project → Deploy from GitHub repo** y elige el repositorio.
3. En el servicio: **Settings → Volumes → Add Volume** con ruta de montaje `/data`.
4. En **Variables** agrega: `DB_PATH=/data/tallergest.db`, `JWT_SECRET=<texto largo aleatorio>`, `ADMIN_PASSWORD=<tu contraseña>`.
5. En **Settings → Networking → Generate Domain** para obtener la URL pública (HTTPS).
6. Entra con `admin` y la contraseña que pusiste; crea los usuarios del equipo.
**Importante:** sin volumen, la base de datos se borra en cada despliegue. Descarga respaldos desde Configuración → «Descargar respaldo».

## Trabajar en equipo
- Un repositorio en GitHub; cada compañero crea su rama, y los cambios se unen con pull requests.
- Cada vez que se hace push a la rama principal, Railway vuelve a desplegar.

## Seguridad: qué está y qué falta
Está: contraseñas con bcrypt, sesiones con token (12 h), límite de intentos de login, solo el admin gestiona usuarios,
protección del único administrador en el servidor, auditoría que el servidor firma con el usuario real.
Falta (siguiente etapa): permisos por rol en cada módulo dentro del servidor (hoy el control fino está en la interfaz),
y respaldos automáticos.