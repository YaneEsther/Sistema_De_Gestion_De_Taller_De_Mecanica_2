/* NÚCLEO · fotos — fotos de la recepción del vehículo (evidencia de cómo lo entregan).
   Formatos: JPG, PNG, WebP (también se convierten GIF y BMP). Se reducen a 1280 px y se guardan como JPG. Máximo 12 por recepción. */
const FOTOS_MAX=12,FOTO_PESO_MAX=25*1024*1024,FOTO_TIPOS=['image/jpeg','image/png','image/webp','image/gif','image/bmp'];
const FU=new Map(),FOTOS={nuevas:[]};

/* La imagen se pide con el token de sesión y se muestra como archivo local */
async function fotoURL(id){if(FU.has(id))return FU.get(id);const r=await fetch('/api/fotos/'+id,{headers:{Authorization:'Bearer '+tk()}});if(!r.ok)throw new Error('foto');const url=URL.createObjectURL(await r.blob());FU.set(id,url);return url}
function comprimir(file,max=1280,q=.78){return new Promise((ok,er)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(url);cv.toBlob(b=>b?ok(b):er(),'image/jpeg',q)};im.onerror=()=>{URL.revokeObjectURL(url);er()};im.src=url})}
/* Devuelve el motivo por el que una foto no sirve, o null si está bien */
function validarImagen(f){
 if(/\.(heic|heif)$/i.test(f.name)||/hei[cf]/i.test(f.type))return 'es HEIC/HEIF (formato del iPhone) y el navegador no puede leerla. Compártela como JPG o, en el iPhone, usa Ajustes → Cámara → Formatos → «Más compatible».';
 if(!f.type||!f.type.startsWith('image/'))return 'no es una imagen. Solo se aceptan fotos JPG, PNG o WebP.';
 if(!FOTO_TIPOS.includes(f.type))return `el formato ${f.type.replace('image/','').toUpperCase()} no es compatible. Usa JPG, PNG o WebP.`;
 if(f.size>FOTO_PESO_MAX)return 'pesa más de 25 MB. Usa una foto más liviana.';
 return null}
async function subirFotos(id,fs){
 const fallos=[];
 for(const f of fs){try{const d=await new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=er;r.readAsDataURL(f.blob)});await api('POST','/api/recepcion/'+id+'/fotos',{nombre:f.nombre,tipo:'image/jpeg',datos:d})}catch(e){if(e.message!='401')fallos.push(`«${f.nombre}»: ${e.message}`)}}
 if(fallos.length)alert('No se pudieron subir estas fotos:\n'+fallos.join('\n'));
 await Q;await cargar().catch(()=>{});window.__redraw&&window.__redraw()}

/* Cuadrícula de miniaturas de solo lectura (para el detalle de una orden o recepción) */
function galeriaFotos(fotos){
 if(!fotos||!fotos.length)return '';
 setTimeout(()=>document.querySelectorAll('img[data-fl]').forEach(im=>{if(!im.src)fotoURL(im.dataset.fl).then(url=>{im.src=url;im.onclick=()=>window.open(url,'_blank')}).catch(()=>{})}),0);
 return `<div class="d-flex flex-wrap gap-2">${fotos.map(f=>`<img data-fl="${f.id}" alt="Foto del vehículo" style="width:96px;height:72px;object-fit:cover;border-radius:8px;cursor:zoom-in;background:#eee">`).join('')}</div>`}

/* Formulario de fotos de la recepción (agregar, ver y eliminar) */
const fotosHTML=()=>`<label class="form-label mt-3"><i class="bi bi-camera"></i> Fotos del vehículo (evidencia de cómo lo entregan)</label><input type="file" id="ff" accept="image/*" multiple class="form-control"><div class="form-text">Formatos: JPG, PNG o WebP. Hasta ${FOTOS_MAX} fotos por recepción; se reducen automáticamente.</div><div id="fe" class="text-danger small mt-1"></div><div id="fg" class="d-flex flex-wrap gap-2 mt-2"></div>`;
function fotosBind(r){
 FOTOS.nuevas=[];
 const g=$('#fg'),ya=()=>(r&&(get('recepcion').find(x=>x.id==r.id)||{}).fotos)||[],st='style="width:96px;height:72px;object-fit:cover;border-radius:8px;cursor:zoom-in;background:#eee"',bx='class="btn btn-sm btn-danger position-absolute top-0 end-0 py-0 px-1"';
 const pinta=()=>{g.innerHTML=ya().map(f=>`<div class="position-relative"><img data-f="${f.id}" alt="" ${st}><button type="button" data-fd="${f.id}" ${bx}>×</button></div>`).join('')+FOTOS.nuevas.map((n,i)=>`<div class="position-relative"><img src="${n.url}" alt="" ${st}><span class="badge text-bg-warning position-absolute bottom-0 start-0">nueva</span><button type="button" data-fn="${i}" ${bx}>×</button></div>`).join('');
  g.querySelectorAll('img[data-f]').forEach(im=>fotoURL(im.dataset.f).then(url=>{im.src=url}).catch(()=>{}))};
 $('#ff').onchange=async e=>{const msgs=[],cupo=Math.max(0,FOTOS_MAX-ya().length-FOTOS.nuevas.length);let usadas=0;
  for(const f of [...e.target.files]){
   const mal=validarImagen(f);if(mal){msgs.push(`«${f.name}» ${mal}`);continue}
   if(usadas>=cupo){msgs.push(`«${f.name}»: se alcanzó el máximo de ${FOTOS_MAX} fotos.`);continue}
   try{const b=await comprimir(f);FOTOS.nuevas.push({blob:b,nombre:f.name,url:URL.createObjectURL(b)});usadas++}catch{msgs.push(`«${f.name}»: no se pudo leer la imagen (puede estar dañada).`)}}
  $('#fe').innerHTML=msgs.map(esc).join('<br>');e.target.value='';pinta()};
 g.onclick=async e=>{const im=e.target.closest('img'),b=e.target.closest('button');
  if(b&&b.dataset.fn!==undefined){FOTOS.nuevas.splice(+b.dataset.fn,1);return pinta()}
  if(b&&b.dataset.fd){if(!confirm('¿Eliminar esta foto?'))return;try{await api('DELETE','/api/fotos/'+b.dataset.fd);const rr=get('recepcion').find(x=>x.id==r.id);if(rr)rr.fotos=rr.fotos.filter(f=>f.id!=b.dataset.fd);pinta()}catch(x){alert(x.message)}return}
  if(im&&im.src)window.open(im.src,'_blank')};
 pinta()}
