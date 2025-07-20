# Services Layer - Documentación

Esta capa de servicios proporciona una interfaz simple para interactuar con el backend API usando axios.

## Configuración

### Variables de entorno

Asegúrate de tener el archivo `.env.local` con:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Uso de los servicios

### 1. Servicio de Autenticación (`authService`)

```javascript
import { authService } from "@/services";

// Login
const handleLogin = async () => {
  try {
    const response = await authService.login(username, password);
    // El token se guarda automáticamente
    console.log("Login exitoso:", response);
  } catch (error) {
    console.error("Error en login:", error.message);
  }
};

// Registro
const handleRegister = async () => {
  try {
    const userData = {
      username: "mi_usuario",
      firstName: "Juan",
      lastName: "Pérez",
      password: "mi_password",
    };
    const response = await authService.register(userData);
    console.log("Registro exitoso:", response);
  } catch (error) {
    console.error("Error en registro:", error.message);
  }
};

// Logout
const handleLogout = () => {
  authService.logout(); // Limpia el token y recarga la página
};

// Verificar autenticación
const isLoggedIn = authService.isAuthenticated();
```

### 2. Servicio de Usuarios (`userService`)

```javascript
import { userService } from "@/services";

// Obtener perfil actual
const getMyProfile = async () => {
  try {
    const response = await userService.getProfile();
    console.log("Mi perfil:", response.data.user);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Buscar usuarios
const searchUsers = async (query) => {
  try {
    const response = await userService.searchUsers(query, { limit: 10 });
    console.log("Usuarios encontrados:", response.data.users);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Actualizar perfil
const updateProfile = async () => {
  try {
    const updateData = {
      firstName: "Nuevo Nombre",
      bio: "Mi nueva biografía",
    };
    const response = await userService.updateProfile(updateData);
    console.log("Perfil actualizado:", response.data.user);
  } catch (error) {
    console.error("Error:", error.message);
  }
};
```

### 3. Servicio de Tweets (`tweetService`)

```javascript
import { tweetService } from "@/services";

// Obtener timeline
const getTimeline = async () => {
  try {
    const response = await tweetService.getTimeline({ limit: 20 });
    console.log("Timeline:", response.data.tweets);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Crear tweet
const createTweet = async (content) => {
  try {
    const response = await tweetService.createTweet({ content });
    console.log("Tweet creado:", response.data.tweet);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Obtener tweets de un usuario
const getUserTweets = async (userId) => {
  try {
    const response = await tweetService.getUserTweets(userId, { limit: 10 });
    console.log("Tweets del usuario:", response.data.tweets);
  } catch (error) {
    console.error("Error:", error.message);
  }
};
```

### 4. Servicio de Likes (`likeService`)

```javascript
import { likeService } from "@/services";

// Dar like
const likeTweet = async (tweetId) => {
  try {
    const response = await likeService.likeTweet(tweetId);
    console.log("Like dado:", response.data);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Quitar like
const unlikeTweet = async (tweetId) => {
  try {
    const response = await likeService.unlikeTweet(tweetId);
    console.log("Like quitado:", response.data);
  } catch (error) {
    console.error("Error:", error.message);
  }
};
```

### 5. Servicio de Retweets (`retweetService`)

```javascript
import { retweetService } from "@/services";

// Hacer retweet
const doRetweet = async (tweetId) => {
  try {
    const response = await retweetService.retweet(tweetId);
    console.log("Retweet hecho:", response.data);
  } catch (error) {
    console.error("Error:", error.message);
  }
};
```

### 6. Servicio de Follows (`followService`)

```javascript
import { followService } from "@/services";

// Seguir usuario
const followUser = async (userId) => {
  try {
    const response = await followService.followUser(userId);
    console.log("Usuario seguido:", response.data);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Obtener seguidores
const getFollowers = async (userId) => {
  try {
    const response = await followService.getFollowers(userId);
    console.log("Seguidores:", response.data.followers);
  } catch (error) {
    console.error("Error:", error.message);
  }
};
```

### 7. Servicio de Archivos (`fileService`)

```javascript
import { fileService } from "@/services";

// Subir imagen
const uploadImage = async (file) => {
  try {
    const response = await fileService.uploadImage(file);
    console.log("Imagen subida:", response.data.imageUrl);
    return response.data.imageUrl;
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Ejemplo de uso en un componente
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const imageUrl = await uploadImage(file);
      // Usar la URL de la imagen...
    } catch (error) {
      // Manejar error...
    }
  }
};
```

## Características

### Interceptores automáticos

- **Token automático**: Se agrega automáticamente a todas las peticiones
- **Manejo de errores**: Respuestas 401 limpian el token automáticamente
- **Timeout**: 10 segundos por defecto
- **Base URL**: Configurada desde variables de entorno

### Manejo de errores

Todos los servicios lanzan errores con mensajes descriptivos que pueden ser capturados con try/catch.

### Tipos de respuesta

Las respuestas del backend siguen el formato:

```javascript
{
  success: boolean,
  message: string,
  data: any
}
```

## Importación

Puedes importar servicios individualmente o todos juntos:

```javascript
// Individual
import { authService } from "@/services";
import { tweetService } from "@/services";

// Todos juntos
import { authService, tweetService, userService } from "@/services";

// API base (si necesitas hacer peticiones personalizadas)
import { api } from "@/services";
```
