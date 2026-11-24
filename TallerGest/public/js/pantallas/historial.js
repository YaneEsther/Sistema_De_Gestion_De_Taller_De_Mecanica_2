/* PANTALLA · Historial de mantenimiento (se llena solo al finalizar un trabajo; también se puede registrar a mano) */
pantalla('historial',{
 clienteVehiculo:true,
 f:[['vehiculo','Vehículo','ref','vehiculos'],['fecha','Fecha','date'],['servicio','Servicio'],['km','Kilometraje','number'],['tecnico','Técnico']],
 extra:[['Orden',r=>r.orden?esc(nm('ordenes',r.orden)):'—']],
 filtros:()=>`<div class="col-md-5">${combo('fvh',get('vehiculos').map(v=>({id:v.id,t:vehTxt(v),s:nm('clientes',v.cliente)})),'',{req:false,ph:'Filtrar por vehículo (placa o dueño)...'})}</div>`,
 filtro:r=>{const v=$('#flt [name=fvh]');return !v||!v.value||r.vehiculo==v.value},
 ordenar:rows=>rows.slice().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))
});
