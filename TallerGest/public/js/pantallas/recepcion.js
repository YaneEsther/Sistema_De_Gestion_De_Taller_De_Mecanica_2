/* PANTALLA · Recepción del vehículo (cliente → vehículo, observaciones y fotos de evidencia; crea la orden de trabajo solo) */
pantalla('recepcion',{
 turno:true,clienteVehiculo:true,
 f:[['vehiculo','Vehículo','ref','vehiculos'],['fecha','Fecha','date'],['km','Kilometraje','number'],['obs','Observaciones','textarea']],
 extra:[['Orden',r=>r.orden?esc(nm('ordenes',r.orden)):'—'],['Fotos',r=>r.fotos&&r.fotos.length?`<span class="badge text-bg-secondary"><i class="bi bi-camera"></i> ${r.fotos.length}</span>`:'—']],
 pie:()=>fotosHTML(),
 alAbrir:r=>fotosBind(r),
 detalle:r=>`<h6 class="mt-3">Fotos del vehículo</h6>${galeriaFotos(r.fotos)||'<p class="text-muted mb-0">Sin fotos.</p>'}`,
 despues:(r,old,pr)=>{
  let msg;
  /* Al recibir un vehículo nuevo se abre la orden de trabajo automáticamente */
  if(!old&&!r.orden){const ahora=new Date().toISOString(),l=get('ordenes'),o={id:Date.now(),codigo:sig('ordenes','codigo','OT-'),cliente:r.cliente,vehiculo:r.vehiculo,estado:'Recibida',fecha:r.fecha,motivo:r.obs||'',por:u.id,porNombre:u.nombre,creado:ahora,actualizado:ahora};
   l.push(o);put('ordenes',l);const rl=get('recepcion');rl.find(y=>y.id==r.id).orden=o.id;put('recepcion',rl);
   log('Creó registro','ordenes',o.codigo,`Orden creada automáticamente al recibir el vehículo\nCliente: ${nm('clientes',r.cliente)}\nVehículo: ${nm('vehiculos',r.vehiculo)}`);
   msg='Se creó automáticamente la orden de trabajo '+o.codigo+' para este vehículo.'}
  /* Las fotos se suben cuando la recepción ya quedó guardada */
  if(FOTOS.nuevas.length){const fs=FOTOS.nuevas;FOTOS.nuevas=[];pr.then(ok=>ok&&subirFotos(r.id,fs))}
  return msg}
});
