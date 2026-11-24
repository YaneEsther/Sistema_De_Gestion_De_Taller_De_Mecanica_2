/* PANTALLA · Asignación de mecánicos (solo órdenes «Recibida»; el mecánico recibe un aviso) */
pantalla('mecanicos',{
 turno:true,
 f:[['orden','Orden de trabajo','ref','ordenes',o=>o.estado=='Recibida'],['mecanico','Mecánico','ref','usuarios',x=>x.rol==ME&&x.estado=='Activo'],['fecha','Fecha de asignación','date']],
 despues:(r,old)=>{if(!old||old.mecanico!=r.mecanico||old.orden!=r.orden)notif(r.mecanico,`Se te asignó la orden ${nm('ordenes',r.orden)} · Cliente: ${clienteDeOrden(get('ordenes').find(o=>o.id==r.orden))}`)}
});
