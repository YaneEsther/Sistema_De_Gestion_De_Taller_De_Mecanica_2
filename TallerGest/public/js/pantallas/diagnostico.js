/* PANTALLA · Diagnóstico (el mecánico también indica qué repuestos y servicios necesita; quien cotiza lo ve) */
const NEC={items:[]};
const opsNecesidad=()=>[...get('repuestos').map(x=>({id:'r:'+x.id,t:x.descripcion,s:`Repuesto · stock ${x.stock}`})),...get('servicios').map(x=>({id:'s:'+x.id,t:x.descripcion,s:'Servicio'}))];
const pintaNec=()=>{const b=$('#nec');if(!b)return;
 b.innerHTML=NEC.items.length?NEC.items.map((x,i)=>{const r=x.t=='r'&&get('repuestos').find(y=>y.id==x.id),falta=r&&Number(r.stock)<x.c;
  return `<div class="d-flex align-items-center gap-2 border-bottom py-1 small"><span class="flex-grow-1">${esc(x.d)} <span class="text-muted">(${x.t=='r'?'repuesto':'servicio'})</span>${falta?` <span class="badge text-bg-danger">stock ${r.stock}</span>`:''}</span><span>x${x.c}</span><button type="button" class="btn btn-sm btn-outline-danger py-0" data-nq="${i}">×</button></div>`}).join(''):'<div class="text-muted small">Aún no has agregado nada.</div>'};
pantalla('diagnostico',{
 turno:true,
 f:[['orden','Orden de trabajo','ref','ordenes',o=>o.estado=='Recibida'],['resultado','Resultado','select',['Sin anomalías','Con fallas','Requiere revisión adicional']],['hallazgos','Descripción / hallazgos','textarea']],
 pie:r=>`<div class="mt-3 border rounded p-2"><div class="fw-semibold"><i class="bi bi-tools"></i> Repuestos y servicios que necesita la reparación</div><div class="form-text mb-2">Elige del catálogo lo que hace falta. Recepción y facturación lo verán al preparar la cotización.</div>
  <div class="row g-2 align-items-end"><div class="col-md-7">${combo('_nec',opsNecesidad(),'',{req:false,ph:'Buscar repuesto o servicio...'})}</div><div class="col-4 col-md-2"><input type="number" min="1" value="1" class="form-control" id="necq"></div><div class="col-8 col-md-3"><button type="button" class="btn btn-outline-primary w-100" id="neca"><i class="bi bi-plus-lg"></i> Agregar</button></div></div>
  <div id="nec" class="mt-2"></div><label class="form-label mt-2">Otras piezas que no están en el catálogo (opcional)</label><textarea name="otras" class="form-control" rows="2">${esc(r&&r.otras)}</textarea></div><div id="enotas" class="mt-3"></div>`,
 alAbrir:r=>{
  NEC.items=JSON.parse(JSON.stringify((r&&r.necesidades)||[]));pintaNec();
  const notas=oid=>{$('#enotas').innerHTML=oid?panelNotas(oid,'Datos de la orden'):''};
  formOn('change',e=>{if(e.target.name=='orden')notas(e.target.value)});if(r)notas(r.orden);
  $('#neca').onclick=()=>{const w=$('#fb .combo [name=_nec]'),id=w.value;if(!id)return;const [t,rid]=id.split(':'),x=get(t=='r'?'repuestos':'servicios').find(y=>y.id==rid);if(!x)return;
   const c=Math.max(1,+$('#necq').value||1),ya=NEC.items.find(y=>y.t==t&&y.id==rid);if(ya)ya.c+=c;else NEC.items.push({t,id:rid,d:x.descripcion,c});
   comboSet(w.closest('.combo'),opsNecesidad(),'');$('#necq').value=1;pintaNec()};
  $('#nec').onclick=e=>{const b=e.target.closest('[data-nq]');if(b){NEC.items.splice(+b.dataset.nq,1);pintaNec()}}},
 preparar:d=>{const o=get('ordenes').find(x=>x.id==d.orden);if(o)d.vehiculo=o.vehiculo;d.necesidades=NEC.items;d.otras=(d.otras||'').trim();delete d._nec},
 detalle:r=>`<hr><h6>Repuestos y servicios solicitados</h6>${(r.necesidades||[]).length?`<ul>${r.necesidades.map(x=>`<li>${esc(x.d)} x${x.c} <span class="text-muted">(${x.t=='r'?'repuesto':'servicio'})</span></li>`).join('')}</ul>`:'<p class="text-muted">Ninguno.</p>'}${r.otras?`<div><b>Otras piezas:</b> <span style="white-space:pre-wrap">${esc(r.otras)}</span></div>`:''}`,
 despues:(r,old)=>{const ot=nm('ordenes',r.orden),n=(r.necesidades||[]).length;
  if(!old){avanzar(r.orden,'Diagnosticada');notif([R,A],`Diagnóstico completado de ${ot} (${r.resultado}).${n?` El mecánico pidió ${n} repuesto(s)/servicio(s).`:''} Falta crear la cotización.`)}
  else if(JSON.stringify(old.necesidades||[])!=JSON.stringify(r.necesidades||[]))notif([R,A],`El mecánico actualizó lo que necesita para ${ot}. Revisa la cotización.`)}
});
