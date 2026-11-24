/* NÚCLEO · base — utilidades y constantes compartidas por todas las pantallas */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Roles y constantes del negocio */
const ROLES={admin:'Administrador',mecanico:'Mecánico',recepcion:'Recepcionista',facturador:'Facturador'};
const A='admin',R='recepcion',ME='mecanico',F='facturador';
const METODOS=['Efectivo','Tarjeta de crédito','Tarjeta de débito','Transferencia','Cheque'];
const ESTADOS=['Recibida','Diagnosticada','Cotizada','Aprobada','En ejecución','Finalizada','Facturada','Pagada'];

/* Colores de las etiquetas de estado */
const BC={Pagada:'success',Finalizada:'success',Facturada:'success',Aprobada:'success',Activo:'success','Sin anomalías':'success',Parcial:'warning',Pendiente:'warning',Recibida:'secondary',Diagnosticada:'info',Cotizada:'info','En ejecución':'primary',Rechazada:'danger',Inactivo:'danger','Con fallas':'danger'};
const bdg=v=>`<span class="badge text-bg-${BC[v]||'secondary'}">${esc(v)}</span>`;

/* Formatos */
const fmt=n=>Number(n).toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2});
const hoy=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const hora=iso=>new Date(iso).toLocaleString('es-DO',{dateStyle:'short',timeStyle:'short'});
/* Normaliza texto para comparar: sin mayúsculas, tildes ni espacios sobrantes */
const nrm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();

/* Sesión del usuario (se guarda por pestaña) y pantalla actual */
const u=JSON.parse(sessionStorage.getItem('tg_ses')||'null'),pg=document.body.dataset.m;

/* Preferencias simples guardadas en el navegador (tamaño de página, filtros) */
const prefGet=(k,d)=>{try{const v=localStorage.getItem('tg_'+k);return v===null?d:v}catch(e){return d}};
const prefSet=(k,v)=>{try{localStorage.setItem('tg_'+k,v)}catch(e){}};
