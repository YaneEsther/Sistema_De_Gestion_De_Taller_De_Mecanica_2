/* PANTALLA · Usuarios y roles (solo administrador) */
pantalla('usuarios',{
 f:[['usuario','Usuario'],['nombre','Nombre completo'],['clave','Contraseña','password'],['rol','Rol','select',Object.keys(ROLES)],['estado','Estado','select',['Activo','Inactivo']]],
 /* No se repiten usuarios: se avisa mientras se escribe (ignora mayúsculas, tildes y espacios) */
 dup:['usuario',x=>`Ya existe el usuario «${x.usuario}». Elige otro nombre de usuario.`],
 extra:[['Sesión',r=>r.enLinea?'<span class="badge text-bg-success">En línea</span>':'<span class="text-muted small">—</span>']],
 preparar:d=>{if(!d.clave)delete d.clave},
 /* Siempre debe quedar al menos un administrador activo */
 validar:(lista,reg)=>lista.some(x=>x.rol==A&&x.estado=='Activo')?null:'Debe existir al menos un administrador activo. No se puede desactivar ni cambiar de rol al único administrador.',
 antesEliminar:(r,resto)=>r.id==u.id?'No puedes eliminar tu propio usuario.':(resto.some(x=>x.rol==A&&x.estado=='Activo')?null:'Debe existir al menos un administrador activo.')
});
