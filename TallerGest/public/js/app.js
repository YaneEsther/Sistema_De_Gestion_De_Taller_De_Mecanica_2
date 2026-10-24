/* TallerGest – lógica completa (datos en el servidor, SQLite) */
const $=s=>document.querySelector(s);
let DB={},pend=0;const SNAP={};
const tk=()=>(JSON.parse(sessionStorage.getItem('tg_ses')||'null')||{}).token;
async function api(m,url,body){
 const r=await fetch(url,{method:m,headers:{'Content-Type':'application/json',...(tk()?{Authorization:'Bearer '+tk()}:{})},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));
 if(r.status==401&&!url.includes('login')){sessionStorage.removeItem('tg_ses');location='index.html';throw new Error('401')}
 if(!r.ok)throw new Error(j.error||'Error del servidor');return j}
const get=(k,d=[])=>DB[k]??d;
const snap=a=>new Map(a.map(x=>[String(x.id),JSON.stringify(x)]));
function send(k,b){pend++;api('POST','/api/data/'+k,b).catch(e=>{if(e.message!='401')alert('No se pudo guardar: '+e.message+'. Se recargarán los datos.');cargar().then(()=>window.__redraw&&window.__redraw()).catch(()=>{})}).finally(()=>pend--)}
const put=(k,v)=>{
 DB[k]=v;if(k=='cfg'){send(k,{up:[{id:'cfg',...v}],del:[]});return}
 const prev=SNAP[k]||new Map(),nw=snap(v);
 const up=v.filter(x=>prev.get(String(x.id))!==nw.get(String(x.id))),del=[...prev.keys()].filter(id=>!nw.has(id));
 SNAP[k]=nw;if(up.length||del.length)send(k,{up,del})};
async function cargar(){const d=await api('GET','/api/data');d.cfg=d.cfg&&d.cfg[0]?(({id,...r})=>r)(d.cfg[0]):{};DB=d;for(const k in d)if(Array.isArray(d[k]))SNAP[k]=snap(d[k])}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLES={admin:'Administrador',mecanico:'Mecánico',recepcion:'Recepcionista',facturador:'Facturador'};
const A='admin',R='recepcion',ME='mecanico',F='facturador';
const METODOS=['Efectivo','Tarjeta de crédito','Tarjeta de débito','Transferencia','Cheque'];
const ESTADOS=['Recibida','Diagnosticada','Cotizada','Aprobada','En ejecución','Finalizada','Facturada','Pagada'];
/* Módulos: t=título, i=icono, r=roles con acceso, f=campos [clave,etiqueta,tipo,opciones] */
const M={
clientes:{t:'Registro de clientes',i:'people',r:[A,R],f:[['nombre','Nombre completo'],['telefono','Teléfono','tel'],['correo','Correo electrónico','email'],['direccion','Dirección']]},
vehiculos:{t:'Registro de vehículos',i:'car-front',r:[A,R],f:[['placa','Placa / VIN'],['marca','Marca'],['modelo','Modelo'],['anio','Año','number'],['cliente','Cliente','ref','clientes']]},
historial:{t:'Historial de mantenimiento',i:'clock-history',r:[A,R,ME],f:[['vehiculo','Vehículo','ref','vehiculos'],['fecha','Fecha','date'],['servicio','Servicio'],['km','Kilometraje','number'],['tecnico','Técnico']]},
recepcion:{t:'Recepción del vehículo',i:'box-arrow-in-right',r:[A,R],f:[['vehiculo','Vehículo','ref','vehiculos'],['fecha','Fecha','date'],['km','Kilometraje','number'],['obs','Observaciones','textarea']]},
diagnostico:{t:'Diagnóstico',i:'clipboard2-pulse',r:[A,ME],f:[['orden','Orden de trabajo','ref','ordenes',o=>o.estado=='Recibida'],['resultado','Resultado','select',['Sin anomalías','Con fallas','Requiere revisión adicional']],['hallazgos','Descripción / hallazgos','textarea']]},
ordenes:{t:'Órdenes de trabajo',i:'tools',r:[A,R,ME],f:[['codigo','N° de orden'],['cliente','Cliente','ref','clientes'],['vehiculo','Vehículo','ref','vehiculos'],['estado','Estado','select',ESTADOS],['fecha','Fecha','date'],['motivo','Motivo / falla reportada','textarea']]},
mecanicos:{t:'Asignación de mecánicos',i:'person-gear',r:[A,R],f:[['orden','Orden de trabajo','ref','ordenes',o=>o.estado=='Recibida'],['mecanico','Mecánico','ref','usuarios',x=>x.rol==ME&&x.estado=='Activo'],['fecha','Fecha de asignación','date']]},
servicios:{t:'Gestión de servicios',i:'wrench-adjustable',r:[A,R],f:[['descripcion','Descripción'],['categoria','Categoría','select',['Mantenimiento','Reparación','Diagnóstico']],['precio','Precio (RD$)','number']]},
repuestos:{t:'Gestión de repuestos',i:'gear',r:[A,ME],f:[['codigo','Código'],['descripcion','Descripción'],['stock','Stock','number'],['precio','Precio (RD$)','number']]},
cotizaciones:{t:'Cotizaciones',i:'file-earmark-text',r:[A,R,F],f:[['orden','Orden de trabajo','ref','ordenes'],['descripcion','Servicio / repuesto'],['total','Total (RD$)','number'],['estado','Estado','select',['Pendiente','Aprobada','Rechazada']]]},
aprobacion:{t:'Aprobación del cliente',i:'check2-circle',r:[A,R],f:[['cotizacion','Cotización','ref','cotizaciones',c=>c.estado=='Pendiente'],['decision','Decisión','select',['Aprobada','Rechazada']],['fecha','Fecha','date'],['comentario','Observaciones del cliente','textarea']]},
ejecucion:{t:'Ejecución del trabajo',i:'play-circle',r:[A,ME],f:[['orden','Orden de trabajo','ref','ordenes',o=>['Aprobada','En ejecución'].includes(o.estado)],['etapa','Etapa','select',['Recepción','Diagnóstico','Repuestos','Ejecución','Finalización']],['notas','Notas del trabajo','textarea']]},
facturacion:{t:'Facturación',i:'receipt',r:[A,F],f:[['numero','N° de factura'],['orden','Orden de trabajo','ref','ordenes'],['total','Total (RD$)','number'],['fecha','Fecha','date']]},
pagos:{t:'Pagos',i:'credit-card',r:[A,F],f:[['factura','Factura','ref','facturacion'],['monto','Monto (RD$)','number'],['metodo','Método de pago','select',METODOS],['fecha','Fecha','date'],['detalle','Detalle']]},
usuarios:{t:'Usuarios y roles',i:'person-badge',r:[A],f:[['usuario','Usuario'],['nombre','Nombre completo'],['clave','Contraseña','password'],['rol','Rol','select',Object.keys(ROLES)],['estado','Estado','select',['Activo','Inactivo']]]},
auditoria:{t:'Auditoría',i:'shield-check',r:[A],ro:1,f:[['fecha','Fecha y hora'],['nombre','Usuario'],['accion','Acción'],['modulo','Módulo']]},
reportes:{t:'Reportes',i:'bar-chart',r:[A,F],custom:1},
configuracion:{t:'Configuración',i:'sliders',r:[A],custom:1}
};
const first=k=>M[k].f[0][0];
const nm=(k,id)=>{const r=get(k).find(x=>x.id==id);return r?(k=='usuarios'?r.nombre:r[first(k)]):'—'};
const u=JSON.parse(sessionStorage.getItem('tg_ses')||'null'),pg=document.body.dataset.m;

