index.html: contiene la interfaz y carga los módulos del frontend.
js/: reúne la lógica del dashboard, los formularios, los modales, la configuración y las traducciones.
css/: contiene los estilos, separados por componentes y secciones.
api.php: enruta las solicitudes hacia los manejadores PHP de api/.
La persistencia usa SQL Server mediante la extensión sqlsrv. La configuración de conexión está en api/config.php.

Puntos importantes para trabajar:

- Preparar el entorno antes de ejecutar: se necesita PHP con la extensión sqlsrv y una instancia de SQL Server con la base colorimetria.
  El repositorio no incluye una guía de instalación ni un esquema de base de datos visible en los archivos revisados; conviene documentar cómo configurar la base y sus tablas.
  
- Revisar la configuración de seguridad antes de publicar el servicio: api/config.php contiene credenciales escritas directamente en el código.
  Además, api.php permite solicitudes desde cualquier origen y expone errores SQL detallados en algunas respuestas. Hay que revisar estos puntos para el entorno donde vaya a desplegarse.
  
- Mantener sincronizados frontend y API: los nombres de endpoint se construyen en varios archivos JavaScript y se despachan en api.php.
  Al añadir o cambiar una función, conviene comprobar ambos lados y sus parámetros.
  
- Tratar CSV e imágenes como parte del flujo de datos: hay carga individual y por lotes, asociación de imágenes con muestras y eliminación de registros.
  Los cambios en estos procesos deberían considerar duplicados, registros relacionados e imágenes que todavía estén en uso.
  
- Validar las reglas de clasificación con datos reales: los umbrales de maduración, pigmentación y confianza están implementados en PHP.
  Un cambio puede afectar los KPIs y las etiquetas que aparecen en varias pantallas, así que conviene revisar sus efectos en frutas y aromáticas.
  
- Tener en cuenta dependencias heredadas: api.php conserva funciones de clasificación comentadas como compatibles con versiones anteriores, y clasificacion.php contempla un esquema alternativo de estados.
  Antes de simplificar o quitar lógica, revisen qué instalaciones de la base siguen dependiendo de ella.
  
- Revisar el control de versiones de documentación: .gitignore contiene una regla para ignorar archivos *.md.
  Si el equipo quiere agregar un README.md u otras notas Markdown al repositorio, tendrá que revisar esa regla y confirmar que el archivo quede incluido en Git.

  Por favor si van a hacer alguna actualizacion reportenla aqui para que los demas podamos entender lo que cambio y tenerlo en cuenta.
