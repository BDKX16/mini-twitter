import express from "express";
// Temporalmente usar require para middleware y controladores
const { applyProtection, monitoringMiddleware } = require("../middleware");
const { addRateLimitHeaders } = require("../middleware/rateLimitConfig");
const { UserController } = require("../controllers/UserController");
const { TweetController } = require("../controllers/TweetController");
const { LikeController } = require("../controllers/LikeController");
const { RetweetController } = require("../controllers/RetweetController");
const { FollowController } = require("../controllers/FollowController");
const { TimelineController } = require("../controllers/TimelineController");

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

// Usuarios autenticados - Protección estándar
router.get(
  "/users/me",
  applyProtection("authenticated"),
  userController.getCurrentUser.bind(userController)
);

router.put(
  "/users/me",
  applyProtection("authenticated"),
  userController.updateProfile.bind(userController)
);

router.post(
  "/users/me/password",
  applyProtection("authenticated"),
  userController.changePassword.bind(userController)
);

router.post(
  "/users/me/deactivate",
  applyProtection("authenticated"),
  userController.deactivateAccount.bind(userController)
);

router.get(
  "/users/me/suggestions",
  applyProtection("authenticated"),
  userController.getSuggestedUsers.bind(userController)
);

// Verificación de disponibilidad - Protección pública
router.get(
  "/users/check/username/:username",
  applyProtection("public"),
  userController.checkUsernameAvailability.bind(userController)
);

router.get(
  "/users/check/email/:email",
  applyProtection("public"),
  userController.checkEmailAvailability.bind(userController)
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

// Tweets autenticados - Protección con detección de spam
router.post(
  "/tweets",
  applyProtection("contentCreation"),
  tweetController.createTweet.bind(tweetController)
);

router.put(
  "/tweets/:tweetId",
  applyProtection("contentCreation"),
  tweetController.updateTweet.bind(tweetController)
);

router.delete(
  "/tweets/:tweetId",
  applyProtection("authenticated"),
  tweetController.deleteTweet.bind(tweetController)
);

router.post(
  "/tweets/:tweetId/reply",
  applyProtection("contentCreation"),
  tweetController.replyToTweet.bind(tweetController)
);

router.get(
  "/tweets/me/timeline",
  applyProtection("authenticated"),
  tweetController.getTimeline.bind(tweetController)
);

router.get(
  "/tweets/me/mentions",
  applyProtection("authenticated"),
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
  likeController.likeTweet.bind(likeController)
);

router.delete(
  "/tweets/:tweetId/like",
  applyProtection("socialAction"),
  likeController.unlikeTweet.bind(likeController)
);

router.post(
  "/tweets/:tweetId/like/toggle",
  applyProtection("socialAction"),
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
  retweetController.retweet.bind(retweetController)
);

router.post(
  "/tweets/:tweetId/quote",
  applyProtection("contentCreation"),
  retweetController.quoteRetweet.bind(retweetController)
);

// Follows - Protección para acciones sociales
router.post(
  "/users/:userId/follow",
  applyProtection("socialAction"),
  followController.followUser.bind(followController)
);

router.post(
  "/users/follow/bulk",
  applyProtection("bulkOperation"),
  followController.bulkFollow.bind(followController)
);

// Timeline - Protección estándar
router.get(
  "/timeline/home",
  applyProtection("authenticated"),
  timelineController.getHomeTimeline.bind(timelineController)
);

router.get(
  "/timeline/public",
  applyProtection("public"),
  timelineController.getPublicTimeline.bind(timelineController)
);

export default router;
