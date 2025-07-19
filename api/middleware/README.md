Para el middleware de esta aplicacion decidi hacer un limitador de solicitudes para ciertos casos, ya que cuando se manejen millones de peticiones se puede saturar la aplicacion ante ataques malintencionados.

Para una mayor seguridad seria optimo usar autentificacion jwt o Auth0 pero no era requerido por el documento del challenge asi que solo se hara el Rate Limiter.

Para que sea optimo el limitador se definen los diferentes casos de uso:

- public: Rutas publicas
- auth: Login attempts
- authenticated: Acciones por un mismo usuario autenticado
- contentCreation: Creacion de contenido critico, como tweets (que relentizan mas la db que las lecturas)
- socialAction: Acciones como likes, retweets y follows
- bulkOperation: Operaciones masivas a una solicitud cada 10 minutos.

Toda request se checkea y registra en Redis para llevar el conteo y control asegurando la eficiencia, en el archivo rateLimiter.ts es donde se valida y persisten estos datos. Asi se registran en Redis los distintos rate_limiters:

"rate_limit:critical:user123:createTweet:1642339200000"

"rate_limit:public:192.168.1.1:1642339200000"

"rate_limit:auth:192.168.1.1:1642339200000"

"rate_limit:bulk:user123:1642339200000"

Este sistema te da control granular sobre diferentes tipos de endpoints, permitiendo aplicar restricciones específicas según la criticidad y el tipo de operación.

Este es el flujo normal:

1. HTTP Request → Express Router
   ↓
2. Middleware de Protección (createProtectionMiddleware)
   ↓
3. applyRateLimiting() desde rateLimitConfig.ts
   ↓
4. RateLimiter.checkLimit() - Consulta Redis
   ↓
5. ¿Límite superado?
   ├─ SÍ → Respuesta 429 + headers de rate limit
   └─ NO → Continúa al paso 6
   ↓
6. next() - Pasa al siguiente middleware/controlador
   ↓
7. Controlador ejecuta la lógica de negocio
   ↓
8. monitoringMiddleware registra métricas y logs
   ↓
9. Respuesta HTTP al cliente

En caso de muchas requests devuelve status 429:
{
"success": false,
"error": "Rate limit exceeded",
"message": "Rate limit exceeded for IP. Try again in 597 seconds.",
"retryAfter": 597
}

Idea para escalarlo con mas usuarios: En un panel de administracion o automatizado podrian ser dinamicos estos valores (En este caso se limita a 3 solicitudes y 10 minutos de penalizacion) de acuerdo al rendimiento del servidor, en caso de mucho trafico se podria bajar o subir, manual o automaticamente los valores
