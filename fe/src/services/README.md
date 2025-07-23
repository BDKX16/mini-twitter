# Services - Frontend API Endpoints Documentation

Esta carpeta contiene todos los servicios del frontend que se comunican con la API del backend. Cada servicio está organizado por dominio y contiene métodos específicos para interactuar con los endpoints correspondientes.

## 📋 Estructura de Servicios

### **Configuración Base**
- **`api.js`** - Configuración base de Axios con interceptors
- **`index.js`** - Exportaciones centralizadas

### **Servicios por Dominio**
- **`authService.js`** - Autenticación y registro
- **`userService.js`** - Gestión de usuarios y perfiles
- **`tweetService.js`** - Tweets y timeline
- **`followService.js`** - Sistema de seguimiento
- **`likeService.js`** - Sistema de likes
- **`retweetService.js`** - Sistema de retweets
- **`fileService.js`** - Subida de archivos
- **`trendsService.js`** - Tendencias y hashtags

## 🌐 Endpoints por Servicio

### **🔐 Authentication Service (`authService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/auth/register` | Registro de nuevo usuario |
| `POST` | `/auth/login` | Login de usuario |
| `GET` | `/users/check/username/{username}` | Verificar disponibilidad de username |

#### Métodos del Servicio:
- `register(userData)` - Registrar nuevo usuario
- `login(username)` - Iniciar sesión
- `logout()` - Cerrar sesión (local)
- `isAuthenticated()` - Verificar estado de autenticación
- `checkUserExists(username)` - Verificar si usuario existe
- `getToken()` - Obtener token actual

---

### **👤 User Service (`userService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/users/profile` | Obtener perfil del usuario actual |
| `GET` | `/users/{userId}` | Obtener usuario por ID |
| `GET` | `/users/username/{username}` | Obtener usuario por username |
| `PUT` | `/users/me` | Actualizar perfil del usuario |
| `GET` | `/users/search?q={query}&limit={limit}&skip={skip}` | Buscar usuarios |
| `GET` | `/users?limit={limit}&skip={skip}` | Obtener lista de usuarios |
| `GET` | `/users/me/suggestions?limit={limit}&skip={skip}` | Obtener usuarios sugeridos |
| `GET` | `/users/{userId}/stats` | Obtener estadísticas de usuario |
| `DELETE` | `/users/profile` | Eliminar cuenta del usuario |
| `GET` | `/users/check-username/{username}` | Verificar disponibilidad de username |

#### Métodos del Servicio:
- `getProfile()` - Obtener perfil actual
- `getUserById(userId)` - Obtener usuario por ID
- `getUserByUsername(username)` - Obtener usuario por username
- `updateProfile(userData)` - Actualizar perfil
- `searchUsers(query, options)` - Buscar usuarios
- `getUsers(options)` - Obtener lista de usuarios
- `getSuggestedUsers(options)` - Obtener usuarios sugeridos
- `getUserStats(userId)` - Obtener estadísticas
- `deleteAccount()` - Eliminar cuenta
- `checkUsernameAvailability(username)` - Verificar disponibilidad

---

### **🐦 Tweet Service (`tweetService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/timeline/public?limit={limit}&skip={skip}` | Timeline público (sin auth) |
| `GET` | `/timeline/home?limit={limit}&skip={skip}` | Timeline personal (con auth) |
| `POST` | `/tweets` | Crear nuevo tweet |
| `GET` | `/tweets/{tweetId}` | Obtener tweet por ID |
| `DELETE` | `/tweets/{tweetId}` | Eliminar tweet |
| `GET` | `/users/{userId}/tweets?limit={limit}&page={page}` | Tweets de un usuario |
| `GET` | `/tweets/me/timeline?limit={limit}&skip={skip}` | Timeline personal alternativo |
| `GET` | `/tweets/search?q={query}&limit={limit}&skip={skip}` | Buscar tweets |
| `POST` | `/tweets/{tweetId}/reply` | Crear reply a tweet |
| `GET` | `/tweets/{tweetId}/replies?limit={limit}&skip={skip}` | Obtener replies de tweet |

#### Métodos del Servicio:
- `getPublicTimeline(options)` - Timeline público
- `getTimeline(options)` - Timeline personal
- `createTweet(tweetData)` - Crear tweet
- `getTweetById(tweetId)` - Obtener tweet
- `deleteTweet(tweetId)` - Eliminar tweet
- `getUserTweets(userId, options)` - Tweets de usuario
- `getMyTimeline(options)` - Mi timeline
- `searchTweets(query, options)` - Buscar tweets
- `createReply(tweetId, content)` - Crear respuesta
- `getTweetReplies(tweetId, options)` - Obtener respuestas

---

### **👥 Follow Service (`followService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/users/{userId}/follow` | Seguir usuario |
| `DELETE` | `/users/{userId}/follow` | Dejar de seguir usuario |
| `GET` | `/follows/{userId}/followers?limit={limit}&skip={skip}` | Obtener seguidores |
| `GET` | `/follows/{userId}/following?limit={limit}&skip={skip}` | Obtener seguidos |
| `GET` | `/follows/{userId}/status` | Verificar estado de seguimiento |

#### Métodos del Servicio:
- `followUser(userId)` - Seguir usuario
- `unfollowUser(userId)` - Dejar de seguir
- `getFollowers(userId, options)` - Obtener seguidores
- `getFollowing(userId, options)` - Obtener seguidos
- `isFollowing(userId)` - Verificar si sigue

---

