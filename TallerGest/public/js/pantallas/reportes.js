/* PANTALLA · Reportes y cierre de caja (el cierre incluye solo lo que registró el usuario desde su último cierre o desde las 00:00) */
function rep(){
 const adm=u.rol==A;let modo=adm?'hist':'turno';
 const ini=inicioTurno; // el turno empieza en tu último cierre o a las 00:00 del día
 const cli=fid=>{const f=get('facturacion').find(x=>x.id==fid)||{},o=get('ordenes').find(x=>x.id==f.orden)||{};return nm('clientes',o.cliente)};
 const suma=(a,c)=>a.reduce((t,x)=>t+Number(x[c]||0),0);
 const datos=()=>{let pg=get('pagos'),fc=get('facturacion');
  if(modo=='turno'){const i=ini(),f=x=>x.por==u.id&&x.creado&&x.creado>i;pg=pg.filter(f);fc=fc.filter(f)}
  else{const d=$('#rd').value,h=$('#rh').value,cj=$('#rc').value,me=$('#rm').value,f=x=>(!d||String(x.fecha)>=d)&&(!h||String(x.fecha)<=h)&&(!cj||x.por==cj);pg=pg.filter(x=>f(x)&&(!me||x.metodo==me));fc=fc.filter(f)}
  return {pg,fc}};
 const cuerpo=()=>{const {pg,fc}=datos();
  return `<div class="row g-2 mb-3">${[['Total facturado','RD$ '+fmt(suma(fc,'total'))],['Total cobrado','RD$ '+fmt(suma(pg,'monto'))],['Facturas',fc.length],['Pagos',pg.length]].map(([l,v])=>`<div class="col-6 col-md-3"><div class="card p-2"><div class="text-muted small">${l}</div><div class="fs-5 fw-bold">${v}</div></div></div>`).join('')}</div>
  <h6>Cobrado por método</h6><table class="table table-sm"><tbody>${METODOS.map(m=>`<tr><td>${m}</td><td class="text-end">RD$ ${fmt(suma(pg.filter(x=>x.metodo==m),'monto'))}</td></tr>`).join('')}</tbody></table>
  <h6>Pagos</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Fecha</th><th>Factura</th><th>Cliente</th><th>Método</th><th class="text-end">Monto</th><th>Cajero</th></tr></thead><tbody>${pg.map(x=>`<tr><td>${esc(x.fecha)}</td><td>${esc(nm('facturacion',x.factura))}</td><td>${esc(cli(x.factura))}</td><td>${esc(x.metodo)}</td><td class="text-end">${fmt(x.monto)}</td><td>${esc(x.porNombre||'—')}</td></tr>`).join('')||'<tr><td colspan="6" class="text-muted">Sin pagos en este período.</td></tr>'}</tbody></table></div>
  <h6>Facturas</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th class="text-end">Total</th><th>Cajero</th></tr></thead><tbody>${fc.map(x=>`<tr><td>${esc(x.numero)}</td><td>${esc(x.fecha)}</td><td>${esc(cli(x.id))}</td><td class="text-end">${fmt(x.total)}</td><td>${esc(x.porNombre||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="text-muted">Sin facturas en este período.</td></tr>'}</tbody></table></div>`};
 const pinta=()=>{
  const us=get('usuarios');
  $('#main').innerHTML=`<div class="d-flex flex-wrap gap-2 justify-content-between mb-3"><h4>${modo=='turno'?'Cierre de caja':'Reportes'}</h4><div class="d-flex gap-2 no-print"><button class="btn btn-outline-primary" id="bx"><i class="bi bi-file-earmark-excel"></i> Excel</button><button class="btn btn-warning" id="bp"><i class="bi bi-file-earmark-pdf"></i> PDF / Imprimir</button></div></div>
  ${adm?`<div class="btn-group mb-3 no-print"><button class="btn ${modo=='hist'?'btn-primary':'btn-outline-primary'}" data-md="hist">Historial completo</button><button class="btn ${modo=='turno'?'btn-primary':'btn-outline-primary'}" data-md="turno">Cierre de caja (mi turno)</button></div>`:''}
  ${modo=='hist'?`<div class="row g-2 mb-3 no-print"><div class="col-6 col-md-3"><label class="form-label small">Desde</label><input type="date" id="rd" class="form-control"></div><div class="col-6 col-md-3"><label class="form-label small">Hasta</label><input type="date" id="rh" class="form-control"></div><div class="col-6 col-md-3"><label class="form-label small">Cajero</label><select id="rc" class="form-select"><option value="">Todos</option>${us.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select></div><div class="col-6 col-md-3"><label class="form-label small">Método</label><select id="rm" class="form-select"><option value="">Todos</option>${METODOS.map(m=>`<option>${m}</option>`).join('')}</select></div></div>`
  :`<div class="alert alert-light border d-flex flex-wrap justify-content-between align-items-center gap-2 no-print"><span>Turno de <b>${esc(u.nombre)}</b> desde ${new Date(ini()||Date.now()).toLocaleString('es-DO')}. Solo incluye lo registrado por ti en este turno.</span><button class="btn btn-primary" id="bc"><i class="bi bi-lock"></i> Realizar cierre de caja</button></div>`}
  <div id="rb"></div>
  ${adm&&modo=='hist'?`<h6 class="mt-4">Cierres de caja realizados</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Fecha de cierre</th><th>Cajero</th><th>Pagos</th><th class="text-end">Total</th></tr></thead><tbody>${get('cierres').slice().reverse().slice(0,30).map(c=>`<tr><td>${new Date(c.hasta).toLocaleString('es-DO')}</td><td>${esc(c.nombre)}</td><td>${c.pagos}</td><td class="text-end">${fmt(c.total)}</td></tr>`).join('')||'<tr><td colspan="4" class="text-muted">Aún no hay cierres.</td></tr>'}</tbody></table></div>`:''}`;
  const refrescar=()=>{$('#rb').innerHTML=cuerpo()};refrescar();
  ['rd','rh','rc','rm'].forEach(i=>{if($('#'+i))$('#'+i).onchange=refrescar});
  document.querySelectorAll('[data-md]').forEach(b=>b.onclick=()=>{modo=b.dataset.md;pinta()});
  $('#bx').onclick=()=>{const {pg,fc}=datos();xlsx('Reporte_TallerGest_'+hoy(),{Resumen:[['Reporte',modo=='turno'?'Cierre de caja':'Historial'],['Generado',new Date().toLocaleString('es-DO')],['Por',u.nombre],[],['Total facturado',suma(fc,'total')],['Total cobrado',suma(pg,'monto')],...METODOS.map(m=>[m,suma(pg.filter(x=>x.metodo==m),'monto')])],Pagos:[['Fecha','Factura','Cliente','Método','Monto','Detalle','Cajero'],...pg.map(x=>[x.fecha,nm('facturacion',x.factura),cli(x.factura),x.metodo,Number(x.monto),x.detalle||'',x.porNombre||''])],Facturas:[['N°','Fecha','Cliente','Total','Cajero'],...fc.map(x=>[x.numero,x.fecha,cli(x.id),Number(x.total),x.porNombre||''])]})};
  $('#bp').onclick=()=>abrir(modo=='turno'?'Cierre de caja':'Reporte de ventas y cobros',`<div class="small text-muted mb-2">${modo=='turno'?`Cajero: ${esc(u.nombre)} · Turno: ${new Date(ini()||Date.now()).toLocaleString('es-DO')} → ${new Date().toLocaleString('es-DO')}`:`Generado por ${esc(u.nombre)} · ${new Date().toLocaleString('es-DO')}`}</div>`+cuerpo()+(modo=='turno'?'<div class="row mt-5 pt-4 text-center"><div class="col-6"><hr class="mx-4">Cajero</div><div class="col-6"><hr class="mx-4">Supervisor</div></div>':''));
  if($('#bc'))$('#bc').onclick=()=>{const {pg}=datos();
   if(!pg.length&&!confirm('No hay pagos en este turno. ¿Cerrar de todas formas?'))return;
   if(!confirm('¿Realizar el cierre de caja? Después, el turno empieza de cero.'))return;
   if(confirm('¿Imprimir el cierre antes de guardarlo?'))$('#bp').click();
   const c=get('cierres');c.push({id:Date.now(),por:u.id,nombre:u.nombre,rol:u.rol,desde:ini(),hasta:new Date().toISOString(),pagos:pg.length,total:suma(pg,'monto'),metodos:Object.fromEntries(METODOS.map(m=>[m,suma(pg.filter(x=>x.metodo==m),'monto')]))});
   put('cierres',c);log('Cierre de caja','reportes','Turno de '+u.nombre,`Pagos: ${pg.length}\nTotal cobrado: RD$ ${fmt(suma(pg,'monto'))}`);pinta()}};
 pinta()}

pantalla('reportes',{custom:1,pintar:rep});
