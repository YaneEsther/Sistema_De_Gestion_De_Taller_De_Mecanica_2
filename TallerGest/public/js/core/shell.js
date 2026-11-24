/* NÚCLEO · estructura — menú lateral, barra superior, campana de avisos y salida */
function shell(){
 const nav=Object.entries(M).filter(([k,m])=>m.r.includes(u.rol));
 $('#app').innerHTML=`<div class="d-flex"><aside class="offcanvas-md offcanvas-start sidebar" id="sb"><div class="p-3 brand"><img src="${logo()}" height="34" style="border-radius:8px" alt=""> Taller<span style="color:var(--dorado)">Gest</span></div>
 <nav class="nav flex-column px-2 pb-3"><a class="nav-link ${pg=='dashboard'?'active':''}" href="dashboard.html"><i class="bi bi-house"></i>Inicio</a>${nav.map(([k,m])=>`<a class="nav-link ${k==pg?'active':''}" href="${k}.html"><i class="bi bi-${m.i}"></i>${m.t}</a>`).join('')}</nav></aside>
 <div class="flex-grow-1 min-vw-0"><header class="topbar d-flex align-items-center gap-2 px-3 py-2 bg-white shadow-sm"><button class="btn d-md-none" data-bs-toggle="offcanvas" data-bs-target="#sb"><i class="bi bi-list fs-4"></i></button><div class="ms-auto"></div><div class="dropdown"><button class="btn btn-sm position-relative" id="bell" data-bs-toggle="dropdown"><i class="bi bi-bell fs-5"></i><span id="bn" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none"></span></button><ul class="dropdown-menu dropdown-menu-end p-0" id="bl" style="width:300px"></ul></div><span class="small text-muted">${esc(u.nombre)} · ${ROLES[u.rol]}</span><button class="btn btn-sm btn-outline-primary" id="out">Salir</button></header><main class="p-3 p-md-4" id="main"></main></div></div>`;
 $('#out').onclick=async()=>{try{await api('POST','/api/logout')}catch(e){}sessionStorage.removeItem('tg_ses');location='index.html'};
 bell();$('#bell').addEventListener('click',()=>setTimeout(()=>{put('notif',get('notif').map(x=>x.para==u.id?{...x,leida:true}:x));$('#bn').classList.add('d-none')},50));addEventListener('storage',bell);
 if(pg=='dashboard')dash();else if(M[pg].custom)M[pg].pintar();else crud(pg)}

function bell(){
 const n=get('notif').filter(x=>x.para==u.id),nu=n.filter(x=>!x.leida).length;
 $('#bn').textContent=nu;$('#bn').classList.toggle('d-none',!nu);
 $('#bl').innerHTML=n.length?n.slice(0,8).map(x=>`<li class="dropdown-item-text small border-bottom ${x.leida?'text-muted':'fw-semibold'}">${esc(x.texto)}<div class="text-muted fw-normal">${esc(x.fecha)}</div></li>`).join(''):'<li class="dropdown-item-text small text-muted">Sin notificaciones</li>'}