### **❤️ Like Service (`likeService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/tweets/{tweetId}/like` | Dar like a tweet |
| `DELETE` | `/tweets/{tweetId}/like` | Quitar like de tweet |
| `GET` | `/likes/user/{userId}?limit={limit}&skip={skip}` | Obtener likes de usuario |
| `GET` | `/likes/tweet/{tweetId}?limit={limit}&skip={skip}` | Obtener likes de tweet |

#### Métodos del Servicio:
- `likeTweet(tweetId)` - Dar like
- `unlikeTweet(tweetId)` - Quitar like
- `getUserLikes(userId, options)` - Likes de usuario
- `getTweetLikes(tweetId, options)` - Likes de tweet

---

### **🔄 Retweet Service (`retweetService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/tweets/{tweetId}/retweet` | Hacer retweet |
| `DELETE` | `/tweets/{tweetId}/retweet` | Quitar retweet |
| `GET` | `/retweets/user/{userId}?limit={limit}&skip={skip}` | Obtener retweets de usuario |
| `GET` | `/retweets/tweet/{tweetId}?limit={limit}&skip={skip}` | Obtener retweets de tweet |

#### Métodos del Servicio:
- `retweet(tweetId)` - Hacer retweet
- `unretweet(tweetId)` - Quitar retweet
- `getUserRetweets(userId, options)` - Retweets de usuario
- `getTweetRetweets(tweetId, options)` - Retweets de tweet

---

### **📁 File Service (`fileService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/upload/image` | Subir imagen (requiere auth) |

#### Métodos del Servicio:
- `uploadImage(imageFile)` - Subir imagen individual
- `uploadMultipleImages(imageFiles)` - Subir múltiples imágenes

#### **Endpoints adicionales usados directamente:**
| Método | Endpoint | Descripción | Ubicación |
|--------|----------|-------------|-----------|
| `POST` | `/upload/registration-image` | Subir imagen durante registro (sin auth) | `page.tsx` |

---

### **📈 Trends Service (`trendsService.js`)**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/trends/topics?hours={hours}&limit={limit}` | Obtener temas trending |
| `GET` | `/trends/hashtags?hours={hours}&limit={limit}` | Obtener hashtags trending |

#### Métodos del Servicio:
- `getTrendingTopics(options)` - Temas en tendencia
- `getTrendingHashtags(options)` - Hashtags en tendencia

---

## 🔧 Configuración Base (`api.js`)

### **Configuración de Axios:**
- **Base URL:** `process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"`
- **Timeout:** 10000ms
- **Headers:** `Content-Type: application/json`

### **Interceptors:**

#### **Request Interceptor:**
- Agrega automáticamente el token `Authorization: Bearer {token}` a todas las peticiones
- Obtiene el token desde `localStorage.getItem("token")`

#### **Response Interceptor:**
- Extrae automáticamente `response.data` de las respuestas exitosas
- Maneja errores 401 (token expirado):
  - Elimina token del localStorage
  - Recarga la página
- Extrae mensajes de error de `error.response.data.message`

---

## 📊 Resumen de Endpoints

### **Por Categoría:**

#### **🔐 Autenticación (2 endpoints)**
- `/auth/register`
- `/auth/login`

#### **👤 Usuarios (10 endpoints)**
- `/users/profile`
- `/users/{userId}`
- `/users/username/{username}`
- `/users/me`
- `/users/search`
- `/users`
- `/users/me/suggestions`
- `/users/{userId}/stats`
- `/users/check/username/{username}`
- `/users/check-username/{username}`

#### **🐦 Tweets (10 endpoints)**
- `/timeline/public`
- `/timeline/home`
- `/tweets`
- `/tweets/{tweetId}`
- `/users/{userId}/tweets`
- `/tweets/me/timeline`
- `/tweets/search`
- `/tweets/{tweetId}/reply`
- `/tweets/{tweetId}/replies`

#### **👥 Follows (5 endpoints)**
- `/users/{userId}/follow`
- `/follows/{userId}/followers`
- `/follows/{userId}/following`
- `/follows/{userId}/status`

#### **❤️ Likes (4 endpoints)**
- `/tweets/{tweetId}/like`
- `/likes/user/{userId}`
- `/likes/tweet/{tweetId}`

#### **🔄 Retweets (4 endpoints)**
- `/tweets/{tweetId}/retweet`
- `/retweets/user/{userId}`
- `/retweets/tweet/{tweetId}`

#### **📁 Archivos (2 endpoints)**
- `/upload/image`
- `/upload/registration-image`

#### **📈 Tendencias (2 endpoints)**
- `/trends/topics`
- `/trends/hashtags`

### **Total: 39 endpoints únicos**

---

## 🔒 Autenticación

### **Endpoints que requieren autenticación:**
- Todos los endpoints excepto:
  - `/auth/register`
  - `/auth/login`
  - `/timeline/public`
  - `/users/check/username/{username}`
  - `/upload/registration-image`

### **Manejo de tokens:**
- Se almacenan en `localStorage` con la clave `"token"`
- Se envían automáticamente en el header `Authorization: Bearer {token}`
- Se eliminan automáticamente en caso de error 401

---

## 📝 Notas de Implementación

### **Parámetros comunes:**
- `limit` - Número máximo de resultados (por defecto: 20)
- `skip` - Número de elementos a omitir para paginación
- `page` - Número de página (alternativo a skip)
- `q` - Query de búsqueda

### **Estructura de respuesta estándar:**
```javascript
{
  success: boolean,
  data: any,
  message?: string
}
```

### **Manejo de errores:**
Todos los servicios propagan errores para ser manejados por los componentes que los consumen.

---

_Documentación de endpoints del Frontend - Challenge Uala Twitter Clone_
