/* NÚCLEO · cotizador — elegir servicios y repuestos con cálculo automático (ITBIS 18%).
   Lo usan Cotizaciones y Facturación. Aquí también se enlaza lo que el mecánico pidió en el diagnóstico. */
function cotBody(r,k){
 const fac=k=='facturacion',it=r&&r.items||[],sel=(t,id)=>it.find(x=>x.t==t&&x.id==id);
 const row=(t,x)=>{const s=sel(t,x.id);return `<div class="d-flex align-items-center gap-2 border-bottom py-1"><input type="checkbox" class="form-check-input ci" data-t="${t}" data-id="${x.id}" data-d="${esc(x.descripcion)}" data-p="${x.precio||0}" ${s?'checked':''}><span class="flex-grow-1 small">${esc(x.descripcion)}${t=='r'?` <span class="text-muted">(stock ${esc(x.stock)})</span>`:''}</span>${t=='r'?`<input type="number" min="1" value="${s?s.c:1}" class="form-control form-control-sm cq" style="width:68px">`:''}<span class="text-nowrap small">RD$ ${fmt(x.precio||0)}</span></div>`};
 const lista=(t,k2,vacio)=>get(k2).length?get(k2).map(x=>row(t,x)).join(''):`<div class="text-muted small py-2">${vacio}</div>`;
 const ords=get('ordenes').filter(o=>(r&&o.id==r.orden)||(fac?o.estado=='Finalizada':['Diagnosticada','Cotizada'].includes(o.estado)));
 const ordSel=combo('orden',ords.map(o=>({id:o.id,t:etq('ordenes',o)})),r&&r.orden,{ph:'Escribe el cliente, la placa o el N° de orden...'});
 const nums=get('facturacion').map(x=>parseInt(String(x.numero).replace(/\D/g,''))||0);
 const cab=fac?`<div class="row g-2"><div class="col-md-3"><label class="form-label">N° de factura</label><input name="numero" class="form-control" required value="${esc(r?r.numero:'FAC-'+String(Math.max(0,...nums)+1).padStart(3,'0'))}"></div><div class="col-md-6"><label class="form-label">Orden de trabajo</label>${ordSel}</div><div class="col-md-3"><label class="form-label">Fecha</label><input type="date" name="fecha" class="form-control" required value="${r?r.fecha:hoy()}"></div></div><div id="fh" class="small text-muted mt-1">Al elegir la orden se cargan los ítems de su cotización aprobada.</div>`
  :`<div class="row g-2"><div class="col-md-8"><label class="form-label">Orden de trabajo</label>${ordSel}</div><div class="col-md-4"><label class="form-label">Estado</label><select name="estado" class="form-select">${['Pendiente','Aprobada','Rechazada'].map(o=>`<option ${r&&r.estado==o?'selected':''}>${o}</option>`).join('')}</select></div></div>`;
 return cab+`<div id="cnotas" class="mt-2"></div><div id="csol" class="mt-2"></div><div class="row g-3 mt-1"><div class="col-md-6"><h6 class="mb-1">Servicios</h6><div style="max-height:220px;overflow:auto">${lista('s','servicios','No hay servicios. Créalos en «Gestión de servicios».')}</div></div>
 <div class="col-md-6"><h6 class="mb-1">Repuestos <small class="text-muted fw-normal">(cantidad)</small></h6><div style="max-height:220px;overflow:auto">${lista('r','repuestos','No hay repuestos. Créalos en «Gestión de repuestos».')}</div></div></div>
 <div class="bg-light rounded p-3 mt-3 text-end"><div>Subtotal: <b id="cs">0.00</b></div><div>ITBIS (18%): <b id="ci2">0.00</b></div><div class="fs-5">Total: RD$ <b id="ct" style="color:var(--azul)">0.00</b></div></div>`
 +(fac?'':`<label class="form-label mt-3">Nota (opcional)</label><textarea name="nota" rows="2" class="form-control" placeholder="Ej.: el cliente prefiere pagar en dos partes, o pidió que lo llamen antes de empezar.">${esc(r&&r.nota)}</textarea><div class="form-text">La verán quienes siguen la orden (facturación y mecánico).</div>`)}

