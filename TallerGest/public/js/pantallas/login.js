/* PANTALLA · Inicio de sesión (un usuario solo puede tener una sesión activa a la vez) */
function login(){
 const aviso=sessionStorage.getItem('tg_aviso');sessionStorage.removeItem('tg_aviso');
 $('#app').innerHTML=`<div class="login-bg"><div class="card login-card p-4"><div class="text-center mb-3"><div class="logo"><img src="${LOGO}" height="34" style="border-radius:8px" alt=""> Taller<span>Gest</span></div><div class="text-muted">Tu taller, mejor organizado</div></div>
 <form id="f"><div id="err" class="alert alert-danger py-2 ${aviso?'':'d-none'}">${esc(aviso||'')}</div><div id="forz" class="d-none mb-3"><button type="button" id="fz" class="btn btn-outline-danger w-100">Cerrar la otra sesión e iniciar aquí</button><div class="form-text">La otra pestaña o dispositivo se cerrará.</div></div><label class="form-label">Usuario</label><input class="form-control mb-3" id="us" required autofocus><label class="form-label">Contraseña</label><input type="password" class="form-control mb-3" id="cl" required><button class="btn btn-primary w-100">Iniciar sesión</button></form></div></div>`;
 const entrar=async forzar=>{const er=$('#err');er.className='alert alert-secondary py-2';er.textContent='Verificando...';$('#forz').classList.add('d-none');
  try{const r=await api('POST','/api/login',{usuario:$('#us').value.trim(),clave:$('#cl').value,forzar:!!forzar});sessionStorage.setItem('tg_ses',JSON.stringify({...r.user,token:r.token,inicio:new Date().toISOString()}));location='dashboard.html'}
  catch(x){er.className='alert alert-danger py-2';er.textContent=x.message;if(x.data&&x.data.activa){er.className='alert alert-warning py-2';$('#forz').classList.remove('d-none')}}};
 $('#f').onsubmit=e=>{e.preventDefault();entrar(false)};$('#fz').onclick=()=>entrar(true)}
