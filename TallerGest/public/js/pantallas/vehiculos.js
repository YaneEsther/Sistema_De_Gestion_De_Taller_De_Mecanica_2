/* PANTALLA · Registro de vehículos (cada vehículo pertenece a un cliente; un cliente puede tener varios) */
pantalla('vehiculos',{
 turno:true,
 f:[['placa','Placa / VIN'],['marca','Marca'],['modelo','Modelo'],['anio','Año','number'],['cliente','Cliente','ref','clientes']],
 dup:['placa',x=>`Ya existe un vehículo con la placa «${x.placa}» (${nm('clientes',x.cliente)}).`]
});
