# Repository Interfaces

Esta carpeta contiene las **interfaces** que definen los contratos que deben implementar los repositorios en la carpeta `infrastructure/database/`.

## 📋 Estructura de Interfaces

### **Jerarquía de Interfaces**

```
IBaseRepository<T>
├── IUserRepository<T>
├── ITweetRepository<T>
├── IFollowRepository<T>
├── ILikeRepository<T>
└── IRetweetRepository<T>
```

## 🎯 Propósito

Las interfaces en esta carpeta:

1. **Definen contratos claros** para cada repositorio
2. **Garantizan consistencia** en las implementaciones
3. **Facilitan testing** con mocks e implementaciones alternativas
4. **Documentan operaciones** disponibles para cada dominio
5. **Permiten intercambio** de implementaciones (MongoDB, PostgreSQL, etc.)

## 📁 Archivos de Interfaces

### **Base Repository**

- **`IBaseRepository.ts`** - Interface base con operaciones CRUD genéricas

### **Domain Repositories**

- **`IUserRepository.ts`** - Operaciones específicas de usuarios
- **`ITweetRepository.ts`** - Operaciones específicas de tweets
- **`IFollowRepository.ts`** - Operaciones específicas de seguimiento
- **`ILikeRepository.ts`** - Operaciones específicas de likes
- **`IRetweetRepository.ts`** - Operaciones específicas de retweets

### **Index & Utilities**

- **`index.ts`** - Exporta todas las interfaces y utilidades
- **`README.md`** - Esta documentación

## 🔗 Relación con Infrastructure

### **Mapeo de Interfaces → Implementaciones**

| Interface               | Implementación                                 |
| ----------------------- | ---------------------------------------------- |
| `IBaseRepository<T>`    | `infrastructure/database/BaseRepository.ts`    |
| `IUserRepository<T>`    | `infrastructure/database/UserRepository.ts`    |
| `ITweetRepository<T>`   | `infrastructure/database/TweetRepository.ts`   |
| `IFollowRepository<T>`  | `infrastructure/database/FollowRepository.ts`  |
| `ILikeRepository<T>`    | `infrastructure/database/LikeRepository.ts`    |
| `IRetweetRepository<T>` | `infrastructure/database/RetweetRepository.ts` |

### **Ejemplo de Implementación**

```typescript
// Infrastructure implementation
export class UserRepository
  extends BaseRepository<IUserDocument>
  implements IUserRepository<IUserDocument>
{
  // Debe implementar todos los métodos de IUserRepository
  async findByUsername(username: string): Promise<IUserDocument | null> {
    // Implementation...
  }

  async getUserStats(userId: MongooseObjectId): Promise<any> {
    // Implementation...
  }

  // ... resto de métodos
}
```

## 📚 Métodos por Interface

### **IBaseRepository** (Operaciones CRUD Genéricas)

#### **Create Operations**

- `create(data)` - Crear documento
- `createMany(dataArray)` - Crear múltiples documentos

#### **Read Operations**

- `findById(id, options?)` - Buscar por ID
- `findOne(filter, options?)` - Buscar uno por filtro
- `find(filter, options?)` - Buscar múltiples por filtro
- `findAll(options?)` - Buscar todos
- `findWithPagination(filter, page, limit, options?)` - Buscar con paginación

#### **Update Operations**

- `updateById(id, update)` - Actualizar por ID
- `updateOne(filter, update)` - Actualizar uno por filtro
- `updateMany(filter, update)` - Actualizar múltiples por filtro

#### **Delete Operations**

- `deleteById(id)` - Eliminar por ID
- `deleteOne(filter)` - Eliminar uno por filtro
- `deleteMany(filter)` - Eliminar múltiples por filtro

#### **Utility Operations**

- `count(filter?)` - Contar documentos
- `exists(filter)` - Verificar existencia
- `aggregate(pipeline)` - Ejecutar agregación

### **IUserRepository** (Operaciones de Usuario)

#### **User-Specific Find**

- `findByUsername(username)` - Buscar por nombre de usuario
- `findConfirmedUsers(options?)` - Buscar usuarios confirmados
- `findRecentUsers(days?, options?)` - Buscar usuarios recientes
- `searchUsers(searchTerm, options?)` - Buscar usuarios por término

#### **User Validation**

- `checkUsernameAvailability(username)` - Verificar disponibilidad de username

#### **User Statistics**

- `getUserStats(userId?)` - Obtener estadísticas de usuario

#### **User Discovery**

- `getSuggestedUsers(userId, limit)` - Obtener usuarios sugeridos
- `getPopularUsers(limit)` - Obtener usuarios populares

### **ITweetRepository** (Operaciones de Tweet)

#### **Tweet-Specific Find**

