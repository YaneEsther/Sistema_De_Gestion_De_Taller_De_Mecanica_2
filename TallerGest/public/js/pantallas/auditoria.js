/* PANTALLA · Auditoría (solo lectura, solo administrador): quién hizo qué, sobre qué registro y qué datos cambiaron */
pantalla('auditoria',{
 ro:1,nCols:6,
 f:[['fecha','Fecha y hora'],['nombre','Usuario'],['accion','Acción'],['modulo','Módulo'],['registro','Registro'],['detalle','Detalle del cambio']],
 celda:(f,r)=>f[0]=='detalle'?`<div class="small text-muted" style="white-space:pre-wrap;min-width:240px">${esc(r.detalle)}</div>`
  :f[0]=='modulo'?esc((M[r.modulo]||{}).t||r.modulo)
  :f[0]=='accion'?`<span class="badge text-bg-${/^Cre/.test(r.accion)?'success':/^(Edit|Cambi|Descont)/.test(r.accion)?'warning':/^(Elimin|Intento|Acceso|Inicio de sesión bloq)/.test(r.accion)?'danger':'secondary'}">${esc(r.accion)}</span>`:undefined,
 filtros:()=>`<div class="col-6 col-md-3"><select id="fm" class="form-select"><option value="">Todos los módulos</option>${[...new Set(get('auditoria').map(a=>a.modulo))].filter(Boolean).map(x=>`<option value="${esc(x)}">${esc((M[x]||{}).t||x)}</option>`).join('')}</select></div><div class="col-6 col-md-3"><select id="fu" class="form-select"><option value="">Todos los usuarios</option>${[...new Set(get('auditoria').map(a=>a.nombre))].filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`,
 filtro:r=>(!$('#fm').value||r.modulo==$('#fm').value)&&(!$('#fu').value||r.nombre==$('#fu').value)
});
