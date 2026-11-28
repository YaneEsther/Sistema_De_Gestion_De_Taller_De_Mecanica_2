/* Carga los archivos de la aplicación en orden: primero el núcleo (js/core), luego la pantalla actual
   (js/pantallas/<data-m de la página>.js) y por último el arranque. Así cada pantalla vive en su propio archivo. */
(()=>{
 const V='3.0.0',p=document.body.dataset.m;
 ['base','datos','modulos','bitacora','turno','flujo','ui','impresion','fotos','cotizador','clientevehiculo','crud','shell','ayuda-datos'].map(f=>'core/'+f)
  .concat(['pantallas/'+p,'core/arranque'])
  .forEach(f=>{const s=document.createElement('script');s.src='js/'+f+'.js?v='+V;s.async=false;document.body.appendChild(s)})})();
