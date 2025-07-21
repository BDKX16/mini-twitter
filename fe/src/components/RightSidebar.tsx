"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { userService } from "@/services/userService";
import { followService } from "@/services/followService";
import { trendsService } from "@/services/trendsService";
import { ApiResponse } from "@/types/services";

interface User {
  _id: string;
  username: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  followersCount?: number;
}

interface TrendingTopic {
  hashtag: string;
  count: number;
  category?: string;
}

export function RightSidebar() {
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      setLoading(true);

      // Cargar usuarios sugeridos
      await loadSuggestedUsers();

      // Cargar tendencias reales desde la API
      await loadTrendingTopics();
    } catch (error) {
      console.error("Error loading sidebar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingTopics = async () => {
    try {
      const response = (await trendsService.getTrendingHashtags({
        limit: 5,
      })) as unknown as ApiResponse<{ hashtags: TrendingTopic[] }>;

      if (response?.success && response?.data?.hashtags) {
        setTrendingTopics(response.data.hashtags);
      } else {
        // Fallback a datos mock si no hay datos de la API
        setTrendingTopics([
          { hashtag: "#NextJS", count: 125000, category: "Tecnología" },
          { hashtag: "#React", count: 89000, category: "Programación" },
          { hashtag: "#OpenAI", count: 234000, category: "IA" },
          { hashtag: "#JavaScript", count: 156000, category: "Programación" },
          { hashtag: "#TypeScript", count: 78000, category: "Programación" },
        ]);
      }
    } catch (error) {
      console.error("Error loading trending topics:", error);
      // Usar datos mock como fallback en caso de error
      setTrendingTopics([
        { hashtag: "#NextJS", count: 125000, category: "Tecnología" },
        { hashtag: "#React", count: 89000, category: "Programación" },
        { hashtag: "#OpenAI", count: 234000, category: "IA" },
        { hashtag: "#JavaScript", count: 156000, category: "Programación" },
        { hashtag: "#TypeScript", count: 78000, category: "Programación" },
      ]);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      // Obtener usuarios sugeridos
      const response = (await userService.getSuggestedUsers({
        limit: 5,
      })) as unknown as ApiResponse<{ users: User[] }>;

      if (response?.success && response?.data?.users) {
        setSuggestedUsers(response.data.users);
      } else {
        // Si no hay datos o falla, usar el endpoint de búsqueda como fallback
        const searchResponse = (await userService.searchUsers("", {
          limit: 5,
        })) as unknown as ApiResponse<{ users: User[] }>;
        if (searchResponse?.success && searchResponse?.data?.users) {
          setSuggestedUsers(searchResponse.data.users);
        }
      }
    } catch (error) {
      console.error("Error loading suggested users:", error);
      // Usar datos mock como fallback
      setSuggestedUsers([]);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      // Implementar lógica de seguir usuario
      await followService.followUser(userId);

      // Actualizar la UI removiendo el usuario de sugeridos
      setSuggestedUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const getDisplayName = (user: User) => {
    return (
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.username
    );
  };

  const getAvatarUrl = (user: User) => {
    return (
      user.profileImage ||
      "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400"
    );
  };

  if (loading) {
    return (
      <div className="w-80 p-4 hidden lg:block">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 p-4 hidden lg:block">
      {/* Sección de Tendencias */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <h3 className="text-xl font-bold mb-3">Tendencias para ti</h3>
        <div className="space-y-3">
          {trendingTopics.slice(0, 5).map((topic, index) => (
            <div
              key={`trending-${index}-${topic.hashtag}`}
              className="hover:bg-gray-100 p-2 rounded cursor-pointer transition-colors"
            >
              <p className="text-sm text-gray-500">
                {topic.category
                  ? `Tendencia en ${topic.category}`
                  : "Tendencia"}
              </p>
              <p className="font-semibold text-gray-900">{topic.hashtag}</p>
              <p className="text-sm text-gray-500">
                {formatNumber(topic.count)} Tweets
              </p>
            </div>
          ))}
          <button
            key="show-more-trending"
            className="text-blue-500 hover:underline text-sm font-medium"
          >
            Mostrar más
          </button>
        </div>
      </div>

      {/* Sección de Usuarios Sugeridos */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <h3 className="text-xl font-bold mb-3">A quien seguir</h3>
        <div className="space-y-3">
          {suggestedUsers.length > 0 ? (
            <>
              {suggestedUsers.slice(0, 3).map((user) => (
                <div
                  key={`user-${user._id}`}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={getAvatarUrl(user)}
                        alt={getDisplayName(user)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {getDisplayName(user)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          @{user.username}
                        </p>
                        {user.followersCount && (
                          <p className="text-xs text-gray-400">
                            {formatNumber(user.followersCount)} seguidores
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-black text-white hover:bg-gray-800 rounded-full px-4 py-1"
                      onClick={() => handleFollow(user._id)}
                    >
                      Seguir
                    </Button>
                  </div>
                </div>
              ))}
              <button
                key="show-more-users"
                className="text-blue-500 hover:underline text-sm font-medium"
              >
                Mostrar más
              </button>
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p className="text-sm">No hay sugerencias disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
