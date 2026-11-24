/* PANTALLA · Centro de ayuda (el contenido está en js/core/ayuda-datos.js y cambia según el rol) */
function ayuda(){
 let rol=u.rol,busq='';
 const item=(t,c,ab)=>`<details class="border rounded bg-white mb-2 px-3 py-2" ${ab?'open':''}><summary class="fw-semibold">${esc(t)}</summary><div class="pt-2">${c}</div></details>`;
 const lista=()=>{const h=HELP[rol],f=x=>!busq||nrm(x).includes(busq),ts=h.t.filter(x=>f(x[0]+' '+x[1].join(' '))),fq=[...h.q,...HELP_COMUN].filter(x=>f(x[0]+' '+x[1]));
  $('#hl').innerHTML=(ts.length?'<h6 class="mt-3">¿Cómo hago...?</h6>'+ts.map(x=>item(x[0],`<ol class="mb-0">${x[1].map(p=>`<li>${esc(p)}</li>`).join('')}</ol>`,busq)).join(''):'')
   +(fq.length?'<h6 class="mt-4">Preguntas frecuentes</h6>'+fq.map(x=>item(x[0],`<p class="mb-0">${esc(x[1])}</p>`,busq)).join(''):'')
   +(!ts.length&&!fq.length?'<p class="text-muted mt-3">No se encontró nada con esa búsqueda.</p>':'')};
 const pinta=()=>{const h=HELP[rol];
  $('#main').innerHTML=`<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h4 class="mb-0"><i class="bi bi-question-circle"></i> Centro de ayuda</h4>${u.rol==A?`<div class="d-flex align-items-center gap-2"><label class="small text-muted mb-0" for="hr">Ver la ayuda de:</label><select id="hr" class="form-select form-select-sm w-auto">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${k==rol?'selected':''}>${v}</option>`).join('')}</select></div>`:''}</div>
  <div class="card p-3 mb-3"><div class="fw-semibold">${ROLES[rol]}</div><div class="text-muted">${esc(h.r)}</div></div>
  <h6>Recorrido de una orden de trabajo</h6><div class="d-flex flex-wrap gap-2 mb-1">${FLUJO.map((s,i)=>{const mio=rol==A||s[2].includes(rol);return `<span class="badge ${mio?'text-bg-primary':'text-bg-light border text-muted'} fw-normal py-2">${i+1}. ${s[0]}</span>`}).join('')}</div>
  <div class="small text-muted mb-3">Los pasos resaltados son los que te corresponden${rol==A?' (como administrador puedes intervenir en todos)':''}.</div>
  <h6>Módulos de este rol</h6><div class="d-flex flex-wrap gap-2 mb-3">${Object.entries(M).filter(([k,m])=>k!='ayuda'&&m.r.includes(rol)).map(([k,m])=>`<a class="btn btn-sm btn-outline-primary" href="${k}.html"><i class="bi bi-${m.i}"></i> ${m.t}</a>`).join('')}</div>
  <input id="hq" class="form-control" placeholder="Buscar en la ayuda (por ejemplo: factura, foto, cierre)..." value="${esc(busq)}"><div id="hl"></div>
  <h6 class="mt-4">Estados de una orden</h6><div class="card"><table class="table table-sm mb-0"><tbody>${EST_AYUDA.map(x=>`<tr><td style="width:150px">${bdg(x[0])}</td><td>${x[1]}</td></tr>`).join('')}</tbody></table></div>`;
  lista();$('#hq').oninput=e=>{busq=nrm(e.target.value);lista()};if($('#hr'))$('#hr').onchange=e=>{rol=e.target.value;busq='';pinta()}};
 pinta()}
pantalla('ayuda',{custom:1,pintar:ayuda});
