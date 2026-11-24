/* NÚCLEO · interfaz — componentes reutilizables: lista con buscador (combo) y paginación */

/* Evita duplicados sin importar mayúsculas, tildes ni espacios (en placas también ignora guiones) */
const nrm0=(k,v)=>k=='vehiculos'?nrm(v).replace(/[\s-]/g,''):nrm(v);

/* ---------- Lista desplegable con buscador ----------
   combo('cliente',[{id,t:'Texto',s:'Subtexto'}],valorActual) → se escribe para filtrar y se elige de la lista.
   El valor elegido va en un <input type="hidden" name="cliente"> y avisa con el evento «change». */
function combo(name,ops,valor,{req=true,ph='Escribe para buscar...'}={}){
 const sel=ops.find(o=>o.id==valor);
 return `<div class="combo position-relative" data-opts="${esc(JSON.stringify(ops))}"><input type="hidden" name="${name}" value="${esc(sel?sel.id:'')}"><input type="text" class="form-control combo-in" autocomplete="off" placeholder="${esc(ph)}" value="${esc(sel?sel.t:'')}" ${req?'required':''}><div class="list-group position-absolute w-100 shadow-sm d-none combo-list" style="max-height:260px;overflow:auto;z-index:1060"></div></div>`}
/* Cambia las opciones (y la selección) de un combo ya dibujado */
function comboSet(w,ops,valor,ph){
 w.dataset.opts=JSON.stringify(ops);const o=ops.find(x=>x.id==valor),h=w.querySelector('input[type=hidden]'),t=w.querySelector('.combo-in');
 h.value=o?o.id:'';t.value=o?o.t:'';t.setCustomValidity('');if(ph)t.placeholder=ph}
(()=>{
 const ops=w=>{try{return JSON.parse(w.dataset.opts||'[]')}catch(e){return []}};
 const lista=w=>w.querySelector('.combo-list'),oculto=w=>w.querySelector('input[type=hidden]'),texto=w=>w.querySelector('.combo-in');
 const cerrar=w=>lista(w).classList.add('d-none');
 const pintar=(w,filtro)=>{
  const q=nrm(filtro),ok=ops(w).filter(o=>!q||nrm(o.t+' '+(o.s||'')).includes(q)),vista=ok.slice(0,40);
  lista(w).innerHTML=vista.length?vista.map((o,i)=>`<button type="button" class="list-group-item list-group-item-action py-2 combo-opt${i==0?' combo-act':''}" data-id="${esc(o.id)}"><div>${esc(o.t)}</div>${o.s?`<div class="small text-muted">${esc(o.s)}</div>`:''}</button>`).join('')+(ok.length>40?`<div class="list-group-item small text-muted">Hay ${ok.length-40} más: sigue escribiendo para filtrar.</div>`:''):'<div class="list-group-item small text-muted">Sin coincidencias</div>';
  lista(w).classList.remove('d-none')};
 const elegir=(w,id)=>{
  const o=ops(w).find(x=>String(x.id)==String(id)),h=oculto(w),t=texto(w),antes=h.value;
  h.value=o?o.id:'';t.value=o?o.t:'';t.setCustomValidity('');cerrar(w);
  if(antes!=h.value)h.dispatchEvent(new Event('change',{bubbles:true}))};
 const esCombo=t=>t&&t.classList&&t.classList.contains('combo-in');
 document.addEventListener('focusin',e=>{if(esCombo(e.target)){e.target.select();pintar(e.target.closest('.combo'),'')}});
 document.addEventListener('input',e=>{const t=e.target;if(!esCombo(t))return;const w=t.closest('.combo'),h=oculto(w);
  if(h.value){h.value='';h.dispatchEvent(new Event('change',{bubbles:true}))}
  t.setCustomValidity(t.value?'Elige una opción de la lista.':'');pintar(w,t.value)});
 document.addEventListener('keydown',e=>{const t=e.target;if(!esCombo(t))return;const w=t.closest('.combo'),l=lista(w),abierta=!l.classList.contains('d-none');
  if(e.key=='ArrowDown'||e.key=='ArrowUp'){e.preventDefault();if(!abierta)pintar(w,t.value);const its=[...l.querySelectorAll('.combo-opt')];if(!its.length)return;
   let i=its.findIndex(x=>x.classList.contains('combo-act'));i=e.key=='ArrowDown'?Math.min(its.length-1,i+1):Math.max(0,i-1);
   its.forEach(x=>x.classList.remove('combo-act'));its[i].classList.add('combo-act');its[i].scrollIntoView({block:'nearest'})}
  else if(e.key=='Enter'&&abierta){const a=l.querySelector('.combo-act');if(a){e.preventDefault();elegir(w,a.dataset.id)}}
  else if(e.key=='Escape'&&abierta){e.stopPropagation();cerrar(w)}},true);
 document.addEventListener('mousedown',e=>{const b=e.target.closest&&e.target.closest('.combo-opt');
  if(b){e.preventDefault();return elegir(b.closest('.combo'),b.dataset.id)}
  document.querySelectorAll('.combo-list:not(.d-none)').forEach(l=>{const w=l.closest('.combo');if(!w.contains(e.target))cerrar(w)})});
 document.addEventListener('focusout',e=>{if(!esCombo(e.target))return;const w=e.target.closest('.combo'),t=e.target;
  setTimeout(()=>{if(w.contains(document.activeElement))return;cerrar(w);
   if(!oculto(w).value&&t.value){const o=ops(w).find(x=>nrm(x.t)==nrm(t.value));if(o)elegir(w,o.id);else{t.value='';t.setCustomValidity('')}}},120)});
})();

