/* PANTALLA · Órdenes de trabajo (el mecánico solo ve las suyas y solo puede mirarlas, con todas sus notas) */
pantalla('ordenes',{
 clienteVehiculo:true,soloLectura:[ME],
 f:[['codigo','N° de orden'],['cliente','Cliente','ref','clientes'],['vehiculo','Vehículo','ref','vehiculos'],['estado','Estado','select',ESTADOS],['fecha','Fecha','date'],['motivo','Motivo / falla reportada','textarea']],
 campo:(f,v)=>{
  if(f[0]=='codigo')return `<input name="codigo" class="form-control" readonly value="${esc(v)||sig('ordenes','codigo','OT-')}"><div class="form-text">Se genera automáticamente.</div>`;
  if(f[0]=='estado')return u.rol==A&&v?`<select name="estado" class="form-select">${ESTADOS.map(o=>`<option ${o==v?'selected':''}>${o}</option>`).join('')}</select>`:`<div>${bdg(v||'Recibida')}<input type="hidden" name="estado" value="${v||'Recibida'}"></div><div class="form-text">El estado cambia solo según avance el trabajo. Solo el administrador puede corregirlo.</div>`},
 preparar:(d,prev)=>{if(!prev||d.estado!=prev.estado)d.actualizado=new Date().toISOString()},
 detalle:r=>{const rc=get('recepcion').filter(x=>x.orden==r.id).pop(),as=get('mecanicos').find(a=>a.orden==r.id),notas=panelNotas(r.id,'Notas y avances de la orden',true);
  return `<hr><div class="mb-2"><b>Mecánico asignado:</b> ${as?esc(nm('usuarios',as.mecanico)):'Sin asignar'}</div>${notas}${rc&&rc.fotos&&rc.fotos.length?`<h6 class="mt-3">Fotos al recibir el vehículo</h6>${galeriaFotos(rc.fotos)}`:''}`}
});