- `findByAuthor(authorId, options?)` - Buscar por autor
- `findRecent(limit, options?)` - Buscar tweets recientes
- `findByMention(userId, options?)` - Buscar menciones
- `getHashtagTweets(hashtag, options?)` - Buscar por hashtag
- `findReplies(tweetId, options?)` - Buscar respuestas
- `findByThread(threadId, options?)` - Buscar por hilo

#### **Tweet Search**

- `searchByContent(searchTerm, options?)` - Buscar por contenido

#### **Tweet Timeline**

- `getTimelineForUser(userId, options?)` - Timeline personalizado
- `getPersonalTimeline(userId, options?)` - Timeline personal

#### **Tweet Statistics**

- `getTrending(hours, limit)` - Obtener tweets trending
- `getTweetStats(tweetId)` - Estadísticas de tweet
- `getHashtagTrends(hours, limit)` - Tendencias de hashtags

#### **Tweet Discovery**

- `getMostLikedTweets(limit, timeframe?)` - Tweets más gustados
- `getMostRetweetedTweets(limit, timeframe?)` - Tweets más retuiteados

### **IFollowRepository** (Operaciones de Seguimiento)

#### **Follow-Specific Find**

- `findFollowers(userId, options?)` - Buscar seguidores
- `findFollowing(userId, options?)` - Buscar seguidos
- `findByFollowerAndFollowing(followerId, followingId)` - Buscar relación específica

#### **Follow Validation**

- `isFollowing(followerId, followingId)` - Verificar si sigue

#### **Follow Statistics**

- `countFollowers(userId)` - Contar seguidores
- `countFollowing(userId)` - Contar seguidos
- `getFollowStats(userId)` - Estadísticas de seguimiento

#### **Follow Management**

- `toggleFollow(followerId, followingId)` - Alternar seguimiento

#### **Follow Discovery**

- `getMutualFollowers(userId1, userId2)` - Seguidores mutuos
- `getFollowSuggestions(userId, limit)` - Sugerencias de seguimiento
- `getSecondDegreeConnections(userId, limit)` - Conexiones de segundo grado

### **ILikeRepository** (Operaciones de Like)

#### **Like-Specific Find**

- `findByUser(userId, options?)` - Likes por usuario
- `findByTweet(tweetId, options?)` - Likes por tweet
- `findByUserAndTweet(userId, tweetId)` - Like específico

#### **Like Validation**

- `hasUserLikedTweet(userId, tweetId)` - Verificar like

#### **Like Statistics**

- `countByTweet(tweetId)` - Contar likes por tweet
- `countByUser(userId)` - Contar likes por usuario
- `getUserLikeStats(userId)` - Estadísticas de likes

#### **Like Management**

- `toggleLike(userId, tweetId)` - Alternar like
- `addLike(userId, tweetId)` - Agregar like
- `removeLike(userId, tweetId)` - Remover like

### **IRetweetRepository** (Operaciones de Retweet)

#### **Retweet-Specific Find**

- `findByUser(userId, options?)` - Retweets por usuario
- `findByTweet(tweetId, options?)` - Retweets por tweet
- `findQuoteRetweets(tweetId?, options?)` - Quote retweets
- `findSimpleRetweets(tweetId?, options?)` - Retweets simples

#### **Retweet Management**

- `toggleRetweet(userId, tweetId, comment?)` - Alternar retweet
- `addRetweet(userId, tweetId, comment?)` - Agregar retweet
- `removeRetweet(userId, tweetId)` - Remover retweet

## 🔧 Utilidades

### **BaseQueryOptions**

```typescript
interface BaseQueryOptions {
  populate?: string | string[] | any;
  select?: string | Record<string, number>;
  sort?: string | Record<string, number>;
  limit?: number;
  skip?: number;
  lean?: boolean;
}
```

### **PaginatedResult**

```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

## ✅ Checklist de Implementación

Use `REPOSITORY_METHODS_CHECKLIST` del archivo `index.ts` para verificar que todas las implementaciones incluyan los métodos requeridos.

### **Ejemplo de Verificación**

```typescript
import { REPOSITORY_METHODS_CHECKLIST } from "./repositories";

// Verificar que UserRepository implementa todos los métodos
const userMethods = REPOSITORY_METHODS_CHECKLIST.base.concat(
  REPOSITORY_METHODS_CHECKLIST.user
);

// userMethods = ['create', 'findById', ..., 'findByUsername', 'getUserStats', ...]
```

## 🏗️ Arquitectura

### **Patrón Repository**

```
Service Layer
     ↓
Repository Interface (Esta carpeta)
     ↓
Repository Implementation (infrastructure/database/)
     ↓
Database/ORM Layer (Mongoose)
```

### **Beneficios**

1. **Separación de responsabilidades**
2. **Testabilidad mejorada**
3. **Flexibilidad de implementación**
4. **Código más mantenible**
5. **Contratos bien definidos**

---

_Interfaces de Repository para Challenge Uala - Twitter Clone_
