/* PANTALLA · Cotizaciones (servicios y repuestos con ITBIS; muestra lo que pidió el mecánico y deja una nota para facturación) */
pantalla('cotizaciones',{
 turno:true,grande:true,
 f:[['orden','Orden de trabajo','ref','ordenes'],['descripcion','Servicio / repuesto'],['total','Total (RD$)','number'],['estado','Estado','select',['Pendiente','Aprobada','Rechazada']]],
 acciones:r=>`<button class="btn btn-sm btn-outline-primary" data-pc="${r.id}" title="Imprimir cotización"><i class="bi bi-printer"></i></button>`,
 clic:b=>{if(b.dataset.pc){imprimirCot(b.dataset.pc);return true}},
 cuerpo:r=>cotBody(r,'cotizaciones'),
 alAbrir:r=>cotBind(r,'cotizaciones'),
 preparar:(d,prev)=>{
  const c=cotCalc();if(!c.items.length)return 'Selecciona al menos un servicio o repuesto.';
  if(d.estado=='Aprobada'&&!(prev&&prev.stockDesc)){const er=chkStock(c.items);if(er)return er}
  d.nota=(d.nota||'').trim();
  Object.assign(d,{items:c.items,subtotal:c.sub,itbis:c.itbis,total:c.total,descripcion:c.items.map(x=>x.d+(x.c>1?' x'+x.c:'')).join(', ')})},
 detalle:r=>`<hr><table class="table table-sm"><thead><tr><th>Descripción</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Importe</th></tr></thead><tbody>${(r.items||[]).map(x=>`<tr><td>${esc(x.d)}</td><td class="text-end">${x.c}</td><td class="text-end">${fmt(x.p)}</td><td class="text-end">${fmt(x.p*x.c)}</td></tr>`).join('')}</tbody></table><div class="text-end">Subtotal ${fmt(r.subtotal||0)} · ITBIS ${fmt(r.itbis||0)} · <b>Total RD$ ${fmt(r.total)}</b></div>${r.nota?`<div class="mt-2"><b>Nota:</b> <span style="white-space:pre-wrap">${esc(r.nota)}</span></div>`:''}<div class="mt-3">${panelNotas(r.orden,'Notas de la orden',true)}</div>`,
 despues:(r,old)=>{const ot=nm('ordenes',r.orden),nuevo=!old;
  avanzar(r.orden,'Cotizada');
  if(nuevo)notif([R],`Nueva cotización de ${ot} por RD$ ${fmt(r.total)}: pendiente de aprobación del cliente.`+(r.nota?' Nota: '+r.nota:''));
  if(r.estado!='Pendiente'&&(nuevo||old.estado!=r.estado))aprobar(r.id,r.estado)}
});
