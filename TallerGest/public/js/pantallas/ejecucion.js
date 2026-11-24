/* PANTALLA · Ejecución del trabajo (el mecánico solo ve sus órdenes y solo las etapas que le faltan) */
const etapasPara=est=>est=='Aprobada'?['Repuestos','Ejecución']:est=='En ejecución'?['Repuestos','Ejecución','Finalización']:[];
const opcionesEtapa=(oid,v)=>{const o=get('ordenes').find(x=>x.id==oid),l=etapasPara(o&&o.estado);if(v&&!l.includes(v))l.push(v);
 return l.length?l.map(e=>`<option ${e==v?'selected':''}>${e}</option>`).join(''):'<option value="">Primero elige la orden</option>'};
const ayudaEtapa=oid=>{const o=get('ordenes').find(x=>x.id==oid);return !o?'':o.estado=='Aprobada'?'La cotización ya está aprobada: registra «Ejecución» al empezar (o «Repuestos» si esperas piezas).':o.estado=='En ejecución'?'El trabajo está en marcha: registra avances o «Finalización» al terminar.':''};
pantalla('ejecucion',{
 turno:true,
 f:[['orden','Orden de trabajo','ref','ordenes',o=>['Aprobada','En ejecución'].includes(o.estado)],['etapa','Etapa','select',['Repuestos','Ejecución','Finalización']],['notas','Notas del trabajo','textarea']],
 campo:(f,v,cur)=>f[0]=='etapa'?`<select name="etapa" id="etp" class="form-select" required>${opcionesEtapa(cur&&cur.orden,v)}</select><div class="form-text" id="eth">${ayudaEtapa(cur&&cur.orden)}</div>`:undefined,
 pie:()=>'<div id="enotas" class="mt-3"></div>',
 alAbrir:r=>{const notas=oid=>{$('#enotas').innerHTML=oid?panelNotas(oid,'Datos de la orden'):''};
  formOn('change',e=>{if(e.target.name!='orden')return;$('#etp').innerHTML=opcionesEtapa(e.target.value,'');$('#eth').textContent=ayudaEtapa(e.target.value);notas(e.target.value)});if(r)notas(r.orden)},
 despues:r=>{const ot=nm('ordenes',r.orden);if(r.etapa=='Ejecución')avanzar(r.orden,'En ejecución');if(r.etapa=='Finalización'){avanzar(r.orden,'Finalizada');histAuto(r.orden);notif([R,F,A],`Trabajo finalizado en ${ot}: ya se puede facturar y entregar el vehículo.`)}}
});
