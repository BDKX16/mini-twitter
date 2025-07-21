"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, Link as LinkIcon, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TweetCard } from "@/components/TweetCard";
import { tweetService } from "@/services/tweetService";
import { userService } from "@/services/userService";
import { followService } from "@/services/followService";
import { ApiResponse, Tweet as ApiTweet } from "@/types/services";

interface Tweet {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
  images?: string[];
}

interface ProfileProps {
  username?: string; // Si no se proporciona, muestra el perfil del usuario actual
}

export function Profile({ username }: ProfileProps) {
  const [userData, setUserData] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [userTweets, setUserTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Cargar tweets del usuario
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);

        // Obtener datos del usuario actual del localStorage
        const currentUserDataString = localStorage.getItem("userData");
        if (currentUserDataString) {
          const currentUser = JSON.parse(currentUserDataString);
          setCurrentUserData(currentUser?.username);
          console.log(currentUser);
          console.log(username);
          // Si no se especifica username, mostrar perfil del usuario actual
          if (!username) {
            setUserData(currentUser);
            setIsOwnProfile(true);
            await loadUserTweets(currentUser.id, true); // Pasar true porque es el perfil propio
            return;
          } else {
            // Verificar si es el propio perfil
            const ownProfile = currentUser.username === username;
            setIsOwnProfile(ownProfile);
          }
        }

        // Si se especifica un username, obtener datos del usuario
        if (username) {
          try {
            const userResponse = await userService.getUserByUsername(username);
            console.log("User response:", userResponse);

            // La respuesta viene como:  { data: { success: true, data: { user: {...} } } }
            if (userResponse?.success && userResponse?.data?.user) {
              const isOwn =
                JSON.parse(localStorage.getItem("userData")!)?.username ===
                username;
              setUserData(userResponse.data.user);
              await loadUserTweets(userResponse.data.user.id, isOwn);
            } else {
              setError("Usuario no encontrado");
              return;
            }
          } catch (err) {
            console.error("Error loading user data:", err);
            setError("Error cargando datos del usuario");
            return;
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setError("Error cargando el perfil");
      } finally {
        setLoading(false);
      }
    };

    const loadUserTweets = async (userId: string, isOwn?: boolean) => {
      try {
        let response;
        const shouldUseMyTimeline = isOwn !== undefined ? isOwn : isOwnProfile;
        if (shouldUseMyTimeline) {
          // Para el propio perfil, usar el timeline personal
          response = await tweetService.getMyTimeline({
            limit: 50,
          });
        } else {
          // Para otros usuarios, obtener sus tweets públicos
          response = await tweetService.getUserTweets(userId, {
            limit: 50,
            page: 1,
          });
        }

        // La respuesta viene como: { data: { success: true, data: { timeline/tweets: [...] } } }
        let tweets = [];
        let currentUser = null;
        if (response?.success && response?.data) {
          tweets = response.data.timeline || response.data.tweets || [];
        }
        if (shouldUseMyTimeline) {
          const user = localStorage.getItem("userData");
          if (user) {
            currentUser = JSON.parse(user);
          }
        }

        console.log(currentUser);
        // Formatear tweets para que coincidan con la interfaz esperada
        const formattedTweets: Tweet[] = tweets.map((tweet: any) => ({
          id: tweet._id,
          content: tweet.content,
          timestamp: formatTimestamp(tweet.createdAt),
          likesCount: tweet.likesCount || 0,
          retweetsCount: tweet.retweetsCount || 0,
          repliesCount: tweet.repliesCount || 0,
          images: tweet.images || [],
          user: {
            name: currentUser?.name || currentUser?.username || "Usuario",
            username: currentUser?.username || "usuario",
            avatar:
              currentUser?.avatar ||
              "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400",
          },
        }));

        setUserTweets(formattedTweets);
      } catch (error) {
        console.error("Error loading tweets:", error);
        setError("Error cargando tweets");
        setUserTweets([]);
      }
    };

    loadUserData();
  }, [username]);

  // Formatear timestamp relativo
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return "ahora";
  };

  // Función para seguir/dejar de seguir
  const handleFollowToggle = async () => {
    if (!userData || isOwnProfile || isFollowLoading) return;

    try {
      setIsFollowLoading(true);

      if (userData.isFollowing) {
        // Dejar de seguir
        const response = await followService.unfollowUser(userData.id);
        // Verificar éxito de la respuesta
        if (response.status === 200 || response.data?.success !== false) {
          setUserData((prev: any) => ({
            ...prev,
            isFollowing: false,
            followersCount: Math.max(0, (prev.followersCount || 0) - 1),
          }));
        }
      } else {
        // Seguir
        const response = await followService.followUser(userData.id);
        // Verificar éxito de la respuesta
        if (response.status === 200 || response.data?.success !== false) {
          setUserData((prev: any) => ({
            ...prev,
            isFollowing: true,
            followersCount: (prev.followersCount || 0) + 1,
          }));
        }
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
      setFollowError(
        userData.isFollowing ? "Error al dejar de seguir" : "Error al seguir"
      );
      // Limpiar error después de 3 segundos
      setTimeout(() => setFollowError(null), 3000);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const displayName =
    userData?.name ||
    `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
    userData?.username ||
    "Usuario";
  const userUsername = userData?.username || "usuario";
  const avatar =
    userData?.avatar ||
    userData?.profileImage ||
    "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div>
          <h1 className="text-xl font-bold">{displayName}</h1>
          <p className="text-sm text-gray-500">{userTweets.length} Tweets</p>
        </div>
      </div>

      {/* Mensaje de error para acciones de seguimiento */}
      {followError && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          <p className="text-sm">{followError}</p>
        </div>
      )}

      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500"></div>
        <div className="absolute -bottom-16 left-4">
          <img
            src={avatar}
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 border-white object-cover"
          />
        </div>
      </div>

      <div className="pt-20 px-4 pb-4">
        <div className="flex justify-end mb-4">
          {isOwnProfile ? (
            <Button className="rounded-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 px-6 py-2 font-medium">
              Editar perfil
            </Button>
          ) : userData?.isFollowing ? (
            <Button
              className="rounded-full border-2 border-blue-500 bg-white text-blue-500 hover:bg-red-500 hover:border-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-6 py-2 font-medium group min-w-[120px]"
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
            >
              <span className="flex items-center group-hover:hidden">
                <Check className="w-4 h-4 mr-2" />
                {isFollowLoading ? "Procesando..." : "Siguiendo"}
              </span>
              <span className="hidden group-hover:flex items-center">
                {isFollowLoading ? "Procesando..." : "Dejar de seguir"}
              </span>
            </Button>
          ) : (
            <Button
              className="rounded-full bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500 hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-6 py-2 font-medium min-w-[120px]"
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
            >
              <span className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                {isFollowLoading ? "Procesando..." : "Seguir"}
              </span>
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-gray-500">@{userUsername}</p>

          <p className="mt-3 text-gray-900">
            {userData?.bio ||
              "Desarrollador apasionado por la tecnología y la innovación. Amante del código limpio y las nuevas tecnologías."}
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-500">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{userData?.location || "Madrid, España"}</span>
            </div>
            <div className="flex items-center">
              <LinkIcon className="w-4 h-4 mr-1" />
              <a
                href={userData?.website || "#"}
                className="text-blue-500 hover:underline"
              >
                {userData?.website || "miwebsite.com"}
              </a>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>
                Se unió en{" "}
                {userData?.createdAt
                  ? new Date(userData.createdAt).toLocaleDateString()
                  : "enero de 2024"}
              </span>
            </div>
          </div>

          <div className="flex gap-6 mt-3">
            <div>
              <span className="font-bold">{userData?.followingCount || 0}</span>
              <span className="text-gray-500 ml-1">Siguiendo</span>
            </div>
            <div>
              <span className="font-bold">{userData?.followersCount || 0}</span>
              <span className="text-gray-500 ml-1">Seguidores</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tweets" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-transparent border-b border-gray-200 rounded-none">
          <TabsTrigger
            value="tweets"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Tweets
          </TabsTrigger>
          <TabsTrigger
            value="replies"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Respuestas
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Multimedia
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Me gusta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tweets" className="mt-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mx-4 mt-4">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <p>Cargando tus tweets...</p>
            </div>
          ) : userTweets.length > 0 ? (
            <div>
              {userTweets.map((tweet) => (
                <TweetCard key={tweet.id} tweet={tweet} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>
                {isOwnProfile
                  ? "Aún no has publicado ningún tweet"
                  : `${displayName} aún no ha publicado ningún tweet`}
              </p>
              {isOwnProfile && (
                <p className="text-sm mt-2">
                  ¡Comparte tus pensamientos con el mundo!
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          <div className="p-8 text-center text-gray-500">
            <p>Aún no tienes respuestas</p>
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-0">
          <div className="p-8 text-center text-gray-500">
            <p>Aún no tienes contenido multimedia</p>
          </div>
        </TabsContent>

        <TabsContent value="likes" className="mt-0">
          <div className="p-8 text-center text-gray-500">
            <p>Aún no has dado me gusta a ningún Tweet</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
