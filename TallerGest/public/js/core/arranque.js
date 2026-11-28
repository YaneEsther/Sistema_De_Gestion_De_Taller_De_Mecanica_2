/* NÚCLEO · arranque — se ejecuta al final: valida la sesión, carga los datos y dibuja la pantalla */
(async()=>{
 if(pg=='login')return login();
 if(!u){location='index.html';return}
 if(pg!='dashboard'&&(!M[pg]||!M[pg].r.includes(u.rol))){location='dashboard.html';return}
 try{await cargar()}catch(e){return}
 shell();
 /* Cada 8 segundos se actualizan los datos (esto también mantiene viva la sesión) */
 setInterval(async()=>{if(pend||document.querySelector('.modal.show'))return;try{await cargar();if(window.__redraw)window.__redraw();bell()}catch(e){}},8000)})();
