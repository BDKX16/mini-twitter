import express from "express";
// Importar middleware y controladores
const { applyProtection, monitoringMiddleware } = require("../middleware");
const { addRateLimitHeaders } = require("../middleware/rateLimitConfig");
import { checkAuth, optionalAuth } from "../middleware/authMiddleware";
const { UserController } = require("../controllers/UserController");
const { TweetController } = require("../controllers/TweetController");
const { LikeController } = require("../controllers/LikeController");
const { RetweetController } = require("../controllers/RetweetController");
const { FollowController } = require("../controllers/FollowController");
const { TimelineController } = require("../controllers/TimelineController");
import { FileUploadController } from "../controllers/FileUploadController";

const router = express.Router();

// Aplicar middleware de monitoreo y headers a todas las rutas
router.use(monitoringMiddleware);
router.use(addRateLimitHeaders);

// Instanciar controllers
const userController = new UserController();
const tweetController = new TweetController();
const likeController = new LikeController();
const retweetController = new RetweetController();
const followController = new FollowController();
const timelineController = new TimelineController();
const fileUploadController = new FileUploadController();

// =============================================
// RUTAS DE USUARIOS
// =============================================

// Autenticación - Protección estricta
router.post(
  "/auth/register",
  applyProtection("auth"),
  userController.register.bind(userController)
);

router.post(
  "/auth/login",
  applyProtection("auth"),
  userController.login.bind(userController)
);

router.post(
  "/auth/reactivate",
  applyProtection("auth"),
  userController.reactivateAccount.bind(userController)
);

// =============================================
// RUTAS DE ARCHIVOS
// =============================================

router.post(
  "/upload/profile-image",
  applyProtection("authenticated"),
  fileUploadController.uploadProfileImage.bind(fileUploadController)
);

// =============================================
// RUTAS DE USUARIOS
// =============================================

// Usuarios públicos - Protección básica
router.get(
  "/users/search",
  applyProtection("public"),
  userController.searchUsers.bind(userController)
);

router.get(
  "/users/:userId",
  applyProtection("public"),
  userController.getProfile.bind(userController)
);

router.get(
  "/users/:userId/stats",
  applyProtection("public"),
  userController.getUserStats.bind(userController)
);

// Usuarios autenticados - Protección estándar + JWT requerido
router.get(
  "/users/me",
  applyProtection("authenticated"),
  checkAuth,
  userController.getCurrentUser.bind(userController)
);

router.put(
  "/users/me",
  applyProtection("authenticated"),
  checkAuth,
  userController.updateProfile.bind(userController)
);

router.post(
  "/users/me/password",
  applyProtection("authenticated"),
  checkAuth,
  userController.changePassword.bind(userController)
);

router.post(
  "/users/me/deactivate",
  applyProtection("authenticated"),
  checkAuth,
  userController.deactivateAccount.bind(userController)
);

router.get(
  "/users/me/suggestions",
  applyProtection("authenticated"),
  checkAuth,
  userController.getSuggestedUsers.bind(userController)
);

// Verificación de disponibilidad - Protección pública
router.get(
  "/users/check/username/:username",
  applyProtection("public"),
  userController.checkUsernameAvailability.bind(userController)
);

// =============================================
// RUTAS DE TWEETS
// =============================================

// Tweets públicos - Protección básica
router.get(
  "/tweets",
  applyProtection("public"),
  tweetController.getAllTweets.bind(tweetController)
);

router.get(
  "/tweets/search",
  applyProtection("public"),
  tweetController.searchTweets.bind(tweetController)
);

router.get(
  "/tweets/trending",
  applyProtection("public"),
  tweetController.getTrendingTweets.bind(tweetController)
);

router.get(
  "/tweets/:tweetId",
  applyProtection("public"),
  tweetController.getTweetById.bind(tweetController)
);

router.get(
  "/tweets/:tweetId/stats",
  applyProtection("public"),
  tweetController.getTweetStats.bind(tweetController)
);

router.get(
  "/tweets/:tweetId/replies",
  applyProtection("public"),
  tweetController.getTweetReplies.bind(tweetController)
);

router.get(
  "/users/:userId/tweets",
  applyProtection("public"),
  tweetController.getUserTweets.bind(tweetController)
);

router.get(
  "/hashtags/:hashtag/tweets",
  applyProtection("public"),
  tweetController.getHashtagTweets.bind(tweetController)
);

// Tweets autenticados - Rate limiting + JWT requerido
router.post(
  "/tweets",
  applyProtection("contentCreation"),
  checkAuth,
  tweetController.createTweet.bind(tweetController)
);

router.put(
  "/tweets/:tweetId",
  applyProtection("contentCreation"),
  checkAuth,
  tweetController.updateTweet.bind(tweetController)
);

router.delete(
  "/tweets/:tweetId",
  applyProtection("authenticated"),
  checkAuth,
  tweetController.deleteTweet.bind(tweetController)
);

router.post(
  "/tweets/:tweetId/reply",
  applyProtection("contentCreation"),
  checkAuth,
  tweetController.replyToTweet.bind(tweetController)
);

router.get(
  "/tweets/me/timeline",
  applyProtection("authenticated"),
  checkAuth, // JWT requerido
  tweetController.getTimeline.bind(tweetController)
);

router.get(
  "/tweets/me/mentions",
  applyProtection("authenticated"),
  checkAuth, // JWT requerido
  tweetController.getMentions.bind(tweetController)
);

// =============================================
// RUTAS DE LIKES
// =============================================

// Likes - Protección para acciones sociales
router.get(
  "/tweets/:tweetId/likes",
  applyProtection("public"),
  likeController.getTweetLikes.bind(likeController)
);

router.post(
  "/tweets/:tweetId/like",
  applyProtection("socialAction"),
  checkAuth,
  likeController.likeTweet.bind(likeController)
);

router.delete(
  "/tweets/:tweetId/like",
  applyProtection("socialAction"),
  checkAuth,
  likeController.unlikeTweet.bind(likeController)
);

router.post(
  "/tweets/:tweetId/like/toggle",
  applyProtection("socialAction"),
  checkAuth,
  likeController.toggleLike.bind(likeController)
);

// Retweets - Protección para acciones sociales
router.get(
  "/tweets/:tweetId/retweets",
  applyProtection("public"),
  retweetController.getTweetRetweets.bind(retweetController)
);

router.post(
  "/tweets/:tweetId/retweet",
  applyProtection("socialAction"),
  checkAuth,
  retweetController.retweet.bind(retweetController)
);

router.post(
  "/tweets/:tweetId/quote",
  applyProtection("contentCreation"),
  checkAuth,
  retweetController.quoteRetweet.bind(retweetController)
);

// Follows - Protección para acciones sociales
router.post(
  "/users/:userId/follow",
  applyProtection("socialAction"),
  checkAuth,
  followController.followUser.bind(followController)
);

router.post(
  "/users/follow/bulk",
  applyProtection("bulkOperation"),
  checkAuth,
  followController.bulkFollow.bind(followController)
);

// Timeline - Autenticación opcional para contenido personalizado
router.get(
  "/timeline/home",
  applyProtection("authenticated"),
  checkAuth,
  timelineController.getHomeTimeline.bind(timelineController)
);

router.get(
  "/timeline/public",
  applyProtection("public"),
  optionalAuth, // JWT opcional para personalizar si está logueado
  timelineController.getPublicTimeline.bind(timelineController)
);

export default router;