const mine=()=>get('mecanicos').filter(a=>a.mecanico==u.id).map(a=>String(a.orden));
const vis=(k,rows)=>u&&u.rol==ME?(k=='ordenes'?rows.filter(o=>mine().includes(String(o.id))):k=='ejecucion'?rows.filter(e=>mine().includes(String(e.orden))):rows):rows;
const BC={Pagada:'success',Finalizada:'success',Facturada:'success',Aprobada:'success',Activo:'success','Sin anomalías':'success',Parcial:'warning',Pendiente:'warning',Recibida:'secondary',Diagnosticada:'info',Cotizada:'info','En ejecución':'primary',Rechazada:'danger',Inactivo:'danger','Con fallas':'danger'};
const bdg=v=>`<span class="badge text-bg-${BC[v]||'secondary'}">${esc(v)}</span>`;

function log(accion,modulo){const l=get('auditoria');l.unshift({id:Date.now()+Math.random(),fecha:new Date().toLocaleString('es-DO'),usuario:u?u.usuario:'—',nombre:u?u.nombre:'—',accion,modulo});put('auditoria',l.slice(0,300))}

/* Reglas del módulo de usuarios: siempre debe quedar un administrador activo */
function chkUsuarios(lista,reg){
 if(lista.some(x=>x.usuario==reg.usuario&&x.id!=reg.id&&lista.indexOf(x)!=lista.findIndex(y=>y.id==reg.id)&&x.id!==reg.id))return 'Ese nombre de usuario ya existe.';
 if(!lista.some(x=>x.rol==A&&x.estado=='Activo'))return 'Debe existir al menos un administrador activo. No se puede borrar, desactivar ni cambiar de rol al único administrador.';
 return null}

function login(){
 $('#app').innerHTML=`<div class="login-bg"><div class="card login-card p-4"><div class="text-center mb-3"><div class="logo"><img src="${logo()}" height="34" style="border-radius:8px" alt=""> Taller<span>Gest</span></div><div class="text-muted">Tu taller, mejor organizado</div></div>
 <form id="f"><div id="err" class="alert alert-danger py-2 d-none"></div><label class="form-label">Usuario</label><input class="form-control mb-3" id="us" required autofocus><label class="form-label">Contraseña</label><input type="password" class="form-control mb-3" id="cl" required><button class="btn btn-primary w-100">Iniciar sesión</button></form>
</div></div>`;
 $('#f').onsubmit=async e=>{e.preventDefault();const er=$('#err');er.classList.remove('d-none');er.textContent='Verificando...';
  try{const r=await api('POST','/api/login',{usuario:$('#us').value.trim(),clave:$('#cl').value});sessionStorage.setItem('tg_ses',JSON.stringify({...r.user,token:r.token,inicio:new Date().toISOString()}));location='dashboard.html'}catch(x){er.textContent=x.message}}}

function shell(){
 const nav=Object.entries(M).filter(([k,m])=>m.r.includes(u.rol));
 $('#app').innerHTML=`<div class="d-flex"><aside class="offcanvas-md offcanvas-start sidebar" id="sb"><div class="p-3 brand"><img src="${logo()}" height="34" style="border-radius:8px" alt=""> Taller<span style="color:var(--dorado)">Gest</span></div>
 <nav class="nav flex-column px-2 pb-3"><a class="nav-link ${pg=='dashboard'?'active':''}" href="dashboard.html"><i class="bi bi-house"></i>Inicio</a>${nav.map(([k,m])=>`<a class="nav-link ${k==pg?'active':''}" href="${k}.html"><i class="bi bi-${m.i}"></i>${m.t}</a>`).join('')}</nav></aside>
 <div class="flex-grow-1 min-vw-0"><header class="topbar d-flex align-items-center gap-2 px-3 py-2 bg-white shadow-sm"><button class="btn d-md-none" data-bs-toggle="offcanvas" data-bs-target="#sb"><i class="bi bi-list fs-4"></i></button><div class="ms-auto"></div>${1?'<div class="dropdown"><button class="btn btn-sm position-relative" id="bell" data-bs-toggle="dropdown"><i class="bi bi-bell fs-5"></i><span id="bn" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none"></span></button><ul class="dropdown-menu dropdown-menu-end p-0" id="bl" style="width:300px"></ul></div>':''}<span class="small text-muted">${esc(u.nombre)} · ${ROLES[u.rol]}</span><button class="btn btn-sm btn-outline-primary" id="out">Salir</button></header><main class="p-3 p-md-4" id="main"></main></div></div>`;
 $('#out').onclick=()=>{log('Cierre de sesión','Login');sessionStorage.removeItem('tg_ses');location='index.html'};
 {bell();$('#bell').addEventListener('click',()=>setTimeout(()=>{put('notif',get('notif').map(x=>x.para==u.id?{...x,leida:true}:x));$('#bn').classList.add('d-none')},50));addEventListener('storage',bell)}
 pg=='dashboard'?dash():pg=='reportes'?rep():pg=='configuracion'?cfg():crud(pg)}

function bell(){
 const n=get('notif').filter(x=>x.para==u.id),nu=n.filter(x=>!x.leida).length;
 $('#bn').textContent=nu;$('#bn').classList.toggle('d-none',!nu);
 $('#bl').innerHTML=n.length?n.slice(0,8).map(x=>`<li class="dropdown-item-text small border-bottom ${x.leida?'text-muted':'fw-semibold'}">${esc(x.texto)}<div class="text-muted fw-normal">${esc(x.fecha)}</div></li>`).join(''):'<li class="dropdown-item-text small text-muted">Sin notificaciones</li>'}
