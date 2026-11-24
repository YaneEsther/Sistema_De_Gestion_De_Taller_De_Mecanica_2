/* NÚCLEO · crud — motor de las pantallas de registros: tabla, buscador, paginación, formulario y detalle.
   Cada pantalla (js/pantallas/<modulo>.js) lo configura con pantalla('<modulo>',{...}). Opciones disponibles:
     f            campos [clave, etiqueta, tipo, opciones, filtroDeOpciones]
     extra        columnas extra de la tabla [[título, r=>html]]
     acciones     r=>html con botones extra de cada fila (y clic(boton,registro) para atenderlos)
     celda        (campo,r)=>html para personalizar cómo se ve una celda
     campo        (campo,valor,registroActual)=>html para personalizar un campo del formulario
     cuerpo       r=>html que reemplaza todo el formulario        pie  r=>html que se agrega al final del formulario
     alAbrir      r=>{} se ejecuta al abrir el formulario (aquí se enlazan eventos con formOn)
     preparar     (datos,anterior,lista)=>error|undefined   completa o valida los datos antes de guardar
     validar      (listaNueva,registro,anterior)=>error|undefined
     despues      (registro,anterior,promesaDeGuardado)=>mensaje|undefined   efectos entre áreas, avisos
     antesEliminar (registro,resto)=>error|undefined
     detalle      r=>html extra para la ventana «Ver detalle»
     dup          [campo, x=>mensaje] evita repetidos (ignora mayúsculas, tildes y espacios)
     filtros      ()=>html de filtros extra          filtro  r=>boolean
     turno        true: permite filtrar «solo mis registros de este turno»
     soloLectura  roles que solo pueden mirar         clienteVehiculo  true: elegir cliente y luego su vehículo
     grande       true: formulario ancho              ordenar  filas=>filas */

/* Eventos del formulario abierto: formOn('change', e=>{...}) (se limpian cada vez que se abre) */
const H={change:[],input:[]};
const formOn=(ev,fn)=>H[ev].push(fn);

