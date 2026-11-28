/* PANTALLA · Pagos (formulario según el método; pagos parciales; nunca más que el saldo) */
const CAMPOS={'Efectivo':[['recibido','Efectivo recibido (RD$)','number']],
 'Tarjeta de crédito':[['marca','Marca','select',['Visa','Mastercard','American Express','Otra']],['ultimos4','Últimos 4 dígitos'],['autorizacion','N° de aprobación'],['cuotas','Cuotas','select',['1','3','6','12']]],
 'Tarjeta de débito':[['marca','Marca','select',['Visa','Mastercard','American Express','Otra']],['ultimos4','Últimos 4 dígitos'],['autorizacion','N° de aprobación']],
 'Transferencia':[['banco','Banco'],['referencia','N° de referencia']],
 'Cheque':[['banco','Banco'],['ncheque','N° de cheque']]};
function pagoBody(r){
 const fs=get('facturacion').filter(f=>(r&&f.id==r.factura)||Number(f.total)-pagado(f.id)>0.001);
 return `<div class="row g-2"><div class="col-md-8"><label class="form-label">Factura</label>${combo('factura',fs.map(f=>({id:f.id,t:etq('facturacion',f),s:'Saldo RD$ '+fmt(Math.max(0,Number(f.total)-pagado(f.id)))})),r&&r.factura,{ph:'Escribe el N° de factura o el cliente...'})}</div>
 <div class="col-md-4"><label class="form-label">Fecha</label><input type="date" name="fecha" class="form-control" required value="${r?r.fecha:hoy()}"></div></div>
 <div id="pr" class="bg-light rounded p-2 mt-2 small text-muted">Selecciona una factura.</div><div id="pnotas" class="mt-2"></div>
 <div class="row g-2 mt-1"><div class="col-md-6"><label class="form-label">Método de pago</label><select name="metodo" class="form-select" required>${METODOS.map(o=>`<option ${r&&r.metodo==o?'selected':''}>${o}</option>`).join('')}</select></div>
 <div class="col-md-6"><label class="form-label">Monto a pagar (RD$)</label><input name="monto" type="number" step="any" min="0.01" class="form-control" required value="${r?r.monto:''}"></div></div>
 <div id="pm" class="row g-2 mt-1"></div><div id="pt" class="rounded p-2 mt-3 fw-semibold"></div>
 <label class="form-label mt-2">Notas</label><textarea name="notas" rows="2" class="form-control">${esc(r&&r.notas)}</textarea>`}
function pagoBind(r){
 const g=n=>$('#fb [name='+n+']'),fa=()=>get('facturacion').find(x=>x.id==g('factura').value);
 const calc=()=>{const f=fa(),m=+g('monto').value||0;
  $('#pnotas').innerHTML=f?panelNotas(f.orden,'Notas para el cobro'):'';
  if(!f){$('#pr').textContent=get('facturacion').some(x=>Number(x.total)-pagado(x.id)>0.001)?'Selecciona una factura.':'No hay facturas con saldo pendiente.';$('#pt').textContent='';$('#pt').className='';return}
  const pag=pagado(f.id,r&&r.id),saldo=Math.max(0,Number(f.total)-pag);
  $('#pr').innerHTML=`Total <b>RD$ ${fmt(f.total)}</b> · Pagado <b>RD$ ${fmt(pag)}</b> · Saldo <b>RD$ ${fmt(saldo)}</b>`;
  let t=`Saldo después de este pago: RD$ ${fmt(Math.max(0,saldo-m))}`,c='bg-light';
  if(m>saldo+0.001){t='El monto supera el saldo de la factura.';c='bg-danger-subtle text-danger'}
  else if(g('recibido')){const rc=+g('recibido').value||0;
   if(rc<m){t=`Faltan RD$ ${fmt(m-rc)} · `+t;c='bg-warning-subtle'}else{t=`Devolver al cliente: RD$ ${fmt(rc-m)} · `+t;c='bg-success-subtle'}}
  $('#pt').className='rounded p-2 mt-3 fw-semibold '+c;$('#pt').textContent=t};
 const pintar=()=>{$('#pm').innerHTML=CAMPOS[g('metodo').value].map(([n,l,t,o])=>`<div class="col-md-6"><label class="form-label">${l}</label>${t=='select'?`<select name="${n}" class="form-select">${o.map(x=>`<option ${r&&r[n]==x?'selected':''}>${x}</option>`).join('')}</select>`:`<input name="${n}" type="${t||'text'}" ${t=='number'?'step="any" min="0"':''} ${n=='ultimos4'?'maxlength="4" pattern="[0-9]{4}" title="4 dígitos"':''} class="form-control" required value="${esc(r&&r[n]!==undefined&&r[n]!==null?r[n]:'')}">`}</div>`).join('');calc()};
 formOn('input',calc);
 formOn('change',e=>{if(e.target.name=='factura'){const f=fa();if(f)g('monto').value=Math.max(0,Number(f.total)-pagado(f.id,r&&r.id)).toFixed(2)}if(e.target.name=='metodo')pintar();calc()});
 pintar()}
pantalla('pagos',{
 turno:true,grande:true,
 f:[['factura','Factura','ref','facturacion'],['monto','Monto (RD$)','number'],['metodo','Método de pago','select',METODOS],['fecha','Fecha','date'],['detalle','Detalle']],
 acciones:r=>`<button class="btn btn-sm btn-outline-primary" data-p="${r.factura}" title="Imprimir factura"><i class="bi bi-printer"></i></button>`,
 clic:b=>{if(b.dataset.p){imprimir(b.dataset.p);return true}},
 cuerpo:r=>pagoBody(r),alAbrir:r=>pagoBind(r),
 preparar:(d,prev)=>{
  const f=get('facturacion').find(x=>x.id==d.factura);if(!f)return 'Selecciona una factura.';
  const m=+d.monto,saldo=Number(f.total)-pagado(f.id,prev&&prev.id);
  if(m>saldo+0.001)return 'El monto supera el saldo de la factura.';
  if(d.metodo=='Efectivo'&&+d.recibido<m)return 'El efectivo recibido es menor al monto a pagar.';
  d.monto=m;
  /* al cambiar de método se limpian los datos del método anterior */
  ['recibido','devuelta','marca','ultimos4','autorizacion','cuotas','banco','referencia','ncheque'].forEach(x=>{if(d[x]===undefined)d[x]=null});
  if(d.metodo=='Efectivo'){d.recibido=+d.recibido;d.devuelta=d.recibido-m;d.detalle=`Recibido ${fmt(d.recibido)} · Devuelta ${fmt(d.devuelta)}`}
  else d.detalle=(d.marca?`${d.marca} ****${d.ultimos4} · Aut. ${d.autorizacion}`:d.metodo=='Cheque'?`${d.banco} · Cheque ${d.ncheque}`:`${d.banco} · Ref. ${d.referencia}`)+(d.cuotas&&d.cuotas!='1'?` · ${d.cuotas} cuotas`:'')},
 despues:r=>{const f=get('facturacion').find(x=>x.id==r.factura);if(f&&Number(f.total)-pagado(f.id)<=0.001){avanzar(f.orden,'Pagada');notif([R,A],`La factura ${f.numero} quedó pagada por completo.`)}}
});