function dash(){window.__redraw=dash;
 const ks=['clientes','vehiculos','ordenes','cotizaciones','servicios','repuestos'].filter(k=>M[k].r.includes(u.rol));
 $('#main').innerHTML=`<h4>Hola, ${esc(u.nombre)}</h4><p class="text-muted">Bienvenido al sistema TallerGest</p><div class="row g-3">${ks.map(k=>`<div class="col-6 col-lg-4"><a href="${k}.html" class="text-decoration-none text-reset"><div class="card stat p-3 d-flex flex-row align-items-center gap-3"><i class="bi bi-${M[k].i}"></i><div><div class="text-muted small">${u.rol==ME&&k=='ordenes'?'Mis órdenes asignadas':M[k].t}</div><div class="n">${vis(k,get(k)).length}</div></div></div></a></div>`).join('')}</div>`}

function rep(){
 const adm=u.rol==A;let modo=adm?'hist':'turno';
 const ult=()=>get('cierres').filter(x=>x.por==u.id).map(x=>x.hasta).sort().pop()||'';
 const ini=()=>(u.inicio||'')>ult()?u.inicio:ult();
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
   const c=get('cierres');c.push({id:Date.now(),por:u.id,nombre:u.nombre,desde:ini(),hasta:new Date().toISOString(),pagos:pg.length,total:suma(pg,'monto'),metodos:Object.fromEntries(METODOS.map(m=>[m,suma(pg.filter(x=>x.metodo==m),'monto')]))});
   put('cierres',c);log('Cierre de caja','reportes');pinta()}};
 pinta()}
function cfg(){
 const c=get('cfg',{});let logoData=c.logo||'';
 const campo=(k,l,t='text')=>`<div class="col-md-6"><label class="form-label">${l}</label><input class="form-control" name="${k}" type="${t}" value="${esc(c[k])}"></div>`;
 $('#main').innerHTML=`<h4 class="mb-3">Configuración del taller</h4><div class="card p-3" style="max-width:760px"><form id="f"><div class="row g-3">${campo('nombre','Nombre del taller')}${campo('rnc','RNC')}${campo('telefono','Teléfono')}${campo('correo','Correo','email')}<div class="col-12"><label class="form-label">Dirección</label><input class="form-control" name="direccion" value="${esc(c.direccion)}"></div><div class="col-12"><label class="form-label">Pie de página de los documentos</label><input class="form-control" name="pie" value="${esc(c.pie)}" placeholder="Gracias por su preferencia"></div><div class="col-12"><label class="form-label">Logo (facturas, cotizaciones y reportes)</label><div class="d-flex align-items-center gap-3"><img id="lp" src="${logoData||LOGO}" height="64" style="background:#fff;border-radius:10px;border:1px solid #ddd;padding:4px" alt=""><input type="file" id="lf" accept="image/*" class="form-control"></div></div></div><button class="btn btn-warning mt-3">Guardar</button> <span id="ok" class="text-success ms-2"></span></form></div>
 <div class="mt-3"><button class="btn btn-outline-primary" id="bk"><i class="bi bi-download"></i> Descargar respaldo de la base de datos</button></div>`;
 $('#lf').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,300/im.width),cv=document.createElement('canvas');cv.width=im.width*k;cv.height=im.height*k;cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);logoData=cv.toDataURL('image/png');$('#lp').src=logoData};im.src=r.result};r.readAsDataURL(f)};
 $('#f').onsubmit=e=>{e.preventDefault();put('cfg',{...Object.fromEntries(new FormData(e.target)),logo:logoData});log('Configuración actualizada','configuracion');$('#ok').textContent='Guardado'};
 $('#bk').onclick=async()=>{const r=await fetch('/api/respaldo',{headers:{Authorization:'Bearer '+tk()}});if(!r.ok)return alert('No se pudo generar el respaldo.');const b=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='tallergest-respaldo-'+hoy()+'.db';a.click()}}


/* Cotizaciones: selección de servicios y repuestos con cálculo automático (ITBIS 18%) */
const fmt=n=>Number(n).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2});
function cotBody(r,k){
 const fac=k=='facturacion',it=r&&r.items||[],sel=(t,id)=>it.find(x=>x.t==t&&x.id==id);
 const row=(t,x)=>{const s=sel(t,x.id);return `<div class="d-flex align-items-center gap-2 border-bottom py-1"><input type="checkbox" class="form-check-input ci" data-t="${t}" data-id="${x.id}" data-d="${esc(x.descripcion)}" data-p="${x.precio||0}" ${s?'checked':''}><span class="flex-grow-1 small">${esc(x.descripcion)}${t=='r'?` <span class="text-muted">(stock ${esc(x.stock)})</span>`:''}</span>${t=='r'?`<input type="number" min="1" value="${s?s.c:1}" class="form-control form-control-sm cq" style="width:68px">`:''}<span class="text-nowrap small">RD$ ${fmt(x.precio||0)}</span></div>`};
 const lista=(t,k2,vacio)=>get(k2).length?get(k2).map(x=>row(t,x)).join(''):`<div class="text-muted small py-2">${vacio}</div>`;
 const ordSel=`<select name="orden" class="form-select" required><option value="">Seleccionar...</option>${get('ordenes').filter(o=>(r&&o.id==r.orden)||(fac?o.estado=='Finalizada':['Diagnosticada','Cotizada'].includes(o.estado))).map(o=>`<option value="${o.id}" ${r&&o.id==r.orden?'selected':''}>${esc(o.codigo)} · ${esc(nm('clientes',o.cliente))} · ${esc(nm('vehiculos',o.vehiculo))}</option>`).join('')}</select>`;
 const nums=get('facturacion').map(x=>parseInt(String(x.numero).replace(/\D/g,''))||0);
 const cab=fac?`<div class="row g-2"><div class="col-md-3"><label class="form-label">N° de factura</label><input name="numero" class="form-control" required value="${esc(r?r.numero:'FAC-'+String(Math.max(0,...nums)+1).padStart(3,'0'))}"></div><div class="col-md-6"><label class="form-label">Orden de trabajo</label>${ordSel}</div><div class="col-md-3"><label class="form-label">Fecha</label><input type="date" name="fecha" class="form-control" required value="${r?r.fecha:new Date().toISOString().slice(0,10)}"></div></div><div id="fh" class="small text-muted mt-1">Al elegir la orden se cargan los ítems de su cotización aprobada.</div>`
 :`<div class="row g-2"><div class="col-md-8"><label class="form-label">Orden de trabajo</label>${ordSel}</div><div class="col-md-4"><label class="form-label">Estado</label><select name="estado" class="form-select">${['Pendiente','Aprobada','Rechazada'].map(o=>`<option ${r&&r.estado==o?'selected':''}>${o}</option>`).join('')}</select></div></div>`;
 return cab+`<div class="row g-3 mt-1"><div class="col-md-6"><h6 class="mb-1">Servicios</h6><div style="max-height:220px;overflow:auto">${lista('s','servicios','No hay servicios. Créalos en «Gestión de servicios».')}</div></div>
 <div class="col-md-6"><h6 class="mb-1">Repuestos <small class="text-muted fw-normal">(cantidad)</small></h6><div style="max-height:220px;overflow:auto">${lista('r','repuestos','No hay repuestos. Créalos en «Gestión de repuestos».')}</div></div></div>
 <div class="bg-light rounded p-3 mt-3 text-end"><div>Subtotal: <b id="cs">0.00</b></div><div>ITBIS (18%): <b id="ci2">0.00</b></div><div class="fs-5">Total: RD$ <b id="ct" style="color:var(--azul)">0.00</b></div></div>`}
