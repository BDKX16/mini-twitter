"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TweetCard } from "@/components/TweetCard";
import { tweetService } from "@/services/tweetService";
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
  likes: number;
  retweets: number;
  replies: number;
  images?: string[];
}

export function Profile() {
  const [userData, setUserData] = useState<any>(null);
  const [userTweets, setUserTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar tweets del usuario
  useEffect(() => {
    const loadMyTweets = async () => {
      try {
        setLoading(true);
        const response = (await tweetService.getMyTimeline({
          limit: 50,
        })) as unknown as ApiResponse<{ timeline: ApiTweet[] }>;
        if (response?.success && response?.data?.timeline) {
          const tweets = response.data.timeline;

          // Formatear tweets para que coincidan con la interfaz esperada
          const formattedTweets: Tweet[] = tweets.map((tweet: ApiTweet) => ({
            id: tweet._id,
            content: tweet.content,
            timestamp: formatTimestamp(tweet.createdAt),
            likes: tweet.likes || 0,
            retweets: tweet.retweets || 0,
            replies: tweet.replies || 0,
            images: tweet.images || [],
            user: {
              name: tweet.author?.name || tweet.author?.username || "Usuario",
              username: tweet.author?.username || "usuario",
              avatar:
                tweet.author?.profileImage ||
                "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400",
            },
          }));

          setUserTweets(formattedTweets);
        } else {
          setUserTweets([]);
        }
      } catch (error) {
        console.error("Error loading my tweets:", error);
        setError("Error cargando tus tweets");
        setUserTweets([]);
      } finally {
        setLoading(false);
      }
    };

    const userDataString = localStorage.getItem("userData");
    const token = localStorage.getItem("token");

    if (userDataString) {
      try {
        const user = JSON.parse(userDataString);
        setUserData(user);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }

    // Solo cargar tweets si hay un token (usuario autenticado)
    if (token) {
      loadMyTweets();
    } else {
      setLoading(false);
      setUserTweets([]);
    }
  }, []);

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
  const displayName =
    userData?.name ||
    `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
    userData?.username ||
    "Tu Usuario";
  const username = userData?.username || "tuusuario";
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
          <Button className="rounded-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">
            Editar perfil
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-gray-500">@{username}</p>

          <p className="mt-3 text-gray-900">
            Desarrollador apasionado por la tecnología y la innovación. Amante
            del código limpio y las nuevas tecnologías.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-500">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Madrid, España</span>
            </div>
            <div className="flex items-center">
              <LinkIcon className="w-4 h-4 mr-1" />
              <a href="#" className="text-blue-500 hover:underline">
                miwebsite.com
              </a>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Se unió en enero de 2024</span>
            </div>
          </div>

          <div className="flex gap-6 mt-3">
            <div>
              <span className="font-bold">234</span>
              <span className="text-gray-500 ml-1">Siguiendo</span>
            </div>
            <div>
              <span className="font-bold">1,847</span>
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
              <p>Aún no has publicado ningún tweet</p>
              <p className="text-sm mt-2">
                ¡Comparte tus pensamientos con el mundo!
              </p>
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
