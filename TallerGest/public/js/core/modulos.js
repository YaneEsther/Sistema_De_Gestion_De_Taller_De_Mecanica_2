/* NÚCLEO · módulos — menú, permisos por rol y nombres que se muestran de cada registro.
   Cada pantalla completa su definición en js/pantallas/<modulo>.js con pantalla('<modulo>',{...}) */

/* título, icono y roles con acceso — el orden es el del menú lateral */
const MENU={
 clientes:['Registro de clientes','people',[A,R]],
 vehiculos:['Registro de vehículos','car-front',[A,R]],
 historial:['Historial de mantenimiento','clock-history',[A,R,ME]],
 recepcion:['Recepción del vehículo','box-arrow-in-right',[A,R]],
 diagnostico:['Diagnóstico','clipboard2-pulse',[A,ME]],
 ordenes:['Órdenes de trabajo','tools',[A,R,ME]],
 mecanicos:['Asignación de mecánicos','person-gear',[A,R]],
 servicios:['Gestión de servicios','wrench-adjustable',[A,R]],
 repuestos:['Gestión de repuestos','gear',[A,ME]],
 cotizaciones:['Cotizaciones','file-earmark-text',[A,R,F]],
 aprobacion:['Aprobación del cliente','check2-circle',[A,R]],
 ejecucion:['Ejecución del trabajo','play-circle',[A,ME]],
 facturacion:['Facturación','receipt',[A,F]],
 pagos:['Pagos','credit-card',[A,F]],
 usuarios:['Usuarios y roles','person-badge',[A]],
 auditoria:['Auditoría','shield-check',[A]],
 reportes:['Reportes','bar-chart',[A,F]],
 configuracion:['Configuración','sliders',[A]],
 ayuda:['Centro de ayuda','question-circle',[A,R,ME,F]]
};
const M={};for(const k in MENU){const [t,i,r]=MENU[k];M[k]={t,i,r}}
/* Cada archivo de pantalla registra aquí sus campos y reglas */
const pantalla=(k,def)=>Object.assign(M[k],def);

/* Lo que ve cada rol */
const mine=()=>get('mecanicos').filter(a=>a.mecanico==u.id).map(a=>String(a.orden));
const vis=(k,rows)=>u&&u.rol==ME?(k=='ordenes'?rows.filter(o=>mine().includes(String(o.id))):k=='ejecucion'?rows.filter(e=>mine().includes(String(e.orden))):rows):rows;

/* Nombre corto de un registro (para tablas y bitácora) */
const NM={
 usuarios:r=>r.nombre, clientes:r=>r.nombre, vehiculos:r=>r.placa, ordenes:r=>r.codigo, facturacion:r=>r.numero,
 cotizaciones:r=>{const o=get('ordenes').find(x=>x.id==r.orden)||{};return `${o.codigo||'—'} · ${nm('clientes',o.cliente)} · RD$ ${fmt(r.total)}`}
};
const nm=(k,id)=>{const r=get(k).find(x=>x.id==id);return r?(NM[k]?NM[k](r):r[M[k].f[0][0]]):'—'};

/* Nombre largo con contexto (para listas desplegables y detalles) */
const vehTxt=v=>v?`${v.placa} · ${[v.marca,v.modelo,v.anio].filter(Boolean).join(' ')}`:'—';
const clienteDeOrden=o=>o?nm('clientes',o.cliente):'—';
const ETQ={
 clientes:x=>x.nombre+(x.telefono?' · '+x.telefono:''),
 vehiculos:x=>vehTxt(x)+' · '+nm('clientes',x.cliente),
 ordenes:x=>`${x.codigo} · ${nm('clientes',x.cliente)} · ${vehTxt(get('vehiculos').find(v=>v.id==x.vehiculo))}`,
 cotizaciones:x=>{const o=get('ordenes').find(y=>y.id==x.orden);return `Cotización de ${o?ETQ.ordenes(o):'—'} · RD$ ${fmt(x.total)}`},
 facturacion:x=>`${x.numero} · ${clienteDeOrden(get('ordenes').find(o=>o.id==x.orden))} · RD$ ${fmt(x.total)}`,
 usuarios:x=>x.nombre
};
const etq=(k,x)=>ETQ[k]?ETQ[k](x):nm(k,x.id);

/* Genera el siguiente código: sig('repuestos','codigo','REP-') → REP-001 */
const sig=(k,c,pre)=>pre+String(Math.max(0,...get(k).map(x=>parseInt(String(x[c]).replace(/\D/g,''))||0))+1).padStart(3,'0');