/* Factura: al elegir la orden se cargan los ítems de su cotización aprobada */
function facCarga(e){
 const o=e.target.value,c=get('cotizaciones').filter(x=>x.orden==o&&x.estado=='Aprobada'&&x.items).pop(),h=$('#fh');
 document.querySelectorAll('.ci').forEach(b=>{b.checked=false});
 if(c){c.items.forEach(x=>{const b=document.querySelector(`.ci[data-t="${x.t}"][data-id="${x.id}"]`);if(b){b.checked=true;const q=b.parentElement.querySelector('.cq');if(q)q.value=x.c}});h.textContent='Ítems cargados desde la cotización aprobada. Puedes ajustarlos.'}
 else h.textContent=o?'Esta orden no tiene cotización aprobada: selecciona los ítems manualmente.':'';
 cotCalc()}
/* Pagos: formulario dinámico según el método */
const pagado=(fid,ex)=>get('pagos').filter(p=>p.factura==fid&&p.id!=ex).reduce((a,p)=>a+Number(p.monto),0);
const CAMPOS={'Efectivo':[['recibido','Efectivo recibido (RD$)','number']],
 'Tarjeta de crédito':[['marca','Marca','select',['Visa','Mastercard','American Express','Otra']],['ultimos4','Últimos 4 dígitos'],['autorizacion','N° de aprobación'],['cuotas','Cuotas','select',['1','3','6','12']]],
 'Tarjeta de débito':[['marca','Marca','select',['Visa','Mastercard','American Express','Otra']],['ultimos4','Últimos 4 dígitos'],['autorizacion','N° de aprobación']],
 'Transferencia':[['banco','Banco'],['referencia','N° de referencia']],
 'Cheque':[['banco','Banco'],['ncheque','N° de cheque']]};
function pagoBody(r){
 return `<div class="row g-2"><div class="col-md-8"><label class="form-label">Factura</label><select name="factura" class="form-select" required><option value="">Seleccionar...</option>${get('facturacion').filter(f=>(r&&f.id==r.factura)||Number(f.total)-pagado(f.id)>0.001).map(f=>`<option value="${f.id}" ${r&&f.id==r.factura?'selected':''}>${esc(f.numero)} · ${esc(nm('ordenes',f.orden))} · RD$ ${fmt(f.total)}</option>`).join('')}</select></div>
 <div class="col-md-4"><label class="form-label">Fecha</label><input type="date" name="fecha" class="form-control" required value="${r?r.fecha:new Date().toISOString().slice(0,10)}"></div></div>
 <div id="pr" class="bg-light rounded p-2 mt-2 small text-muted">Selecciona una factura.</div>
 <div class="row g-2 mt-1"><div class="col-md-6"><label class="form-label">Método de pago</label><select name="metodo" class="form-select" required>${METODOS.map(o=>`<option ${r&&r.metodo==o?'selected':''}>${o}</option>`).join('')}</select></div>
 <div class="col-md-6"><label class="form-label">Monto a pagar (RD$)</label><input name="monto" type="number" step="any" min="0.01" class="form-control" required value="${r?r.monto:''}"></div></div>
 <div id="pm" class="row g-2 mt-1"></div><div id="pt" class="rounded p-2 mt-3 fw-semibold"></div>
 <label class="form-label mt-2">Notas</label><textarea name="notas" rows="2" class="form-control">${esc(r&&r.notas)}</textarea>`}
function pagoBind(r){
 const g=n=>$('#fb [name='+n+']'),fa=()=>get('facturacion').find(x=>x.id==g('factura').value);
 const calc=()=>{const f=fa(),m=+g('monto').value||0;
  if(!f){$('#pr').textContent=get('facturacion').some(x=>Number(x.total)-pagado(x.id)>0.001)?'Selecciona una factura.':'No hay facturas con saldo pendiente.';$('#pt').textContent='';$('#pt').className='';return}
  const pag=pagado(f.id,r&&r.id),saldo=Math.max(0,Number(f.total)-pag);
  $('#pr').innerHTML=`Total <b>RD$ ${fmt(f.total)}</b> · Pagado <b>RD$ ${fmt(pag)}</b> · Saldo <b>RD$ ${fmt(saldo)}</b>`;
  let t=`Saldo después de este pago: RD$ ${fmt(Math.max(0,saldo-m))}`,c='bg-light';
  if(m>saldo+0.001){t='El monto supera el saldo de la factura.';c='bg-danger-subtle text-danger'}
  else if(g('recibido')){const rc=+g('recibido').value||0;
   if(rc<m){t=`Faltan RD$ ${fmt(m-rc)} · `+t;c='bg-warning-subtle'}else{t=`Devolver al cliente: RD$ ${fmt(rc-m)} · `+t;c='bg-success-subtle'}}
  $('#pt').className='rounded p-2 mt-3 fw-semibold '+c;$('#pt').textContent=t};
 const pintar=()=>{$('#pm').innerHTML=CAMPOS[g('metodo').value].map(([n,l,t,o])=>`<div class="col-md-6"><label class="form-label">${l}</label>${t=='select'?`<select name="${n}" class="form-select">${o.map(x=>`<option ${r&&r[n]==x?'selected':''}>${x}</option>`).join('')}</select>`:`<input name="${n}" type="${t||'text'}" ${t=='number'?'step="any" min="0"':''} ${n=='ultimos4'?'maxlength="4" pattern="[0-9]{4}" title="4 dígitos"':''} class="form-control" required value="${esc(r&&r[n]!==undefined?r[n]:'')}">`}</div>`).join('');calc()};
 $('#fb').oninput=calc;
 $('#fb').onchange=e=>{if(e.target.name=='factura'){const f=fa();if(f)g('monto').value=Math.max(0,Number(f.total)-pagado(f.id,r&&r.id)).toFixed(2)}if(e.target.name=='metodo')pintar();calc()};
 pintar()}
