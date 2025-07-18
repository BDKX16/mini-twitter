Bueno en este documento voy a comentar como cree esta api y los problemas que fueron surgiendo
en el medio, primero en principal hola soy Xavier Galarreta y esta es la documentacion del
challenge de uala para crear una mini-tweeter app.

El primer problema que enfrente y quiza el mas grande es que nunca use twitter, conocia la aplicacion
y su principal llamativo de posteos de caracteres limitados pero nunca la habia usado asi que me puse
a investigar de la misma y su historia, tambien y mas importante que problemas enfrentaron los desarrolladores
al crear twitter, y el mas grande de ellos fue la escalabilidad y el manejo de millones de consultas. Como
la consigna del challenge fue priorizar esto mismo decidi hacer una api en el lenguaje que mas conozco y mas facilidad
tengo que es node.js, con base de datos en MongoDb, y Typescript para su robustez y mantenibilidad.

Para una aplicacion mantenible y escalable lo mas importante es una buena arquitectura. Para esto empece con una MVC y muy temprano me encontre
con que nesesitaba mas capas, por lo que decidi pasar a una Clean/hexagonal architecture. Agregando las capas de:

- repositories: Encargandose de las interfaces para la capa de infraestructure
- infraestructure: La capa encargada de el manejo de la base de datos y servicios externos. Por que? (Proximo parrafo)
- services: manejo de la logica de negocio
  Y los ya existentes:
- routes: Rutas a los controladores
- controllers: controladores de los endpoints
- middlewares: donde esta la verificacion de usuarios y un rate limiter[problema futuro] (en esta aplicacion no tendrian uso ya que en la consigna no se precisaba autentificacion, pero aca iria)
- models: Modelos de la aplicación

A este punto el siguiente problema se encontro el equipo de twitter y me encontre yo, MongoDb es una exelente base de datos y muy escalable horizontalmente pero que pasa, si se hacen millones de consultas
no va a dar a basto, el timeline puede ser muy pesado, entre otras consultas, si se hacen muchas peticiones al mismo tiempo. Entonces toco usar una herramienta muy util para esto, que no conocia, que es Redis.
Esta es una base de datos en cache, que significa esto? que si por ejemplo un usuario realiza una consulta de la timeline y ya habia realizado una antes, no va a tener que ir a buscar la consulta a mongo (que
en caso de la timeline seria una consulta pesada, y tardaria uno o dos segundos), va a retornarla instantaneamente ya que esta en cache.

Para esto se luce la capa de infraestructura, ya que al aislar todas las consultas a base de datos, tanto redis como mongo van a ir aislados en esta capa y para toda la aplicacion no deberia cambiar. Por tanto
para el resto de la aplicacion no cambia nada, pero si esta solucion que ya es bastante escalable llega a nesesitar otra tecnologia u herramienta, o mejora, solo hay que cambiarlo en la capa de infraestructura.
Por ahora solo agregariamos redis a esta capa.
