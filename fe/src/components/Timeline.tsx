"use client";

import { useState, useEffect } from "react";
import { TweetComposer } from "@/components/TweetComposer";
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
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
  isLiked?: boolean;
  isRetweeted?: boolean;
  images?: string[];
}

export function Timeline() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMoreTweets, setHasMoreTweets] = useState(true);

  // Cargar tweets iniciales
  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async (skip = 0, append = false) => {
    try {
      if (!append) setLoading(true);

      // Primero intentar con timeline personalizado, si falla usar público
      let response: ApiResponse<{ tweets: ApiTweet[] }>;
      const token = localStorage.getItem("token");

      if (token) {
        try {
          response = (await tweetService.getTimeline({
            limit: 20,
            skip,
          })) as unknown as ApiResponse<{ tweets: ApiTweet[] }>;
        } catch (authError) {
          // Si falla el timeline autenticado, usar el público
          console.log("Falling back to public timeline");
          response = (await tweetService.getPublicTimeline({
            limit: 20,
            skip,
          })) as unknown as ApiResponse<{ tweets: ApiTweet[] }>;
        }
      } else {
        // Sin token, usar timeline público
        response = (await tweetService.getPublicTimeline({
          limit: 20,
          skip,
        })) as unknown as ApiResponse<{ tweets: ApiTweet[] }>;
      }

      if (response?.success && response?.data?.tweets) {
        const newTweets = response.data.tweets;
        console.log(response);
        // Formatear tweets para que coincidan con la interfaz esperada
        const formattedTweets: Tweet[] = newTweets.map((tweet: ApiTweet) => ({
          id: tweet._id,
          content: tweet.content,
          timestamp: formatTimestamp(tweet.createdAt),
          likesCount: tweet.likesCount || 0,
          retweetsCount: tweet.retweetsCount || 0,
          repliesCount: tweet.repliesCount || 0,
          isLiked: tweet.isLiked || false,
          isRetweeted: tweet.isRetweeted || false,
          images: tweet.images || [],
          user: {
            name: tweet.author?.name || tweet.author?.username || "Usuario",
            username: tweet.author?.username || "usuario",
            avatar:
              tweet.author?.profileImage ||
              "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400",
          },
        }));

        if (append) {
          setTweets((prev) => [...prev, ...formattedTweets]);
        } else {
          setTweets(formattedTweets);
        }

        setHasMoreTweets(newTweets.length === 20); // Si devolvió menos de 20, no hay más
      } else {
        // Si la API falla, usar datos mock como fallback
        if (!append) {
          setTweets(mockTweets);
        }
      }
    } catch (error) {
      console.error("Error loading timeline:", error);
      // En caso de error, usar datos mock como fallback
      if (!append) {
        setTweets(mockTweets);
      }
      setError("Error cargando el timeline. Mostrando contenido de ejemplo.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

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

  // Datos mock como fallback
  const mockTweets = [
    {
      id: "1",
      user: {
        name: "Juan Pérez",
        username: "juanperez",
        avatar:
          "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400",
      },
      content:
        "Acabo de terminar mi nuevo proyecto con Next.js 13. ¡Las nuevas características son increíbles! �",
      timestamp: "2h",
      likes: 24,
      retweets: 8,
      replies: 3,
      images: [
        "https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
    },
    {
      id: "2",
      user: {
        name: "María García",
        username: "mariadev",
        avatar:
          "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400",
      },
      content:
        "¿Alguien más está emocionado por las nuevas funciones de React 18? Los Suspense boundaries han cambiado mi forma de pensar sobre el loading state.",
      timestamp: "4h",
      likes: 156,
      retweets: 32,
      replies: 18,
    },
  ];

  const handleNewTweet = (tweet: any) => {
    // Add the new tweet to the beginning of the timeline
    setTweets([tweet, ...tweets]);
    setError(null); // Clear any previous errors
  };

  const handleTweetError = (errorMessage: string) => {
    setError(errorMessage);
    // Optionally, clear the error after a few seconds
    setTimeout(() => setError(null), 5000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">Inicio</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mx-4 mt-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <TweetComposer onTweet={handleNewTweet} onError={handleTweetError} />

      <div className="border-b border-gray-200"></div>

      <div>
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
      </div>
    </div>
  );
}