function cotCalc(){
 const items=[...document.querySelectorAll('.ci:checked')].map(c=>{const q=c.parentElement.querySelector('.cq');return {t:c.dataset.t,id:c.dataset.id,d:c.dataset.d,p:+c.dataset.p,c:Math.max(1,+(q?q.value:1)||1)}});
 const sub=items.reduce((a,x)=>a+x.p*x.c,0),itbis=Math.round(sub*18)/100;
 if($('#cs')){$('#cs').textContent=fmt(sub);$('#ci2').textContent=fmt(itbis);$('#ct').textContent=fmt(sub+itbis)}
 return {items,sub,itbis,total:sub+itbis}}

const CV=['ordenes','recepcion','historial'];
const hoy=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const sig=(k,c,pre)=>pre+String(Math.max(0,...get(k).map(x=>parseInt(String(x[c]).replace(/\D/g,''))||0))+1).padStart(3,'0');
const lbl=(k,x)=>k=='ordenes'?`${x.codigo} · ${nm('clientes',x.cliente)} · ${nm('vehiculos',x.vehiculo)}`:k=='vehiculos'?`${x.placa} · ${x.marca} ${x.modelo}`:nm(k,x.id);
/* Cliente → vehículos del cliente (selects dependientes con ficha) */
function cvHTML(r){
 const cid=r&&r.cliente?r.cliente:(r&&r.vehiculo?(get('vehiculos').find(v=>v.id==r.vehiculo)||{}).cliente:'');
 return `<div class="row g-2 mt-1"><div class="col-md-6"><label class="form-label">Cliente</label><select name="cliente" id="cvc" class="form-select" required><option value="">Seleccionar...</option>${get('clientes').map(c=>`<option value="${c.id}" ${c.id==cid?'selected':''}>${esc(c.nombre)}</option>`).join('')}</select></div><div class="col-md-6"><label class="form-label">Vehículo</label><select name="vehiculo" id="cvv" class="form-select" required></select></div></div><div id="cvi" class="bg-light rounded p-2 mt-2 small text-muted"></div>`}
function cvBind(r){
 const c=$('#cvc'),v=$('#cvv'),i=$('#cvi');
 const info=()=>{const cl=get('clientes').find(x=>x.id==c.value),ve=get('vehiculos').find(x=>x.id==v.value);
  i.innerHTML=cl?`<b>${esc(cl.nombre)}</b> · Tel. ${esc(cl.telefono)} · ${esc(cl.correo)}${ve?`<br>Vehículo: ${esc(ve.marca)} ${esc(ve.modelo)} ${esc(ve.anio)} · Placa ${esc(ve.placa)}`:''}`:'Selecciona el cliente para ver sus vehículos.'};
 const pintar=()=>{const l=get('vehiculos').filter(x=>x.cliente==c.value);
  v.innerHTML=!c.value?'<option value="">Primero selecciona un cliente</option>':l.length?(l.length>1?'<option value="">Seleccionar...</option>':'')+l.map(x=>`<option value="${x.id}" ${r&&x.id==r.vehiculo?'selected':''}>${esc(x.placa)} · ${esc(x.marca)} ${esc(x.modelo)} ${esc(x.anio)}</option>`).join(''):'<option value="">Este cliente no tiene vehículos registrados</option>';info()};
 c.onchange=pintar;v.onchange=info;pintar()}
function histAuto(oid){
 const o=get('ordenes').find(x=>x.id==oid);if(!o||get('historial').some(h=>h.orden==o.id))return;
 const c=get('cotizaciones').find(x=>x.orden==o.id&&x.estado=='Aprobada'),as=get('mecanicos').find(a=>a.orden==o.id),rc=get('recepcion').filter(x=>x.vehiculo==o.vehiculo).pop(),h=get('historial');
 h.push({id:Date.now(),vehiculo:o.vehiculo,cliente:o.cliente,fecha:hoy(),servicio:c?c.descripcion:'Trabajo según orden '+o.codigo,km:rc?rc.km:'',tecnico:as?nm('usuarios',as.mecanico):'',orden:o.id});put('historial',h)}
/* Notificaciones y flujo automático entre áreas */
function notif(para,texto){
 const us=get('usuarios').filter(x=>x.estado=='Activo'&&(Array.isArray(para)?para.includes(x.rol):x.id==para)&&(!u||x.id!=u.id)),n=get('notif');
 us.forEach(x=>n.unshift({id:Date.now()+Math.random(),para:x.id,texto,fecha:new Date().toLocaleString('es-DO'),leida:false}));put('notif',n.slice(0,300))}
function avanzar(oid,e){const l=get('ordenes'),o=l.find(x=>x.id==oid);if(o&&ESTADOS.indexOf(e)>ESTADOS.indexOf(o.estado)){o.estado=e;put('ordenes',l)}}
function chkStock(items){for(const x of items||[]){if(x.t!='r')continue;const r=get('repuestos').find(y=>y.id==x.id);if(r&&Number(r.stock)<x.c)return `Stock insuficiente de «${x.d}»: hay ${r.stock} y se necesitan ${x.c}.`}return null}
function descontar(cid){const l=get('cotizaciones'),c=l.find(x=>x.id==cid);if(!c||c.stockDesc)return;const rs=get('repuestos');(c.items||[]).forEach(x=>{if(x.t=='r'){const r=rs.find(y=>y.id==x.id);if(r)r.stock=Math.max(0,Number(r.stock)-x.c)}});c.stockDesc=true;put('repuestos',rs);put('cotizaciones',l)}
function aprobar(cid,dec){
 const l=get('cotizaciones'),c=l.find(x=>x.id==cid);if(!c)return;c.estado=dec;put('cotizaciones',l);const ot=nm('ordenes',c.orden);
 if(dec=='Aprobada'){descontar(cid);avanzar(c.orden,'Aprobada');notif([F,A],`Cotización aprobada de ${ot}: ya se puede facturar.`);const as=get('mecanicos').find(a=>a.orden==c.orden);if(as)notif(as.mecanico,`El cliente aprobó la cotización de ${ot}: puedes iniciar el trabajo.`)}
 else if(dec=='Rechazada')notif([R,A],`El cliente rechazó la cotización de ${ot}.`)}
