/* PANTALLA · Registro de clientes */
pantalla('clientes',{
 turno:true,
 f:[['nombre','Nombre completo'],['telefono','Teléfono','tel'],['correo','Correo electrónico','email'],['direccion','Dirección']],
 extra:[['Vehículos',r=>{const n=get('vehiculos').filter(v=>v.cliente==r.id).length;return n?`<span class="badge text-bg-secondary"><i class="bi bi-car-front"></i> ${n}</span>`:'—'}]],
 /* En el detalle se ven todos los vehículos del cliente: un cliente puede tener los que quiera */
 detalle:r=>{const vs=get('vehiculos').filter(v=>v.cliente==r.id);return `<h6 class="mt-3">Vehículos registrados (${vs.length})</h6>${vs.length?`<ul class="mb-0">${vs.map(v=>`<li>${esc(vehTxt(v))}</li>`).join('')}</ul>`:'<p class="text-muted mb-0">Aún no tiene vehículos. Regístralos en «Registro de vehículos» o al recibir el vehículo.</p>'}`},
 antesEliminar:r=>{const n=get('vehiculos').filter(v=>v.cliente==r.id).length;return n?`Este cliente tiene ${n} vehículo${n==1?'':'s'} registrado${n==1?'':'s'}. Elimínalos primero.`:null}
});
