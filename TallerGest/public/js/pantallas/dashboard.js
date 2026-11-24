/* PANTALLA · Inicio (resumen del día: mi turno, alertas, órdenes en curso y órdenes del turno por estado) */
function dash(){
 window.__redraw=dash;
 const desde=inicioTurno(),mios=x=>x.por==u.id&&x.creado&&x.creado>desde;
 /* Lo que registré en este turno */
 const CONT=[['clientes','Clientes'],['vehiculos','Vehículos'],['recepcion','Recepciones'],['diagnostico','Diagnósticos'],['cotizaciones','Cotizaciones'],['aprobacion','Aprobaciones'],['ejecucion','Ejecuciones'],['facturacion','Facturas'],['pagos','Pagos']].filter(([k])=>M[k].r.includes(u.rol));
 const cuentas=CONT.map(([k,l])=>[l,get(k).filter(mios).length]),cobrado=M.pagos.r.includes(u.rol)?get('pagos').filter(mios).reduce((a,p)=>a+Number(p.monto),0):0;
 const resumenTurno=cuentas.filter(x=>x[1]).map(x=>`${x[0]}: ${x[1]}`).join(', ')||'Sin registros';
 const caja=M.reportes.r.includes(u.rol);
 const turno=`<div class="card p-3 mt-3"><div class="d-flex flex-wrap justify-content-between align-items-center gap-2"><div><div class="fw-semibold"><i class="bi bi-clock-history"></i> Mi turno <span class="text-muted fw-normal small">· desde ${hora(desde)}</span></div><div class="text-muted small">Se reinicia al cerrar turno o al cambiar de día.</div></div>${caja?'<a class="btn btn-primary btn-sm" href="reportes.html"><i class="bi bi-lock"></i> Cierre de caja</a>':'<button class="btn btn-primary btn-sm" id="ct"><i class="bi bi-lock"></i> Cerrar turno</button>'}</div>
  <div class="d-flex flex-wrap gap-2 mt-2">${cuentas.map(([l,n])=>`<span class="badge ${n?'text-bg-primary':'text-bg-light border text-muted'} fw-normal">${l}: ${n}</span>`).join('')}${cobrado?`<span class="badge text-bg-success fw-normal">Cobrado: RD$ ${fmt(cobrado)}</span>`:''}</div></div>`;
 /* Alertas */
 const bajos=u.rol==A||u.rol==ME?get('repuestos').filter(r=>r.stock!==undefined&&r.stock!==''&&Number(r.stock)<=5):[],
  pend=u.rol==A||u.rol==F?get('facturacion').filter(f=>pagado(f.id)+0.001<Number(f.total)):[];
 const alertas=(bajos.length?`<div class="alert alert-warning mt-3 mb-2"><b><i class="bi bi-exclamation-triangle"></i> Stock bajo (${bajos.length}):</b> ${bajos.map(r=>esc(r.descripcion)+' ('+r.stock+')').join(', ')}. <a href="repuestos.html">Ver repuestos</a></div>`:'')
  +(pend.length?`<div class="alert alert-info mt-2 mb-2"><b><i class="bi bi-receipt"></i> Facturas pendientes de cobro:</b> ${pend.length} · Saldo total RD$ ${fmt(pend.reduce((a,f)=>a+Math.max(0,Number(f.total)-pagado(f.id)),0))}. <a href="pagos.html">Registrar pagos</a></div>`:'');
 /* Órdenes: las terminadas (pagadas) no aparecen en «en curso»; el conteo por estado es solo del turno */
 const ord=M.ordenes.r.includes(u.rol)?vis('ordenes',get('ordenes')):[],activas=ord.filter(o=>o.estado!='Pagada').slice().reverse();
 const delTurnoO=o=>enTurno(o.actualizado||o.creado)||(!o.actualizado&&!o.creado&&String(o.fecha)>=hoy()),cnt=ESTADOS.map(e=>[e,ord.filter(o=>o.estado==e&&delTurnoO(o)).length]).filter(x=>x[1]);
 const enCurso=ord.length?`<h6 class="mt-4">${u.rol==ME?'Mis órdenes en curso':'Órdenes en curso'} <span class="text-muted fw-normal small">(${activas.length}${activas.length>8?', mostrando 8':''})</span></h6><div class="card"><div class="table-responsive"><table class="table table-sm align-middle mb-0"><tbody>${activas.slice(0,8).map(o=>`<tr><td class="fw-semibold">${esc(o.codigo)}</td><td>${esc(nm('clientes',o.cliente))}</td><td class="text-muted">${esc(nm('vehiculos',o.vehiculo))}</td><td>${bdg(o.estado)}</td></tr>`).join('')||'<tr><td class="text-muted p-3">No hay órdenes en curso.</td></tr>'}</tbody></table></div></div>
  <h6 class="mt-4">${u.rol==ME?'Mis órdenes por estado':'Órdenes por estado'} <span class="text-muted fw-normal small">(este turno)</span></h6><div class="d-flex flex-wrap gap-3">${cnt.map(([e,n])=>`<span>${bdg(e)} <b>${n}</b></span>`).join('')||'<span class="text-muted small">Aún no hay movimiento de órdenes en este turno.</span>'}</div>`:'';
 const ks=['clientes','vehiculos','ordenes','cotizaciones','servicios','repuestos'].filter(k=>M[k].r.includes(u.rol));
 $('#main').innerHTML=`<h4>Hola, ${esc(u.nombre)}</h4><p class="text-muted mb-0">Bienvenido al sistema TallerGest. ¿Dudas? Visita el <a href="ayuda.html">Centro de ayuda</a>.</p>${turno}${alertas}<div class="row g-3 mt-1">${ks.map(k=>`<div class="col-6 col-lg-4"><a href="${k}.html" class="text-decoration-none text-reset"><div class="card stat p-3 d-flex flex-row align-items-center gap-3"><i class="bi bi-${M[k].i}"></i><div><div class="text-muted small">${u.rol==ME&&k=='ordenes'?'Mis órdenes asignadas':M[k].t}</div><div class="n">${vis(k,get(k)).length}</div></div></div></a></div>`).join('')}</div>${enCurso}`;
 if($('#ct'))$('#ct').onclick=()=>{
  if(!confirm('¿Cerrar tu turno? Tus conteos y listas «del turno» empezarán de cero.'))return;
  const c=get('cierres');c.push({id:Date.now(),por:u.id,nombre:u.nombre,rol:u.rol,desde,hasta:new Date().toISOString(),pagos:0,total:0,metodos:{},resumen:resumenTurno});
  put('cierres',c);log('Cierre de turno','Turno','Turno de '+u.nombre,resumenTurno);dash()}}