/* Conecta el formulario: totales, notas de la orden y lo que pidió el mecánico */
function cotBind(r,k){
 const ord=()=>$('#fb [name=orden]');
 const notas=()=>{$('#cnotas').innerHTML=ord().value?panelNotas(ord().value,k=='facturacion'?'Notas para facturación':'Notas de la orden'):''};
 formOn('input',cotCalc);formOn('change',cotCalc);
 formOn('change',e=>{if(e.target.name!='orden')return;notas();if(k=='facturacion')facCarga(e);else cotSolicitud(!r)});
 notas();if(k=='cotizaciones')cotSolicitud(false);cotCalc()}

/* Factura: al elegir la orden se cargan los ítems de su cotización aprobada */
function facCarga(e){
 const o=e.target.value,c=get('cotizaciones').filter(x=>x.orden==o&&x.estado=='Aprobada'&&x.items).pop(),h=$('#fh');
 document.querySelectorAll('.ci').forEach(b=>{b.checked=false});
 if(c){c.items.forEach(x=>{const b=document.querySelector(`.ci[data-t="${x.t}"][data-id="${x.id}"]`);if(b){b.checked=true;const q=b.parentElement.querySelector('.cq');if(q)q.value=x.c}});h.textContent='Ítems cargados desde la cotización aprobada. Puedes ajustarlos.'}
 else h.textContent=o?'Esta orden no tiene cotización aprobada: selecciona los ítems manualmente.':'';
 cotCalc()}

/* Cotización: muestra lo que el mecánico pidió en su diagnóstico y permite cargarlo con un clic */
function cotSolicitud(auto){
 const box=$('#csol');if(!box)return;const oid=$('#fb [name=orden]').value,n=necesidadesDe(oid);
 if(!oid||(!n.items.length&&!n.otras)){box.innerHTML='';return}
 const stock=x=>{if(x.t!='r')return '';const r=get('repuestos').find(y=>y.id==x.id);return r?(Number(r.stock)<x.c?` <span class="badge text-bg-danger">stock ${r.stock}: faltan ${x.c-Number(r.stock)}</span>`:` <span class="text-muted">(stock ${r.stock})</span>`):' <span class="badge text-bg-secondary">ya no está en el catálogo</span>'};
 box.innerHTML=`<div class="alert alert-warning py-2 small mb-0"><b><i class="bi bi-tools"></i> Lo que pidió el mecánico:</b>${n.items.length?`<ul class="mb-1 ps-3">${n.items.map(x=>`<li>${esc(x.d)}${x.c>1?' x'+x.c:''} <span class="text-muted">(${x.t=='r'?'repuesto':'servicio'})</span>${stock(x)}</li>`).join('')}</ul>`:''}${n.otras?`<div>Otras piezas (fuera del catálogo): <span style="white-space:pre-wrap">${esc(n.otras)}</span></div>`:''}${n.items.length?'<button type="button" class="btn btn-sm btn-warning mt-1" id="csb"><i class="bi bi-arrow-down-circle"></i> Cargar a la cotización</button>':''}</div>`;
 const cargar2=()=>{document.querySelectorAll('.ci').forEach(b=>{b.checked=false});const falt=[];
  n.items.forEach(x=>{const b=document.querySelector(`.ci[data-t="${x.t}"][data-id="${x.id}"]`);if(b){b.checked=true;const q=b.parentElement.querySelector('.cq');if(q)q.value=x.c}else falt.push(x.d)});
  cotCalc();return falt};
 if($('#csb'))$('#csb').onclick=()=>{const f=cargar2();if(f.length)alert('Estos ítems ya no existen en el catálogo y no se cargaron: '+f.join(', '))};
 if(auto&&n.items.length&&!document.querySelector('.ci:checked'))cargar2()}

function cotCalc(){
 const items=[...document.querySelectorAll('.ci:checked')].map(c=>{const q=c.parentElement.querySelector('.cq');return {t:c.dataset.t,id:c.dataset.id,d:c.dataset.d,p:+c.dataset.p,c:Math.max(1,+(q?q.value:1)||1)}});
 const sub=items.reduce((a,x)=>a+x.p*x.c,0),itbis=Math.round(sub*18)/100;
 if($('#cs')){$('#cs').textContent=fmt(sub);$('#ci2').textContent=fmt(itbis);$('#ct').textContent=fmt(sub+itbis)}
 return {items,sub,itbis,total:sub+itbis}}
