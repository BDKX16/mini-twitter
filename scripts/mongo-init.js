// Script de inicialización de MongoDB para Twitter
print("🚀 Initializing Twitter MongoDB database...");

// Cambiar a la base de datos de Twitter
db = db.getSiblingDB("twitter");

// Crear usuario para la aplicación
db.createUser({
  user: "twitterApp",
  pwd: "twitterPassword123",
  roles: [
    {
      role: "readWrite",
      db: "twitter",
    },
  ],
});

// Crear colección de usuarios con índices optimizados
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

// Crear colección de tweets con índices para performance
db.tweets.createIndex({ author: 1, createdAt: -1 });
db.tweets.createIndex({ createdAt: -1 });
db.tweets.createIndex({ author: 1, isDeleted: 1 });
db.tweets.createIndex({ mentions: 1, createdAt: -1 });

// Crear colección de follows (relaciones usuario-seguidor)
db.follows.createIndex({ follower: 1 });
db.follows.createIndex({ following: 1 });
db.follows.createIndex({ follower: 1, following: 1 }, { unique: true });
db.follows.createIndex({ createdAt: -1 });

// Crear colección de likes para optimizar consultas
db.likes.createIndex({ user: 1, tweet: 1 }, { unique: true });
db.likes.createIndex({ tweet: 1, createdAt: -1 });
db.likes.createIndex({ user: 1, createdAt: -1 });

// Crear colección de retweets
db.retweets.createIndex({ user: 1, tweet: 1 }, { unique: true });
db.retweets.createIndex({ tweet: 1, createdAt: -1 });
db.retweets.createIndex({ user: 1, createdAt: -1 });

// Insertar datos de prueba
print("📝 Inserting sample data...");

// Usuario de prueba
const sampleUser = {
  username: "testuser",
  email: "test@twitter.com",
  displayName: "Test User",
  bio: "Usuario de prueba para Twitter clone",
  avatar: null,
  following: [],
  followers: [],
  verified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

db.users.insertOne(sampleUser);

// Tweet de prueba
const sampleTweet = {
  content:
    "¡Hola mundo! Este es mi primer tweet en el clon de Twitter 🚀 #helloworld #twitter",
  author: sampleUser._id,
  mentions: [],
  likes: [],
  retweets: [],
  replies: [],
  media: [],
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

db.tweets.insertOne(sampleTweet);

print("✅ Twitter MongoDB database initialized successfully!");
print("📊 Collections created:");
print("   - users (with authentication indexes)");
print("   - tweets (with timeline and search indexes)");
print("   - follows (with relationship indexes)");
print("   - likes (with user-tweet indexes)");
print("   - retweets (with user-tweet indexes)");
print("🔐 Application user created: twitterApp");
print("🧪 Sample data inserted for testing");