function despues(k,r,old){
 const ot=nm('ordenes',r.orden),nuevo=!old;
 if(k=='recepcion'&&nuevo&&!r.orden){const l=get('ordenes'),o={id:Date.now(),codigo:sig('ordenes','codigo','OT-'),cliente:r.cliente,vehiculo:r.vehiculo,estado:'Recibida',fecha:r.fecha,motivo:r.obs||''};l.push(o);put('ordenes',l);const rl=get('recepcion');rl.find(y=>y.id==r.id).orden=o.id;put('recepcion',rl);return 'Se creó automáticamente la orden de trabajo '+o.codigo+' para este vehículo.'}
 if(k=='mecanicos'&&(nuevo||old.mecanico!=r.mecanico||old.orden!=r.orden))notif(r.mecanico,`Se te asignó la orden ${ot} · Cliente: ${nm('clientes',(get('ordenes').find(o=>o.id==r.orden)||{}).cliente)}`);
 if(k=='diagnostico'&&nuevo){avanzar(r.orden,'Diagnosticada');notif([R,A],`Diagnóstico completado de ${ot} (${r.resultado}). Falta crear la cotización.`)}
 if(k=='cotizaciones'){avanzar(r.orden,'Cotizada');if(nuevo)notif([R],`Nueva cotización de ${ot} por RD$ ${fmt(r.total)}: pendiente de aprobación del cliente.`);if(r.estado!='Pendiente'&&(nuevo||old.estado!=r.estado))aprobar(r.id,r.estado)}
 if(k=='aprobacion'){const c=get('cotizaciones').find(x=>x.id==r.cotizacion);if(c&&(nuevo||old.decision!=r.decision))aprobar(c.id,r.decision)}
 if(k=='ejecucion'){if(r.etapa=='Ejecución')avanzar(r.orden,'En ejecución');if(r.etapa=='Finalización'){avanzar(r.orden,'Finalizada');histAuto(r.orden);notif([R,F,A],`Trabajo finalizado en ${ot}: ya se puede facturar y entregar el vehículo.`)}}
 if(k=='facturacion'&&nuevo){avanzar(r.orden,'Facturada');notif([F,A],`Nueva factura ${r.numero} por RD$ ${fmt(r.total)} pendiente de cobro.`)}
 if(k=='pagos'){const f=get('facturacion').find(x=>x.id==r.factura);if(f&&Number(f.total)-pagado(f.id)<=0.001){avanzar(f.orden,'Pagada');notif([R,A],`La factura ${f.numero} quedó pagada por completo.`)}}}
const LOGO='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#1E3A6D"/><circle cx="50" cy="50" r="34" fill="none" stroke="#D18B00" stroke-width="11" stroke-dasharray="9 7"/><circle cx="50" cy="50" r="28" fill="#D18B00"/><circle cx="50" cy="50" r="21" fill="#fff"/><path d="M33 56l4-9a4 4 0 0 1 4-3h18a4 4 0 0 1 4 3l4 9v8H33z" fill="#1E3A6D"/><circle cx="40" cy="62" r="4" fill="#fff"/><circle cx="60" cy="62" r="4" fill="#fff"/></svg>');
const logo=()=>get('cfg',{}).logo||LOGO;
/* Hoja con membrete (logo, datos del taller, pie) y apertura de impresión / PDF */
function abrir(tit,cuerpo){
 const c=get('cfg',{}),w=window.open('','_blank');if(!w)return alert('Permite las ventanas emergentes para imprimir.');
 w.document.write(`<html><head><meta charset="utf-8"><title>${esc(tit)}</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><style>body{font-family:system-ui,Arial,sans-serif;color:#1F2937}.enc{background:#1E3A6D;color:#fff;padding:16px 24px;display:flex;align-items:center;gap:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.enc img{height:64px;background:#fff;border-radius:10px;padding:4px}.fil{height:6px;background:#D18B00;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cu{padding:24px 24px 70px}.pie{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:.8rem;color:#6B7280;border-top:2px solid #D18B00;padding:6px;background:#fff}th{background:#E9EDF2!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><div class="enc"><img src="${c.logo||LOGO}" alt=""><div><div style="font-size:1.5rem;font-weight:700">${esc(c.nombre||'TallerGest')}</div><div style="font-size:.85rem">${[c.rnc&&'RNC '+c.rnc,c.telefono,c.correo].filter(Boolean).map(x=>esc(x)).join(' · ')}<br>${esc(c.direccion||'')}</div></div></div><div class="fil"></div><div class="cu"><h4 style="color:#1E3A6D">${esc(tit)}</h4>${cuerpo}</div><div class="pie">${esc(c.pie||'Gracias por su preferencia')}</div><script>onload=()=>setTimeout(print,800)<\/script></body></html>`);
 w.document.close()}
const tabItems=d=>`<table class="table table-sm mt-3"><thead><tr><th>Descripción</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Importe</th></tr></thead><tbody>${(d.items||[{d:d.descripcion||'—',c:1,p:d.total}]).map(x=>`<tr><td>${esc(x.d)}</td><td class="text-end">${x.c}</td><td class="text-end">${fmt(x.p)}</td><td class="text-end">${fmt(x.p*x.c)}</td></tr>`).join('')}</tbody></table><div class="text-end">Subtotal: ${fmt(d.subtotal||d.total)}<br>ITBIS (18%): ${fmt(d.itbis||0)}<br><span class="fs-5"><b>Total: RD$ ${fmt(d.total)}</b></span></div>`;
const cab=(o,der)=>`<div class="row"><div class="col-6"><b>Cliente:</b> ${esc(nm('clientes',o.cliente))}<br><b>Vehículo:</b> ${esc(nm('vehiculos',o.vehiculo))}</div><div class="col-6 text-end">${der}</div></div>`;
function imprimir(fid){
 const f=get('facturacion').find(x=>x.id==fid);if(!f)return;
 const o=get('ordenes').find(x=>x.id==f.orden)||{},ps=get('pagos').filter(p=>p.factura==f.id),pag=ps.reduce((a,p)=>a+Number(p.monto),0),saldo=Math.max(0,Number(f.total)-pag);
 abrir('Factura '+f.numero,cab(o,`<b>Fecha:</b> ${esc(f.fecha)}<br><b>Orden:</b> ${esc(o.codigo)}<br>${saldo<=0.001?'<span class="badge text-bg-success">PAGADA</span>':''}`)+tabItems(f)+`<div class="text-end mt-2">Pagado: ${fmt(pag)}<br><b>Saldo: RD$ ${fmt(saldo)}</b></div>${ps.length?`<h6 class="mt-3">Pagos</h6><ul class="small">${ps.map(p=>`<li>${esc(p.fecha)} · ${esc(p.metodo)} · RD$ ${fmt(p.monto)} ${esc(p.detalle||'')}</li>`).join('')}</ul>`:''}`)}
