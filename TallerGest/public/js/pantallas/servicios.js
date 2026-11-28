/* PANTALLA · Gestión de servicios */
pantalla('servicios',{
 turno:true,
 f:[['descripcion','Descripción'],['categoria','Categoría','select',['Mantenimiento','Reparación','Diagnóstico']],['precio','Precio (RD$)','number']],
 dup:['descripcion',x=>`Ya existe el servicio «${x.descripcion}».`]
});
