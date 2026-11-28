/* NÚCLEO · turno — el turno de cada usuario empieza en su último cierre o a las 00:00 del día (lo que sea más reciente).
   Al cerrar turno o cambiar de día, los conteos y listas «del turno» vuelven a empezar. */
const ultCierre=()=>get('cierres').filter(x=>x.por==u.id).map(x=>x.hasta).sort().pop()||'';
const inicioTurno=()=>{const d=new Date();d.setHours(0,0,0,0);const dia=d.toISOString(),uc=ultCierre();return uc>dia?uc:dia};
const enTurno=ts=>!!ts&&ts>inicioTurno();
/* ¿Lo registré yo en este turno? */
const delTurno=x=>x.por==u.id&&enTurno(x.creado);