function crud(k){
 const m=M[k],editable=!m.ro&&!(m.soloLectura||[]).includes(u.rol);
 const cols=m.f.filter(f=>f[2]!='textarea').slice(0,m.nCols||5),ex=m.extra||[];
 let cur=null;

 /* ---- cómo se ve cada celda ---- */
 const cell=(f,r)=>{const o=m.celda&&m.celda(f,r);if(o!==undefined)return o;const v=r[f[0]];
  if(f[2]=='ref')return esc(nm(f[3],v));
  if(f[2]=='password')return '••••';
  if(['estado','decision','resultado'].includes(f[0])&&v)return bdg(v);
  if(['total','monto','precio'].includes(f[0])&&v!==undefined&&v!==''&&v!==null)return fmt(v);
  return esc(v)};
 const plano=h=>String(h).replace(/<[^>]+>/g,' ');

 /* ---- campos del formulario ---- */
 const inp=(f,v)=>{const h=m.campo&&m.campo(f,v,cur);if(h!==undefined)return h;
  if(f[2]=='textarea')return `<textarea name="${f[0]}" class="form-control" rows="3">${esc(v)}</textarea>`;
  if(f[2]=='select')return `<select name="${f[0]}" class="form-select" required>${f[3].map(o=>`<option value="${esc(o)}" ${o==v?'selected':''}>${esc(ROLES[o]||o)}</option>`).join('')}</select>`;
  if(f[2]=='ref'){const l=vis(f[3],get(f[3])).filter(x=>!f[4]||f[4](x)||x.id==v);return combo(f[0],l.map(x=>({id:x.id,t:etq(f[3],x),s:f[3]=='cotizaciones'?x.descripcion:undefined})),v)}
  return `<input name="${f[0]}" class="form-control" type="${f[2]||'text'}" ${f[2]=='number'?'step="any" min="0"':''} value="${f[2]=='password'?'':esc(v)}" ${f[2]=='password'&&cur?'placeholder="(sin cambios)"':'required'}>`};
 const campos=r=>m.f.map(f=>{
  if(m.clienteVehiculo){const tieneCli=m.f.some(x=>x[0]=='cliente');if(f[0]=='cliente'||(f[0]=='vehiculo'&&!tieneCli))return cvHTML(r);if(f[0]=='vehiculo')return ''}
  return `<label class="form-label mt-2">${f[1]}</label>${inp(f,r?r[f[0]]:(f[2]=='date'?hoy():''))}`}).join('');

 /* ---- ventana «Ver detalle» (solo lectura, la pueden abrir todos los roles que ven el módulo) ---- */
 const valorDetalle=(f,r)=>{const v=r[f[0]];if(v===undefined||v===null||v==='')return '—';
  if(f[2]=='ref'){const x=get(f[3]).find(y=>y.id==v);return esc(x?etq(f[3],x):'—')}
  if(['estado','decision','resultado'].includes(f[0]))return bdg(v);
  if(['total','monto','precio'].includes(f[0])&&!isNaN(v))return 'RD$ '+fmt(v);
  return `<span style="white-space:pre-wrap">${esc(f[2]=='password'?'••••':v)}</span>`};
 const detalleHTML=r=>`<dl class="row mb-0">${m.f.filter(f=>f[2]!='password').map(f=>`<dt class="col-sm-4 text-muted fw-normal">${f[1]}</dt><dd class="col-sm-8">${valorDetalle(f,r)}</dd>`).join('')}</dl>${m.detalle?m.detalle(r):''}${r.creado?`<div class="text-muted small mt-3">Registrado por ${esc(r.porNombre||'—')} · ${hora(r.creado)}</div>`:''}`;

 /* ---- estructura de la pantalla ---- */
 const turnoOn=()=>m.turno&&$('#ft')&&$('#ft').value=='t';
 $('#main').innerHTML=`<div class="d-flex justify-content-between mb-3"><h4>${m.t}</h4>${editable?'<button class="btn btn-warning" id="nw"><i class="bi bi-plus-lg"></i> Nuevo</button>':''}</div>
 <div class="row g-2 mb-3" id="flt"><div class="col"><input id="q" class="form-control" placeholder="Buscar..."></div>${m.turno?`<div class="col-12 col-md-4"><select id="ft" class="form-select"><option value="">Todos los registros</option><option value="t" ${prefGet('ft_'+k,'')=='t'?'selected':''}>Solo mis registros de este turno</option></select></div>`:''}${m.filtros?m.filtros():''}</div>
 <div class="card"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}${ex.map(e=>`<th>${e[0]}</th>`).join('')}<th></th></tr></thead><tbody id="tb"></tbody></table></div><div id="pgr"></div></div>
 <div class="modal fade" id="md" tabindex="-1"><div class="modal-dialog ${m.grande?'modal-lg':''}"><form class="modal-content" id="f"><div class="modal-header"><h5 class="modal-title" id="mt">${m.t}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="fb"></div><div class="modal-footer"><div id="err" class="text-danger small me-auto"></div><button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-warning">Guardar</button></div></form></div></div>
 <div class="modal fade" id="mv" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" id="mvt"></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="mvb"></div><div class="modal-footer"><button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal">Cerrar</button></div></div></div></div>`;
 const modal=new bootstrap.Modal('#md'),modalV=new bootstrap.Modal('#mv');
 const err=t=>{$('#err').textContent=t||''};

 /* ---- tabla con paginación ---- */
 const fila=r=>`<tr>${cols.map(c=>`<td>${cell(c,r)}</td>`).join('')}${ex.map(e=>`<td>${e[1](r)}</td>`).join('')}<td class="text-end text-nowrap">${m.acciones?m.acciones(r):''} <button class="btn btn-sm btn-outline-secondary" data-v="${r.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>${editable?` <button class="btn btn-sm btn-outline-primary" data-e="${r.id}" title="Editar"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" data-d="${r.id}" title="Eliminar"><i class="bi bi-trash"></i></button>`:''}</td></tr>`;
 const P=paginador(k,'#pgr',(pagina)=>{$('#tb').innerHTML=pagina.length?pagina.map(fila).join(''):`<tr><td colspan="${cols.length+ex.length+1}" class="text-center text-muted py-4">Sin registros. ${editable?'Usa «Nuevo» para agregar el primero.':''}</td></tr>`});
 const filtrar=r=>{const q=nrm($('#q').value);return (!q||m.f.some(f=>nrm(plano(cell(f,r))).includes(q)))&&(!m.filtro||m.filtro(r))&&(!turnoOn()||delTurno(r))};
 const draw=(reiniciar=true)=>{let rows=vis(k,get(k)).filter(filtrar);rows=m.ordenar?m.ordenar(rows):(k=='auditoria'?rows:rows.slice().reverse());P.nota(turnoOn()?'turno desde '+hora(inicioTurno()):'');P.set(rows,reiniciar)};

 /* ---- formulario ---- */
 let dupInfo=null;
 const liveDup=()=>{if(!m.dup)return;const [c,msg]=m.dup,i=$('#fb [name='+c+']');if(!i)return;
  i.insertAdjacentHTML('afterend','<div class="text-danger small mt-1" id="dupmsg"></div>');
  const chk=()=>{const x=get(k).find(y=>(!cur||y.id!=cur.id)&&i.value.trim()&&nrm0(k,y[c])==nrm0(k,i.value));dupInfo=x?msg(x):null;i.setCustomValidity(dupInfo||'');$('#dupmsg').textContent=dupInfo||''};
  i.addEventListener('input',chk);chk()};
 const open=r=>{cur=r;err();H.change.length=0;H.input.length=0;$('#mt').textContent=(r?'Editar · ':'Nuevo · ')+m.t;
  $('#fb').innerHTML=m.cuerpo?m.cuerpo(r):campos(r)+(m.pie?m.pie(r):'');
  if(m.clienteVehiculo)cvBind(r);
  liveDup();if(m.alAbrir)m.alAbrir(r);modal.show()};
 $('#fb').addEventListener('change',e=>H.change.forEach(fn=>fn(e)));
 $('#fb').addEventListener('input',e=>H.input.forEach(fn=>fn(e)));

 window.__redraw=()=>draw(false);draw();
 $('#flt').addEventListener('input',()=>draw());$('#flt').addEventListener('change',e=>{if(e.target.id=='ft')prefSet('ft_'+k,e.target.value);draw()});
 if(editable)$('#nw').onclick=()=>open(null);

 $('#tb').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.v){const r=get(k).find(x=>x.id==b.dataset.v);$('#mvt').textContent=m.t+' · '+regLbl2(r);$('#mvb').innerHTML=detalleHTML(r);return modalV.show()}
  if(m.clic){const r=get(k).find(x=>x.id==(b.dataset.e||b.dataset.d||b.dataset.v));if(m.clic(b,r)===true)return}
  if(b.dataset.e)return open(get(k).find(x=>x.id==b.dataset.e));
  if(b.dataset.d){const r=get(k).find(x=>x.id==b.dataset.d),rest=get(k).filter(x=>x.id!=r.id);
   const er=m.antesEliminar&&m.antesEliminar(r,rest);if(er)return alert(er);
   if(!confirm('¿Eliminar este registro?'))return;const lab=regLbl(k,r),res=resumen(k,r);put(k,rest);log('Eliminó registro',k,lab,res);draw(false)}};
 const regLbl2=r=>{try{return regLbl(k,r)}catch(e){return ''}};

 /* ---- guardar ---- */
 $('#f').onsubmit=e=>{e.preventDefault();const prev=cur,d=Object.fromEntries(new FormData(e.target));delete d.ff;const l=get(k);
  if(m.dup){const [c,msg]=m.dup;d[c]=String(d[c]||'').trim().replace(/\s+/g,' ');const x=l.find(y=>(!prev||y.id!=prev.id)&&nrm0(k,y[c])==nrm0(k,d[c]));if(x)return err(msg(x))}
  if(m.preparar){const er=m.preparar(d,prev,l);if(er)return err(er)}
  const reg=cur?{...cur,...d}:{id:Date.now(),por:u.id,porNombre:u.nombre,creado:new Date().toISOString(),...d};
  const nl=cur?l.map(x=>x.id==cur.id?reg:x):[...l,reg];
  if(m.validar){const er=m.validar(nl,reg,prev);if(er)return err(er)}
  const pr=put(k,nl),lab=regLbl(k,reg),xf=k=='recepcion'&&FOTOS.nuevas.length?`Fotos nuevas: ${FOTOS.nuevas.length}`:'';
  if(prev){const dd=[dif(k,prev,reg),xf].filter(Boolean).join('\n');log('Editó registro',k,lab,dd||'Sin cambios en los datos')}
  else log('Creó registro',k,lab,[resumen(k,reg),xf].filter(Boolean).join('\n'));
  const msg=m.despues&&m.despues(reg,prev,pr);
  modal.hide();draw(false);if(msg)alert(msg)}}
