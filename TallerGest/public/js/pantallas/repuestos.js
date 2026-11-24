/* PANTALLA · Gestión de repuestos (el código se genera solo; no se permiten repuestos repetidos) */
pantalla('repuestos',{
 turno:true,
 f:[['codigo','Código'],['descripcion','Descripción'],['stock','Stock','number'],['precio','Precio (RD$)','number']],
 dup:['descripcion',x=>`Ya existe el repuesto «${x.descripcion}» (código ${x.codigo}). Edítalo para ajustar su stock en vez de crear otro.`],
 campo:(f,v)=>f[0]=='codigo'?`<input name="codigo" class="form-control" readonly value="${esc(v)||sig('repuestos','codigo','REP-')}"><div class="form-text">Se genera automáticamente.</div>`:undefined,
 celda:(f,r)=>f[0]=='stock'&&r.stock!==undefined&&r.stock!==''?esc(r.stock)+(+r.stock<=5?' <span class="badge text-bg-danger">Bajo</span>':''):undefined
});
