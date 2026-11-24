/* NÚCLEO · flujo — lo que pasa automáticamente entre áreas: estados de la orden, avisos, stock y notas compartidas */

/* Avisos (campana). para = rol(es) o id de usuario */
function notif(para,texto){
 const us=get('usuarios').filter(x=>x.estado=='Activo'&&(Array.isArray(para)?para.includes(x.rol):x.id==para)&&(!u||x.id!=u.id)),n=get('notif');
 us.forEach(x=>n.unshift({id:Date.now()+Math.random(),para:x.id,texto,fecha:new Date().toLocaleString('es-DO'),leida:false}));put('notif',n.slice(0,300))}

/* La orden solo avanza (nunca retrocede automáticamente) */
function avanzar(oid,e){const l=get('ordenes'),o=l.find(x=>x.id==oid);if(o&&ESTADOS.indexOf(e)>ESTADOS.indexOf(o.estado)){const ant=o.estado;o.estado=e;o.actualizado=new Date().toISOString();put('ordenes',l);log('Cambió el estado de la orden','ordenes',o.codigo,`Estado: «${ant}» → «${e}» (automático)`)}}

/* Al finalizar el trabajo se guarda en el historial del vehículo */
function histAuto(oid){
 const o=get('ordenes').find(x=>x.id==oid);if(!o||get('historial').some(h=>h.orden==o.id))return;
 const c=get('cotizaciones').find(x=>x.orden==o.id&&x.estado=='Aprobada'),as=get('mecanicos').find(a=>a.orden==o.id),rc=get('recepcion').find(x=>x.orden==o.id)||get('recepcion').filter(x=>x.vehiculo==o.vehiculo).pop(),h=get('historial');
 h.push({id:Date.now(),vehiculo:o.vehiculo,cliente:o.cliente,fecha:hoy(),servicio:c?c.descripcion:'Trabajo según orden '+o.codigo,km:rc?rc.km:'',tecnico:as?nm('usuarios',as.mecanico):'',orden:o.id});put('historial',h)}

/* Stock: se valida y se descuenta cuando el cliente aprueba la cotización */
function chkStock(items){for(const x of items||[]){if(x.t!='r')continue;const r=get('repuestos').find(y=>y.id==x.id);if(r&&Number(r.stock)<x.c)return `Stock insuficiente de «${x.d}»: hay ${r.stock} y se necesitan ${x.c}.`}return null}
function descontar(cid){const l=get('cotizaciones'),c=l.find(x=>x.id==cid);if(!c||c.stockDesc)return;const rs=get('repuestos'),ln=[];(c.items||[]).forEach(x=>{if(x.t=='r'){const r=rs.find(y=>y.id==x.id);if(r){const a=Number(r.stock);r.stock=Math.max(0,a-x.c);ln.push(`${r.descripcion}: stock ${a} → ${r.stock}`)}}});c.stockDesc=true;put('repuestos',rs);put('cotizaciones',l);if(ln.length)log('Descontó stock de repuestos','repuestos','Cotización de '+nm('ordenes',c.orden),ln.join('\n'))}
function aprobar(cid,dec){
 const l=get('cotizaciones'),c=l.find(x=>x.id==cid);if(!c)return;c.estado=dec;put('cotizaciones',l);const ot=nm('ordenes',c.orden);
 if(dec=='Aprobada'){descontar(cid);avanzar(c.orden,'Aprobada');notif([F,A],`Cotización aprobada de ${ot}: ya se puede facturar.`+(c.nota?' Nota: '+c.nota:''));const as=get('mecanicos').find(a=>a.orden==c.orden);if(as)notif(as.mecanico,`El cliente aprobó la cotización de ${ot}: puedes iniciar el trabajo.`)}
 else if(dec=='Rechazada')notif([R,A],`El cliente rechazó la cotización de ${ot}.`)}

/* Cobros */
const pagado=(fid,ex)=>get('pagos').filter(p=>p.factura==fid&&p.id!=ex).reduce((a,p)=>a+Number(p.monto),0);

/* Lo que el mecánico pidió en el diagnóstico (repuestos/servicios) */
const necesidadesDe=oid=>{const d=get('diagnostico').filter(x=>x.orden==oid).pop();return d?{items:d.necesidades||[],otras:d.otras||''}:{items:[],otras:''}};

/* Notas y datos que acompañan a una orden, visibles para quien las necesita (mecánico, facturador...) */
function notasDe(oid,sinMotivo){
 const o=get('ordenes').find(x=>x.id==oid);if(!o)return [];
 const out=[],add=(l,t)=>{if(t!==undefined&&t!==null&&String(t).trim()!=='')out.push([l,String(t).trim()])};
 if(!sinMotivo)add('Falla o motivo reportado',o.motivo);
 const rc=get('recepcion').filter(x=>x.orden==o.id).pop();
 if(rc){if(rc.obs&&rc.obs!=o.motivo)add('Observaciones de la recepción',rc.obs);add('Kilometraje al recibir',rc.km)}
 const dg=get('diagnostico').filter(x=>x.orden==o.id).pop();
 if(dg){add('Diagnóstico del mecánico',[dg.resultado,dg.hallazgos].filter(Boolean).join(' — '));if((dg.necesidades||[]).length)add('Repuestos/servicios que pidió el mecánico',txtNecesidades(dg.necesidades));add('Otras piezas que pidió el mecánico',dg.otras)}
 const c=get('cotizaciones').filter(x=>x.orden==o.id).pop();
 if(c){add('Nota de la cotización',c.nota);const ap=get('aprobacion').filter(x=>x.cotizacion==c.id).pop();if(ap)add('Comentario del cliente al decidir',ap.comentario)}
 return out}
const panelNotas=(oid,tit='Notas de la orden',sinMotivo)=>{const n=notasDe(oid,sinMotivo);return n.length?`<div class="alert alert-info py-2 small mb-0"><b><i class="bi bi-sticky"></i> ${esc(tit)}</b>${n.map(([l,t])=>`<div><span class="text-muted">${esc(l)}:</span> <span style="white-space:pre-wrap">${esc(t)}</span></div>`).join('')}</div>`:''};
