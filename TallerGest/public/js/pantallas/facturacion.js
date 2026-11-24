/* PANTALLA · Facturación (carga los ítems de la cotización aprobada y muestra las notas de la orden) */
pantalla('facturacion',{
 turno:true,grande:true,
 f:[['numero','N° de factura'],['orden','Orden de trabajo','ref','ordenes'],['total','Total (RD$)','number'],['fecha','Fecha','date']],
 dup:['numero',x=>`Ya existe la factura «${x.numero}».`],
 extra:[['Pagado',r=>fmt(pagado(r.id))],['Saldo',r=>fmt(Math.max(0,Number(r.total)-pagado(r.id)))],['Estado',r=>{const p=pagado(r.id);return bdg(p<=0?'Pendiente':p+0.001>=Number(r.total)?'Pagada':'Parcial')}]],
 acciones:r=>`<button class="btn btn-sm btn-outline-primary" data-p="${r.id}" title="Imprimir factura"><i class="bi bi-printer"></i></button>`,
 clic:b=>{if(b.dataset.p){imprimir(b.dataset.p);return true}},
 cuerpo:r=>cotBody(r,'facturacion'),
 alAbrir:r=>cotBind(r,'facturacion'),
 preparar:d=>{const c=cotCalc();if(!c.items.length)return 'Selecciona al menos un servicio o repuesto.';
  Object.assign(d,{items:c.items,subtotal:c.sub,itbis:c.itbis,total:c.total,descripcion:c.items.map(x=>x.d+(x.c>1?' x'+x.c:'')).join(', ')})},
 detalle:r=>`<hr><table class="table table-sm"><thead><tr><th>Descripción</th><th class="text-end">Cant.</th><th class="text-end">Importe</th></tr></thead><tbody>${(r.items||[]).map(x=>`<tr><td>${esc(x.d)}</td><td class="text-end">${x.c}</td><td class="text-end">${fmt(x.p*x.c)}</td></tr>`).join('')}</tbody></table><div class="text-end">Subtotal ${fmt(r.subtotal||0)} · ITBIS ${fmt(r.itbis||0)} · <b>Total RD$ ${fmt(r.total)}</b></div><div class="mt-3">${panelNotas(r.orden,'Notas para facturación',true)}</div>`,
 antesEliminar:r=>pagado(r.id)?'Esta factura tiene pagos registrados. Elimina primero sus pagos.':null,
 despues:(r,old)=>{if(!old){avanzar(r.orden,'Facturada');notif([F,A],`Nueva factura ${r.numero} por RD$ ${fmt(r.total)} pendiente de cobro.`)}}
});