/* ---------- Paginación ----------
   const P=paginador('clientes','#pgr',(filasDeLaPagina,desde)=>{...pintar la tabla...});  P.set(todasLasFilas);
   El tamaño elegido (5, 10, 25...) se recuerda por pantalla. Por defecto se ven 10. */
function paginador(clave,cont,pintar){
 const OPC=[5,10,25,50,100];let pp=+prefGet('pp_'+clave,10);if(!OPC.includes(pp))pp=10;
 let pag=1,filas=[],nota='';
 const dibuja=()=>{
  const t=filas.length,n=Math.max(1,Math.ceil(t/pp));pag=Math.min(Math.max(1,pag),n);const ini=(pag-1)*pp;
  pintar(filas.slice(ini,ini+pp),ini);
  const nums=[];for(let i=1;i<=n;i++){if(i==1||i==n||Math.abs(i-pag)<=1)nums.push(i);else if(nums[nums.length-1]!=='…')nums.push('…')}
  const li=(txt,p,dis,act)=>`<li class="page-item ${dis?'disabled':''} ${act?'active':''}"><a class="page-link" href="#" data-p="${p}">${txt}</a></li>`;
  $(cont).innerHTML=`<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top small"><div class="d-flex align-items-center gap-2"><label class="mb-0 text-muted">Mostrar</label><select class="form-select form-select-sm w-auto" data-pp>${OPC.map(o=>`<option ${o==pp?'selected':''}>${o}</option>`).join('')}</select><span class="text-muted">registros</span></div><div class="text-muted">${t?`Mostrando ${ini+1}–${Math.min(t,ini+pp)} de ${t}`:'Sin resultados'}${nota}</div>${n>1?`<ul class="pagination pagination-sm mb-0">${li('‹',pag-1,pag==1)}${nums.map(x=>x==='…'?'<li class="page-item disabled"><span class="page-link">…</span></li>':li(x,x,false,x==pag)).join('')}${li('›',pag+1,pag==n)}</ul>`:''}</div>`};
 const c=$(cont);
 c.onclick=e=>{const a=e.target.closest('[data-p]');if(!a)return;e.preventDefault();if(a.parentElement.classList.contains('disabled'))return;pag=+a.dataset.p;dibuja()};
 c.onchange=e=>{if(e.target.matches('[data-pp]')){pp=+e.target.value;prefSet('pp_'+clave,pp);pag=1;dibuja()}};
 return {set(f,reiniciar=true){filas=f;if(reiniciar)pag=1;dibuja()},nota(t){nota=t?' · '+t:''}}}
