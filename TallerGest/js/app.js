/* TallerGest – lógica completa (datos en localStorage, sin servidor) */
const $=s=>document.querySelector(s);
const get=(k,d=[])=>JSON.parse(localStorage.getItem('tg_'+k)||'null')??d;
const put=(k,v)=>localStorage.setItem('tg_'+k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLES={admin:'Administrador',mecanico:'Mecánico',recepcion:'Recepcionista',facturador:'Facturador'};
const A='admin',R='recepcion',ME='mecanico',F='facturador';
const ESTADOS=['Recibida','Diagnosticada','Cotizada','Aprobada','En ejecución','Finalizada','Facturada'];
/* Módulos: t=título, i=icono, r=roles con acceso, f=campos [clave,etiqueta,tipo,opciones] */
const M={
clientes:{t:'Registro de clientes',i:'people',r:[A,R],f:[['nombre','Nombre completo'],['telefono','Teléfono','tel'],['correo','Correo electrónico','email'],['direccion','Dirección']]},
vehiculos:{t:'Registro de vehículos',i:'car-front',r:[A,R],f:[['placa','Placa / VIN'],['marca','Marca'],['modelo','Modelo'],['anio','Año','number'],['cliente','Cliente','ref','clientes']]},
historial:{t:'Historial de mantenimiento',i:'clock-history',r:[A,R,ME],f:[['vehiculo','Vehículo','ref','vehiculos'],['fecha','Fecha','date'],['servicio','Servicio'],['km','Kilometraje','number'],['tecnico','Técnico']]},
recepcion:{t:'Recepción del vehículo',i:'box-arrow-in-right',r:[A,R],f:[['vehiculo','Vehículo','ref','vehiculos'],['fecha','Fecha','date'],['km','Kilometraje','number'],['obs','Observaciones','textarea']]},
diagnostico:{t:'Diagnóstico',i:'clipboard2-pulse',r:[A,ME],f:[['vehiculo','Vehículo','ref','vehiculos'],['resultado','Resultado','select',['Sin anomalías','Con fallas','Requiere revisión adicional']],['hallazgos','Descripción / hallazgos','textarea']]},
ordenes:{t:'Órdenes de trabajo',i:'tools',r:[A,R,ME],f:[['codigo','N° de orden'],['cliente','Cliente','ref','clientes'],['vehiculo','Vehículo','ref','vehiculos'],['estado','Estado','select',ESTADOS],['fecha','Fecha','date']]},
mecanicos:{t:'Asignación de mecánicos',i:'person-gear',r:[A],f:[['orden','Orden de trabajo','ref','ordenes'],['mecanico','Mecánico','ref','usuarios',x=>x.rol==ME&&x.estado=='Activo'],['fecha','Fecha de asignación','date']]},
servicios:{t:'Gestión de servicios',i:'wrench-adjustable',r:[A,R],f:[['descripcion','Descripción'],['categoria','Categoría','select',['Mantenimiento','Reparación','Diagnóstico']],['precio','Precio (RD$)','number']]},
repuestos:{t:'Gestión de repuestos',i:'gear',r:[A,ME],f:[['codigo','Código'],['descripcion','Descripción'],['stock','Stock','number'],['precio','Precio (RD$)','number']]},
cotizaciones:{t:'Cotizaciones',i:'file-earmark-text',r:[A,R,F],f:[['orden','Orden de trabajo','ref','ordenes'],['descripcion','Servicio / repuesto'],['total','Total (RD$)','number'],['estado','Estado','select',['Pendiente','Aprobada','Rechazada']]]},
aprobacion:{t:'Aprobación del cliente',i:'check2-circle',r:[A,R],f:[['cotizacion','Cotización','ref','cotizaciones'],['decision','Decisión','select',['Aprobada','Rechazada']],['fecha','Fecha','date'],['comentario','Observaciones del cliente','textarea']]},
ejecucion:{t:'Ejecución del trabajo',i:'play-circle',r:[A,ME],f:[['orden','Orden de trabajo','ref','ordenes'],['etapa','Etapa','select',['Recepción','Diagnóstico','Repuestos','Ejecución','Finalización']],['notas','Notas del trabajo','textarea']]},
facturacion:{t:'Facturación',i:'receipt',r:[A,F],f:[['numero','N° de factura'],['orden','Orden de trabajo','ref','ordenes'],['total','Total (RD$)','number'],['fecha','Fecha','date']]},
pagos:{t:'Pagos',i:'credit-card',r:[A,F],f:[['factura','Factura','ref','facturacion'],['monto','Monto (RD$)','number'],['metodo','Método de pago','select',['Efectivo','Tarjeta de crédito','Transferencia']],['fecha','Fecha','date']]},
usuarios:{t:'Usuarios y roles',i:'person-badge',r:[A],f:[['usuario','Usuario'],['nombre','Nombre completo'],['clave','Contraseña','password'],['rol','Rol','select',Object.keys(ROLES)],['estado','Estado','select',['Activo','Inactivo']]]},
auditoria:{t:'Auditoría',i:'shield-check',r:[A],ro:1,f:[['fecha','Fecha y hora'],['usuario','Usuario'],['accion','Acción'],['modulo','Módulo']]},
reportes:{t:'Reportes',i:'bar-chart',r:[A,F],custom:1},
configuracion:{t:'Configuración',i:'sliders',r:[A],custom:1}
};
const first=k=>M[k].f[0][0];
const nm=(k,id)=>{const r=get(k).find(x=>x.id==id);return r?(k=='usuarios'?r.nombre:r[first(k)]):'—'};
const u=JSON.parse(sessionStorage.getItem('tg_ses')||'null'),pg=document.body.dataset.m;

if(!localStorage.tg_usuarios)put('usuarios',[
 {id:1,usuario:'admin',nombre:'Administrador',clave:'admin123',rol:A,estado:'Activo'},
 {id:2,usuario:'mecanico',nombre:'Carlos Díaz',clave:'mec123',rol:ME,estado:'Activo'},
 {id:3,usuario:'recepcion',nombre:'María López',clave:'rec123',rol:R,estado:'Activo'},
 {id:4,usuario:'factura',nombre:'Ana Torres',clave:'fac123',rol:F,estado:'Activo'}]);
function log(accion,modulo){const l=get('auditoria');l.unshift({id:Date.now()+Math.random(),fecha:new Date().toLocaleString('es-DO'),usuario:u?u.usuario:'—',accion,modulo});put('auditoria',l.slice(0,300))}

/* Reglas del módulo de usuarios: siempre debe quedar un administrador activo */
function chkUsuarios(lista,reg){
 if(lista.some(x=>x.usuario==reg.usuario&&x.id!=reg.id&&lista.indexOf(x)!=lista.findIndex(y=>y.id==reg.id)&&x.id!==reg.id))return 'Ese nombre de usuario ya existe.';
 if(!lista.some(x=>x.rol==A&&x.estado=='Activo'))return 'Debe existir al menos un administrador activo. No se puede borrar, desactivar ni cambiar de rol al único administrador.';
 return null}

function login(){
 $('#app').innerHTML=`<div class="login-bg"><div class="card login-card p-4"><div class="text-center mb-3"><div class="logo"><i class="bi bi-gear-fill text-warning"></i> Taller<span>Gest</span></div><div class="text-muted">Tu taller, mejor organizado</div></div>
 <form id="f"><div id="err" class="alert alert-danger py-2 d-none"></div><label class="form-label">Usuario</label><input class="form-control mb-3" id="us" required autofocus><label class="form-label">Contraseña</label><input type="password" class="form-control mb-3" id="cl" required><button class="btn btn-primary w-100">Iniciar sesión</button></form>
 <p class="small text-muted mt-3 mb-0">Demo: admin / admin123 · mecanico / mec123 · recepcion / rec123 · factura / fac123</p></div></div>`;
 $('#f').onsubmit=e=>{e.preventDefault();const x=get('usuarios').find(r=>r.usuario==$('#us').value.trim()&&r.clave==$('#cl').value);
  const er=$('#err');er.classList.remove('d-none');
  if(!x)return er.textContent='Usuario o contraseña incorrectos.';
  if(x.estado!='Activo')return er.textContent='Tu usuario está inactivo. Contacta al administrador.';
  sessionStorage.setItem('tg_ses',JSON.stringify(x));location='dashboard.html';
  const l=get('auditoria');l.unshift({id:Date.now(),fecha:new Date().toLocaleString('es-DO'),usuario:x.usuario,accion:'Inicio de sesión',modulo:'Login'});put('auditoria',l)}}

function shell(){
 const nav=Object.entries(M).filter(([k,m])=>m.r.includes(u.rol));
 $('#app').innerHTML=`<div class="d-flex"><aside class="offcanvas-md offcanvas-start sidebar" id="sb"><div class="p-3 brand"><i class="bi bi-gear-fill text-warning"></i> Taller<span style="color:var(--dorado)">Gest</span></div>
 <nav class="nav flex-column px-2 pb-3"><a class="nav-link ${pg=='dashboard'?'active':''}" href="dashboard.html"><i class="bi bi-house"></i>Inicio</a>${nav.map(([k,m])=>`<a class="nav-link ${k==pg?'active':''}" href="${k}.html"><i class="bi bi-${m.i}"></i>${m.t}</a>`).join('')}</nav></aside>
 <div class="flex-grow-1 min-vw-0"><header class="topbar d-flex align-items-center gap-2 px-3 py-2 bg-white shadow-sm"><button class="btn d-md-none" data-bs-toggle="offcanvas" data-bs-target="#sb"><i class="bi bi-list fs-4"></i></button><span class="ms-auto small text-muted">${esc(u.nombre)} · ${ROLES[u.rol]}</span><button class="btn btn-sm btn-outline-primary" id="out">Salir</button></header><main class="p-3 p-md-4" id="main"></main></div></div>`;
 $('#out').onclick=()=>{log('Cierre de sesión','Login');sessionStorage.removeItem('tg_ses');location='index.html'};
 pg=='dashboard'?dash():pg=='reportes'?rep():pg=='configuracion'?cfg():crud(pg)}

function dash(){
 const ks=['clientes','vehiculos','ordenes','cotizaciones','servicios','repuestos'].filter(k=>M[k].r.includes(u.rol));
 $('#main').innerHTML=`<h4>Hola, ${esc(u.nombre)}</h4><p class="text-muted">Bienvenido al sistema TallerGest</p><div class="row g-3">${ks.map(k=>`<div class="col-6 col-lg-4"><a href="${k}.html" class="text-decoration-none text-reset"><div class="card stat p-3 d-flex flex-row align-items-center gap-3"><i class="bi bi-${M[k].i}"></i><div><div class="text-muted small">${M[k].t}</div><div class="n">${get(k).length}</div></div></div></a></div>`).join('')}</div>`}

function rep(){
 const tot=k=>get(k).reduce((s,x)=>s+Number(x.total||x.monto||0),0).toLocaleString('es-DO');
 $('#main').innerHTML=`<div class="d-flex justify-content-between mb-3"><h4>Reportes</h4><button class="btn btn-warning no-print" onclick="print()"><i class="bi bi-printer"></i> Imprimir</button></div>
 <div class="row g-3 mb-3"><div class="col-md-4"><div class="card p-3"><div class="text-muted small">Total facturado</div><div class="fs-4 fw-bold">RD$ ${tot('facturacion')}</div></div></div><div class="col-md-4"><div class="card p-3"><div class="text-muted small">Total cobrado</div><div class="fs-4 fw-bold">RD$ ${tot('pagos')}</div></div></div><div class="col-md-4"><div class="card p-3"><div class="text-muted small">Órdenes finalizadas</div><div class="fs-4 fw-bold">${get('ordenes').filter(o=>o.estado=='Finalizada'||o.estado=='Facturada').length}</div></div></div></div>
 <div class="card"><table class="table mb-0"><thead><tr><th>Módulo</th><th>Registros</th></tr></thead><tbody>${Object.keys(M).filter(k=>!M[k].custom&&k!='usuarios'&&k!='auditoria').map(k=>`<tr><td>${M[k].t}</td><td>${get(k).length}</td></tr>`).join('')}</tbody></table></div>`}

function cfg(){
 const c=get('cfg',{});
 $('#main').innerHTML=`<h4 class="mb-3">Configuración</h4><div class="card p-3" style="max-width:520px"><form id="f">${[['nombre','Nombre del taller'],['telefono','Teléfono'],['direccion','Dirección']].map(([k,l])=>`<label class="form-label">${l}</label><input class="form-control mb-3" name="${k}" value="${esc(c[k])}">`).join('')}<button class="btn btn-warning">Guardar</button> <span id="ok" class="text-success ms-2"></span></form></div>`;
 $('#f').onsubmit=e=>{e.preventDefault();put('cfg',Object.fromEntries(new FormData(e.target)));log('Configuración actualizada','configuracion');$('#ok').textContent='Guardado'}}


/* Cotizaciones: selección de servicios y repuestos con cálculo automático (ITBIS 18%) */
const fmt=n=>Number(n).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2});
function cotBody(r,k){
 const fac=k=='facturacion',it=r&&r.items||[],sel=(t,id)=>it.find(x=>x.t==t&&x.id==id);
 const row=(t,x)=>{const s=sel(t,x.id);return `<div class="d-flex align-items-center gap-2 border-bottom py-1"><input type="checkbox" class="form-check-input ci" data-t="${t}" data-id="${x.id}" data-d="${esc(x.descripcion)}" data-p="${x.precio||0}" ${s?'checked':''}><span class="flex-grow-1 small">${esc(x.descripcion)}${t=='r'?` <span class="text-muted">(stock ${esc(x.stock)})</span>`:''}</span>${t=='r'?`<input type="number" min="1" value="${s?s.c:1}" class="form-control form-control-sm cq" style="width:68px">`:''}<span class="text-nowrap small">RD$ ${fmt(x.precio||0)}</span></div>`};
 const lista=(t,k2,vacio)=>get(k2).length?get(k2).map(x=>row(t,x)).join(''):`<div class="text-muted small py-2">${vacio}</div>`;
 const ordSel=`<select name="orden" class="form-select" required><option value="">Seleccionar...</option>${get('ordenes').map(o=>`<option value="${o.id}" ${r&&o.id==r.orden?'selected':''}>${esc(o.codigo)} · ${esc(nm('clientes',o.cliente))}</option>`).join('')}</select>`;
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
/* Pagos: muestra total, pagado y saldo de la factura y propone el saldo como monto */
function pagoHook(r){
 const s=$('#fb [name=factura]'),m=$('#fb [name=monto]');
 $('#fb').insertAdjacentHTML('beforeend','<div id="ph" class="small text-muted mt-2"></div>');
 const calc=ch=>{const f=get('facturacion').find(x=>x.id==s.value);if(!f)return $('#ph').textContent='';
  const pag=get('pagos').filter(p=>p.factura==f.id&&(!r||p.id!=r.id)).reduce((a,p)=>a+Number(p.monto),0),saldo=Math.max(0,Number(f.total)-pag);
  $('#ph').textContent=`Total RD$ ${fmt(f.total)} · Pagado RD$ ${fmt(pag)} · Saldo RD$ ${fmt(saldo)}`;if(ch)m.value=saldo.toFixed(2)};
 s.addEventListener('change',()=>calc(true));calc(false)}
function cotCalc(){
 const items=[...document.querySelectorAll('.ci:checked')].map(c=>{const q=c.parentElement.querySelector('.cq');return {t:c.dataset.t,id:c.dataset.id,d:c.dataset.d,p:+c.dataset.p,c:Math.max(1,+(q?q.value:1)||1)}});
 const sub=items.reduce((a,x)=>a+x.p*x.c,0),itbis=Math.round(sub*18)/100;
 if($('#cs')){$('#cs').textContent=fmt(sub);$('#ci2').textContent=fmt(itbis);$('#ct').textContent=fmt(sub+itbis)}
 return {items,sub,itbis,total:sub+itbis}}

function crud(k){
 const m=M[k],cols=m.f.filter(f=>f[2]!='textarea').slice(0,5);
 const cell=(f,r)=>f[2]=='ref'?esc(nm(f[3],r[f[0]])):f[2]=='password'?'••••':(f[0]=='total'||f[0]=='monto')&&r[f[0]]!==undefined&&r[f[0]]!==''?fmt(r[f[0]]):esc(r[f[0]]);
 const inp=(f,v)=>{const n=`name="${f[0]}" class="form-control" `,req=f[2]=='textarea'?'':'required';
  if(f[2]=='textarea')return `<textarea ${n}rows="3">${esc(v)}</textarea>`;
  if(f[2]=='select')return `<select name="${f[0]}" class="form-select" required>${f[3].map(o=>`<option value="${o}" ${o==v?'selected':''}>${o=='admin'||ROLES[o]?ROLES[o]||o:o}</option>`).join('')}</select>`;
  if(f[2]=='ref'){const l=get(f[3]).filter(x=>!f[4]||f[4](x)||x.id==v);return `<select name="${f[0]}" class="form-select" required><option value="">Seleccionar...</option>${l.map(x=>`<option value="${x.id}" ${x.id==v?'selected':''}>${esc(nm(f[3],x.id))}</option>`).join('')}</select>`}
  return `<input ${n}type="${f[2]||'text'}" ${f[2]=='number'?'step="any"':''} value="${esc(v)}" ${req}>`};
 $('#main').innerHTML=`<div class="d-flex justify-content-between mb-3"><h4>${m.t}</h4>${m.ro?'':'<button class="btn btn-warning" id="nw"><i class="bi bi-plus-lg"></i> Nuevo</button>'}</div>
 <input id="q" class="form-control mb-3" placeholder="Buscar...">
 <div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}${m.ro?'':'<th></th>'}</tr></thead><tbody id="tb"></tbody></table></div></div>
 <div class="modal fade" id="md" tabindex="-1"><div class="modal-dialog ${k=='cotizaciones'||k=='facturacion'?'modal-lg':''}"><form class="modal-content" id="f"><div class="modal-header"><h5 class="modal-title">${m.t}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="fb"></div><div class="modal-footer"><div id="err" class="text-danger small me-auto"></div><button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-warning">Guardar</button></div></form></div></div>`;
 const modal=new bootstrap.Modal('#md');let cur=null;
 const draw=()=>{const q=$('#q').value.toLowerCase(),rows=get(k).filter(r=>cols.some(c=>cell(c,r).toLowerCase().includes(q)));
  $('#tb').innerHTML=rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td>${cell(c,r)}</td>`).join('')}${m.ro?'':`<td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary" data-e="${r.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" data-d="${r.id}"><i class="bi bi-trash"></i></button></td>`}</tr>`).join(''):`<tr><td colspan="9" class="text-center text-muted py-4">Sin registros. ${m.ro?'':'Usa «Nuevo» para agregar el primero.'}</td></tr>`};
 const open=r=>{cur=r;$('#err').textContent='';if(k=='cotizaciones'||k=='facturacion'){$('#fb').innerHTML=cotBody(r,k);['input','change'].forEach(ev=>$('#fb').addEventListener(ev,cotCalc));if(k=='facturacion')$('#fb').querySelector('[name=orden]').addEventListener('change',facCarga);cotCalc()}else $('#fb').innerHTML=m.f.map(f=>`<label class="form-label mt-2">${f[1]}</label>${inp(f,r?r[f[0]]:'')}`).join('');if(k=='pagos')pagoHook(r);modal.show()};
 draw();$('#q').oninput=draw;
 if(!m.ro)$('#nw').onclick=()=>open(null);
 $('#tb').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.e)return open(get(k).find(x=>x.id==b.dataset.e));
  const r=get(k).find(x=>x.id==b.dataset.d),rest=get(k).filter(x=>x.id!=r.id);
  if(k=='usuarios'){if(r.id==u.id)return alert('No puedes eliminar tu propio usuario.');const er=chkUsuarios(rest,r);if(er)return alert(er)}
  if(!confirm('¿Eliminar este registro?'))return;put(k,rest);log('Eliminó registro',k);draw()};
 $('#f').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));let l=get(k);
  if(k=='cotizaciones'||k=='facturacion'){if(k=='facturacion'&&l.some(x=>x.numero==d.numero&&(!cur||x.id!=cur.id)))return $('#err').textContent='Ese número de factura ya existe.';const c=cotCalc();if(!c.items.length)return $('#err').textContent='Selecciona al menos un servicio o repuesto.';Object.assign(d,{items:c.items,subtotal:c.sub,itbis:c.itbis,total:c.total,descripcion:c.items.map(x=>x.d+(x.c>1?' x'+x.c:'')).join(', ')})}
  const reg=cur?{...cur,...d}:{id:Date.now(),...d};
  const nl=cur?l.map(x=>x.id==cur.id?reg:x):[...l,reg];
  if(k=='usuarios'){if(nl.filter(x=>x.usuario==reg.usuario).length>1)return $('#err').textContent='Ese nombre de usuario ya existe.';
   const er=chkUsuarios(nl,reg);if(er)return $('#err').textContent=er}
  put(k,nl);log(cur?'Editó registro':'Creó registro',k);modal.hide();draw()}}

if(pg=='login')login();
else if(!u)location='index.html';
else if(pg!='dashboard'&&!M[pg].r.includes(u.rol))location='dashboard.html';
else shell();