function imprimirCot(cid){
 const c=get('cotizaciones').find(x=>x.id==cid);if(!c)return;const o=get('ordenes').find(x=>x.id==c.orden)||{};
 abrir('Cotización '+(o.codigo||''),cab(o,`<b>Fecha:</b> ${new Date(Number(c.id)||Date.now()).toLocaleDateString('es-DO')}<br><b>Orden:</b> ${esc(o.codigo)}<br><b>Estado:</b> ${esc(c.estado)}`)+tabItems(c)+'<p class="small text-muted mt-3">Esta cotización es válida por 15 días a partir de su fecha de emisión.</p><div class="row mt-5 pt-4 text-center"><div class="col-6"><hr class="mx-4">Firma del taller</div><div class="col-6"><hr class="mx-4">Aceptado por el cliente</div></div>')}
async function xlsx(nombre,hojas){
 if(!window.XLSX)await new Promise((ok,er)=>{const t=document.createElement('script');t.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';t.onload=ok;t.onerror=er;document.head.appendChild(t)}).catch(()=>alert('No se pudo cargar el generador de Excel (requiere internet).'));
 if(!window.XLSX)return;const wb=XLSX.utils.book_new();for(const h in hojas)XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(hojas[h]),h);XLSX.writeFile(wb,nombre+'.xlsx')}
function crud(k){
 const m=M[k],cols=m.f.filter(f=>f[2]!='textarea').slice(0,5),noNew=m.ro||(u.rol==ME&&k=='ordenes');
 const ex=k=='facturacion'?[['Pagado',r=>fmt(pagado(r.id))],['Saldo',r=>fmt(Math.max(0,Number(r.total)-pagado(r.id)))],['Estado',r=>{const p=pagado(r.id);return bdg(p<=0?'Pendiente':p+0.001>=Number(r.total)?'Pagada':'Parcial')}],['',r=>`<button class="btn btn-sm btn-outline-primary" data-p="${r.id}" title="Imprimir factura"><i class="bi bi-printer"></i></button>`]]:k=='pagos'?[['',r=>`<button class="btn btn-sm btn-outline-primary" data-p="${r.factura}" title="Imprimir factura"><i class="bi bi-printer"></i></button>`]]:k=='recepcion'||k=='historial'?[['Orden',r=>r.orden?esc(nm('ordenes',r.orden)):'—']]:k=='cotizaciones'?[['',r=>`<button class="btn btn-sm btn-outline-primary" data-pc="${r.id}" title="Imprimir cotización"><i class="bi bi-printer"></i></button>`]]:[];
 const cell=(f,r)=>f[2]=='ref'?esc(nm(f[3],r[f[0]])):f[2]=='password'?'••••':['estado','decision','resultado'].includes(f[0])&&r[f[0]]?bdg(r[f[0]]):f[0]=='stock'&&r.stock!==undefined&&r.stock!==''?esc(r.stock)+(+r.stock<=5?' <span class="badge text-bg-danger">Bajo</span>':''):(f[0]=='total'||f[0]=='monto')&&r[f[0]]!==undefined&&r[f[0]]!==''?fmt(r[f[0]]):esc(r[f[0]]);
 const inp=(f,v)=>{const n=`name="${f[0]}" class="form-control" `,req=f[2]=='textarea'?'':'required';
  if(k=='ordenes'&&f[0]=='codigo')return `<input name="codigo" class="form-control" readonly value="${v||sig('ordenes','codigo','OT-')}"><div class="form-text">Se genera automáticamente.</div>`;
  if(k=='ordenes'&&f[0]=='estado')return u.rol==A&&v?`<select name="estado" class="form-select">${ESTADOS.map(o=>`<option ${o==v?'selected':''}>${o}</option>`).join('')}</select>`:`<div>${bdg(v||'Recibida')}<input type="hidden" name="estado" value="${v||'Recibida'}"></div><div class="form-text">El estado cambia solo según avance el trabajo. Solo el administrador puede corregirlo.</div>`;
  if(f[2]=='textarea')return `<textarea ${n}rows="3">${esc(v)}</textarea>`;
  if(f[2]=='select')return `<select name="${f[0]}" class="form-select" required>${(f[0]=='estado'&&k=='ordenes'&&v&&u.rol!=A?f[3].slice(Math.max(0,f[3].indexOf(v))):f[3]).map(o=>`<option value="${o}" ${o==v?'selected':''}>${o=='admin'||ROLES[o]?ROLES[o]||o:o}</option>`).join('')}</select>`;
  if(f[2]=='ref'){const l=vis(f[3],get(f[3])).filter(x=>!f[4]||f[4](x)||x.id==v);return `<select name="${f[0]}" class="form-select" required><option value="">Seleccionar...</option>${l.map(x=>`<option value="${x.id}" ${x.id==v?'selected':''}>${esc(lbl(f[3],x))}</option>`).join('')}</select>`}
  return `<input ${n}type="${f[2]||'text'}" ${f[2]=='number'?'step="any"':''} value="${f[2]=='password'?'':esc(v)}" ${f[2]=='password'&&cur?'placeholder="(sin cambios)"':req}>`};
 $('#main').innerHTML=`<div class="d-flex justify-content-between mb-3"><h4>${m.t}</h4>${noNew?'':'<button class="btn btn-warning" id="nw"><i class="bi bi-plus-lg"></i> Nuevo</button>'}</div>
 <div class="row g-2 mb-3"><div class="col"><input id="q" class="form-control" placeholder="Buscar..."></div>${k=='historial'?`<div class="col-md-5"><select id="fv" class="form-select"><option value="">Todos los vehículos</option>${get('vehiculos').map(v=>`<option value="${v.id}">${esc(v.placa)} · ${esc(v.marca)} ${esc(v.modelo)} · ${esc(nm('clientes',v.cliente))}</option>`).join('')}</select></div>`:''}</div>
 <div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}${ex.map(e=>`<th>${e[0]}</th>`).join('')}${noNew?'':'<th></th>'}</tr></thead><tbody id="tb"></tbody></table></div></div>
 <div class="modal fade" id="md" tabindex="-1"><div class="modal-dialog ${k=='cotizaciones'||k=='facturacion'||k=='pagos'?'modal-lg':''}"><form class="modal-content" id="f"><div class="modal-header"><h5 class="modal-title">${m.t}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="fb"></div><div class="modal-footer"><div id="err" class="text-danger small me-auto"></div><button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-warning">Guardar</button></div></form></div></div>`;
 const modal=new bootstrap.Modal('#md');let cur=null;
 const draw=()=>{const q=$('#q').value.toLowerCase(),fv=$('#fv')?$('#fv').value:'',rows=vis(k,get(k)).filter(r=>(!fv||r.vehiculo==fv)&&cols.some(c=>cell(c,r).replace(/<[^>]+>/g,'').toLowerCase().includes(q))).sort((a,b)=>k=='historial'?String(b.fecha).localeCompare(String(a.fecha)):0);
  $('#tb').innerHTML=rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td>${cell(c,r)}</td>`).join('')}${ex.map(e=>`<td>${e[1](r)}</td>`).join('')}${noNew?'':`<td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary" data-e="${r.id}"><i class="bi bi-pencil"></i></button>${noNew?'':` <button class="btn btn-sm btn-outline-danger" data-d="${r.id}"><i class="bi bi-trash"></i></button>`}</td>`}</tr>`).join(''):`<tr><td colspan="9" class="text-center text-muted py-4">Sin registros. ${m.ro?'':'Usa «Nuevo» para agregar el primero.'}</td></tr>`};
 const campos=r=>m.f.map(f=>{const cv=CV.includes(k),tc=m.f.some(x=>x[0]=='cliente');
  if(cv&&(f[0]=='cliente'||(f[0]=='vehiculo'&&!tc)))return cvHTML(r);
  if(cv&&f[0]=='vehiculo')return '';
  return `<label class="form-label mt-2">${f[1]}</label>${inp(f,r?r[f[0]]:(f[2]=='date'?hoy():''))}`}).join('');
 const open=r=>{cur=r;$('#err').textContent='';if(k=='cotizaciones'||k=='facturacion'){$('#fb').innerHTML=cotBody(r,k);['input','change'].forEach(ev=>$('#fb').addEventListener(ev,cotCalc));if(k=='facturacion')$('#fb').querySelector('[name=orden]').addEventListener('change',facCarga);cotCalc()}else $('#fb').innerHTML=campos(r);if(k=='pagos'){$('#fb').innerHTML=pagoBody(r);pagoBind(r)}if(CV.includes(k))cvBind(r);modal.show()};
 window.__redraw=draw;draw();$('#q').oninput=draw;if($('#fv'))$('#fv').onchange=draw;
 if(!noNew)$('#nw').onclick=()=>open(null);
 $('#tb').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.p)return imprimir(b.dataset.p);
  if(b.dataset.pc)return imprimirCot(b.dataset.pc);
  if(b.dataset.e)return open(get(k).find(x=>x.id==b.dataset.e));
  const r=get(k).find(x=>x.id==b.dataset.d),rest=get(k).filter(x=>x.id!=r.id);
  if(k=='usuarios'){if(r.id==u.id)return alert('No puedes eliminar tu propio usuario.');const er=chkUsuarios(rest,r);if(er)return alert(er)}
  if(k=='facturacion'&&pagado(r.id))return alert('Esta factura tiene pagos registrados. Elimina primero sus pagos.');
  if(!confirm('¿Eliminar este registro?'))return;put(k,rest);log('Eliminó registro',k);draw()};
 $('#f').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));let l=get(k);
  if(k=='cotizaciones'||k=='facturacion'){if(k=='facturacion'&&l.some(x=>x.numero==d.numero&&(!cur||x.id!=cur.id)))return $('#err').textContent='Ese número de factura ya existe.';const c=cotCalc();if(!c.items.length)return $('#err').textContent='Selecciona al menos un servicio o repuesto.';if(k=='cotizaciones'&&d.estado=='Aprobada'&&!(cur&&cur.stockDesc)){const er=chkStock(c.items);if(er)return $('#err').textContent=er}Object.assign(d,{items:c.items,subtotal:c.sub,itbis:c.itbis,total:c.total,descripcion:c.items.map(x=>x.d+(x.c>1?' x'+x.c:'')).join(', ')})}
  if(k=='usuarios'&&!d.clave)delete d.clave;
  if(k=='diagnostico'){const o=get('ordenes').find(x=>x.id==d.orden);if(o)d.vehiculo=o.vehiculo}
  if(k=='aprobacion'&&d.decision=='Aprobada'){const c=get('cotizaciones').find(x=>x.id==d.cotizacion);if(c&&!c.stockDesc){const er=chkStock(c.items);if(er)return $('#err').textContent=er}}
  if(k=='pagos'){const f=get('facturacion').find(x=>x.id==d.factura),m=+d.monto,saldo=Number(f.total)-pagado(f.id,cur&&cur.id);
  if(m>saldo+0.001)return $('#err').textContent='El monto supera el saldo de la factura.';
  if(d.metodo=='Efectivo'&&+d.recibido<m)return $('#err').textContent='El efectivo recibido es menor al monto a pagar.';
  d.monto=m;if(cur)cur={id:cur.id};
  if(d.metodo=='Efectivo'){d.devuelta=+d.recibido-m;d.detalle=`Recibido ${fmt(d.recibido)} · Devuelta ${fmt(d.devuelta)}`}
  else d.detalle=(d.marca?`${d.marca} ****${d.ultimos4} · Aut. ${d.autorizacion}`:d.metodo=='Cheque'?`${d.banco} · Cheque ${d.ncheque}`:`${d.banco} · Ref. ${d.referencia}`)+(d.cuotas&&d.cuotas!='1'?` · ${d.cuotas} cuotas`:'')}
  const reg=cur?{...cur,...d}:{id:Date.now(),por:u.id,porNombre:u.nombre,creado:new Date().toISOString(),...d};
  const nl=cur?l.map(x=>x.id==cur.id?reg:x):[...l,reg];
  if(k=='usuarios'){if(nl.filter(x=>x.usuario==reg.usuario).length>1)return $('#err').textContent='Ese nombre de usuario ya existe.';
   const er=chkUsuarios(nl,reg);if(er)return $('#err').textContent=er}
  
  put(k,nl);log(cur?'Editó registro':'Creó registro',k);const msg=despues(k,reg,cur);modal.hide();draw();if(msg)alert(msg)}}

(async()=>{
 if(pg=='login')return login();
 if(!u){location='index.html';return}
 if(pg!='dashboard'&&!M[pg].r.includes(u.rol)){location='dashboard.html';return}
 try{await cargar()}catch(e){return}
 shell();
 setInterval(async()=>{if(pend||document.querySelector('.modal.show'))return;try{await cargar();if(window.__redraw)window.__redraw();bell()}catch(e){}},8000)})();
