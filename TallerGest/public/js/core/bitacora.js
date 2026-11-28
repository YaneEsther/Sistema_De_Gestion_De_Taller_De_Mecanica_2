/* NÚCLEO · bitácora — arma el detalle que se guarda en la auditoría (qué se creó, qué cambió y por cuáles datos) */
const LOGX={facturacion:[['descripcion','Detalle']],cotizaciones:[['nota','Nota']],diagnostico:[['otras','Otras piezas necesarias']]};
const camposLog=k=>[...M[k].f.filter(f=>f[2]!='password'),...(LOGX[k]||[])];
function vlog(f,r){const v=r[f[0]];if(v===undefined||v===null||v==='')return '(vacío)';if(f[2]=='ref')return nm(f[3],v);if(f[0]=='rol')return ROLES[v]||v;if(['total','monto','precio'].includes(f[0])&&!isNaN(v))return 'RD$ '+fmt(v);return String(v)}
/* Cambios entre dos versiones de un registro: «Campo: «antes» → «después»» */
function dif(k,a,b){const o=[];for(const f of camposLog(k)){const x=vlog(f,a),y=vlog(f,b);if(x!==y)o.push(`${f[1]}: «${x}» → «${y}»`)}if(k=='usuarios'&&b.clave)o.push('Contraseña: cambiada');if(k=='diagnostico'&&JSON.stringify(a.necesidades||[])!=JSON.stringify(b.necesidades||[]))o.push('Repuestos/servicios solicitados: '+txtNecesidades(a.necesidades)+' → '+txtNecesidades(b.necesidades));return o.join('\n')}
/* Datos de un registro nuevo o eliminado */
function resumen(k,r){const o=[];for(const f of camposLog(k)){const v=vlog(f,r);if(v!=='(vacío)')o.push(`${f[1]}: ${v}`)}if(k=='diagnostico'&&(r.necesidades||[]).length)o.push('Repuestos/servicios solicitados: '+txtNecesidades(r.necesidades));return o.join('\n')}
const txtNecesidades=n=>(n||[]).length?n.map(x=>`${x.d}${x.c>1?' x'+x.c:''}`).join(', '):'(ninguno)';
/* Nombre con el que se identifica el registro en la auditoría */
const regLbl=(k,r)=>{if(k=='repuestos')return `${r.codigo||''} · ${r.descripcion||''}`;const f=M[k].f[0],v=f[2]=='ref'?nm(f[3],r[f[0]]):r[f[0]];return String(v??'—')};
function log(accion,modulo,registro,detalle){const l=get('auditoria');l.unshift({id:Date.now()+Math.random(),fecha:new Date().toLocaleString('es-DO'),usuario:u?u.usuario:'—',nombre:u?u.nombre:'—',accion,modulo,registro:registro||'',detalle:String(detalle||'').slice(0,900)});put('auditoria',l.slice(0,300))}
