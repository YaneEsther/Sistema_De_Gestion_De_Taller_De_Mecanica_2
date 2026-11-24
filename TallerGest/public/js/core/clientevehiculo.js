/* NÚCLEO · cliente y vehículo — elegir el cliente escribiendo su nombre y luego uno de SUS vehículos.
   Un cliente puede tener todos los vehículos que quiera: desde aquí se puede registrar otro sin salir del formulario. */
const opsClientes=()=>get('clientes').map(c=>({id:c.id,t:c.nombre,s:[c.telefono,c.correo].filter(Boolean).join(' · ')}));
const opsVehiculos=cid=>get('vehiculos').filter(v=>v.cliente==cid).map(v=>({id:v.id,t:vehTxt(v)}));
const puedeCrearVehiculo=()=>M.vehiculos.r.includes(u.rol);

function cvHTML(r){
 const cid=r&&r.cliente?r.cliente:(r&&r.vehiculo?(get('vehiculos').find(v=>v.id==r.vehiculo)||{}).cliente:'');
 return `<div class="row g-2 mt-1"><div class="col-md-6"><label class="form-label">Cliente</label>${combo('cliente',opsClientes(),cid,{ph:'Escribe el nombre del cliente...'})}</div>
 <div class="col-md-6"><label class="form-label">Vehículo</label><div id="cvvw">${combo('vehiculo',[],'',{ph:'Primero elige un cliente'})}</div>${puedeCrearVehiculo()?'<button type="button" class="btn btn-link btn-sm px-0" id="cvnb"><i class="bi bi-plus-circle"></i> Registrar otro vehículo de este cliente</button>':''}</div></div>
 <div id="cvn" class="border rounded p-2 mt-1 d-none"><div class="fw-semibold small mb-1">Nuevo vehículo de <span id="cvnc"></span></div>
  <div class="row g-2"><div class="col-6 col-md-3"><input id="nvp" class="form-control form-control-sm" placeholder="Placa / VIN"></div><div class="col-6 col-md-3"><input id="nvm" class="form-control form-control-sm" placeholder="Marca"></div><div class="col-6 col-md-3"><input id="nvo" class="form-control form-control-sm" placeholder="Modelo"></div><div class="col-6 col-md-3"><input id="nva" type="number" min="1900" max="2100" class="form-control form-control-sm" placeholder="Año"></div></div>
  <div class="d-flex align-items-center gap-2 mt-2"><button type="button" class="btn btn-sm btn-primary" id="nvg">Guardar vehículo</button><button type="button" class="btn btn-sm btn-outline-secondary" id="nvc">Cancelar</button><span id="nve" class="text-danger small"></span></div></div>
 <div id="cvi" class="bg-light rounded p-2 mt-2 small text-muted"></div>`}

function cvBind(r){
 const g=n=>$('#fb [name='+n+']'),vw=()=>$('#cvvw .combo');
 const info=()=>{const cl=get('clientes').find(x=>x.id==g('cliente').value),ve=get('vehiculos').find(x=>x.id==g('vehiculo').value),n=cl?get('vehiculos').filter(v=>v.cliente==cl.id).length:0;
  $('#cvi').innerHTML=cl?`<b>${esc(cl.nombre)}</b> · Tel. ${esc(cl.telefono)} · ${esc(cl.correo)} · ${n} vehículo${n==1?'':'s'} registrado${n==1?'':'s'}${ve?`<br>Vehículo: ${esc(ve.marca)} ${esc(ve.modelo)} ${esc(ve.anio)} · Placa ${esc(ve.placa)}`:''}`:'Escribe el nombre del cliente y elígelo de la lista para ver sus vehículos.'};
 const pintar=sel=>{const cid=g('cliente').value,ops=opsVehiculos(cid);
  comboSet(vw(),ops,sel!==undefined?sel:(ops.length==1?ops[0].id:''),!cid?'Primero elige un cliente':ops.length?'Escribe o elige el vehículo...':'Este cliente no tiene vehículos: registra uno');
  if($('#cvnb'))$('#cvnb').classList.toggle('d-none',!cid);$('#cvn').classList.add('d-none');info()};
 formOn('change',e=>{if(e.target.name=='cliente')pintar();if(e.target.name=='vehiculo')info()});
 if($('#cvnb')){
  $('#cvnb').onclick=()=>{const cl=get('clientes').find(x=>x.id==g('cliente').value);if(!cl)return;$('#cvnc').textContent=cl.nombre;$('#cvn').classList.remove('d-none');$('#nve').textContent='';$('#nvp').focus()};
  $('#nvc').onclick=()=>$('#cvn').classList.add('d-none');
  $('#nvg').onclick=()=>{
   const cl=get('clientes').find(x=>x.id==g('cliente').value),placa=$('#nvp').value.trim().replace(/\s+/g,' '),marca=$('#nvm').value.trim(),modelo=$('#nvo').value.trim(),anio=$('#nva').value.trim(),e=$('#nve');
   if(!cl)return;if(!placa||!marca||!modelo||!anio)return e.textContent='Completa placa, marca, modelo y año.';
   const dup=get('vehiculos').find(v=>nrm0('vehiculos',v.placa)==nrm0('vehiculos',placa));if(dup)return e.textContent=`Ya existe un vehículo con la placa «${dup.placa}» (${nm('clientes',dup.cliente)}).`;
   const nv={id:Date.now(),placa,marca,modelo,anio:Number(anio),cliente:cl.id,por:u.id,porNombre:u.nombre,creado:new Date().toISOString()};
   put('vehiculos',[...get('vehiculos'),nv]);
   log('Creó registro','vehiculos',placa,`Placa / VIN: ${placa}\nMarca: ${marca}\nModelo: ${modelo}\nAño: ${anio}\nCliente: ${cl.nombre}`);
   pintar(nv.id)}}
 pintar(r&&r.vehiculo)}
