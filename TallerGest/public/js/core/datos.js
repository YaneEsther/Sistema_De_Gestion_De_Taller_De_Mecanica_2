/* NÚCLEO · datos — comunicación con el servidor y copia local de los datos */
let DB={},pend=0;const SNAP={};
const tk=()=>(JSON.parse(sessionStorage.getItem('tg_ses')||'null')||{}).token;

async function api(m,url,body){
 const r=await fetch(url,{method:m,headers:{'Content-Type':'application/json',...(tk()?{Authorization:'Bearer '+tk()}:{})},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));
 /* Sesión cerrada o reemplazada: volver al login con un aviso */
 if(r.status==401&&!url.includes('/api/login')){sessionStorage.removeItem('tg_ses');sessionStorage.setItem('tg_aviso',j.error||'Tu sesión terminó. Inicia sesión de nuevo.');location='index.html';throw new Error('401')}
 if(!r.ok){const e=new Error(j.error||'Error del servidor');e.status=r.status;e.data=j;throw e}
 return j}

const get=(k,d=[])=>DB[k]??d;
const snap=a=>new Map(a.map(x=>[String(x.id),JSON.stringify(x)]));

/* Los guardados se envían en orden, uno tras otro */
let Q=Promise.resolve();
function send(k,b){pend++;const p=Q.then(()=>api('POST','/api/data/'+k,b));Q=p.catch(()=>{});
 return p.then(()=>true,e=>{if(e.message!='401')alert('No se pudo guardar: '+e.message+'. Se recargarán los datos.');return cargar().then(()=>window.__redraw&&window.__redraw()).catch(()=>{}).then(()=>false)}).finally(()=>{pend--})}

/* put: reemplaza la lista de un módulo y envía al servidor solo lo que cambió */
const put=(k,v)=>{
 DB[k]=v;if(k=='cfg')return send(k,{up:[{id:'cfg',...v}],del:[]});
 const prev=SNAP[k]||new Map(),nw=snap(v);
 const up=v.filter(x=>prev.get(String(x.id))!==nw.get(String(x.id))),del=[...prev.keys()].filter(id=>!nw.has(id));
 SNAP[k]=nw;return up.length||del.length?send(k,{up,del}):Promise.resolve(true)};

async function cargar(){const d=await api('GET','/api/data');d.cfg=d.cfg&&d.cfg[0]?(({id,...r})=>r)(d.cfg[0]):{};DB=d;for(const k in d)if(Array.isArray(d[k]))SNAP[k]=snap(d[k])}
