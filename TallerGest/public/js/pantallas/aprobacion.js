/* PANTALLA · Aprobación del cliente (se identifica la cotización por cliente, vehículo, orden y monto) */
const resumenCot=cid=>{
 const c=get('cotizaciones').find(x=>x.id==cid);if(!c)return '';const o=get('ordenes').find(x=>x.id==c.orden)||{};
 return `<div class="border rounded p-2 small bg-light"><div><b>${esc(clienteDeOrden(o))}</b> · ${esc(vehTxt(get('vehiculos').find(v=>v.id==o.vehiculo)))} · ${esc(o.codigo)}</div><ul class="mb-1 ps-3">${(c.items||[]).map(x=>`<li>${esc(x.d)} x${x.c} — RD$ ${fmt(x.p*x.c)}</li>`).join('')}</ul><div class="text-end">Subtotal ${fmt(c.subtotal||0)} · ITBIS ${fmt(c.itbis||0)} · <b>Total RD$ ${fmt(c.total)}</b></div>${c.nota?`<div class="mt-1"><b>Nota de la cotización:</b> ${esc(c.nota)}</div>`:''}</div>`};
pantalla('aprobacion',{
 turno:true,
 f:[['cotizacion','Cotización','ref','cotizaciones',c=>c.estado=='Pendiente'],['decision','Decisión','select',['Aprobada','Rechazada']],['fecha','Fecha','date'],['comentario','Observaciones del cliente (por ejemplo, cómo desea pagar)','textarea']],
 pie:()=>'<div id="apinfo" class="mt-3"></div>',
 alAbrir:r=>{const mostrar=cid=>{$('#apinfo').innerHTML=cid?resumenCot(cid):''};formOn('change',e=>{if(e.target.name=='cotizacion')mostrar(e.target.value)});if(r)mostrar(r.cotizacion)},
 preparar:d=>{if(d.decision=='Aprobada'){const c=get('cotizaciones').find(x=>x.id==d.cotizacion);if(c&&!c.stockDesc){const er=chkStock(c.items);if(er)return er}}},
 detalle:r=>`<hr>${resumenCot(r.cotizacion)}`,
 despues:(r,old)=>{const c=get('cotizaciones').find(x=>x.id==r.cotizacion);if(c&&(!old||old.decision!=r.decision))aprobar(c.id,r.decision)}
});
