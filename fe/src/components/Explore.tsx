'use client';

import { useState } from 'react';
import { Search, TrendingUp, Hash, Users, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TweetCard } from '@/components/TweetCard';

const trendingTopics = [
  {
    id: '1',
    category: 'Tendencia en España',
    hashtag: '#NextJS',
    tweets: '125K',
    description: 'Framework de React para aplicaciones web'
  },
  {
    id: '2',
    category: 'Tendencia en Tecnología',
    hashtag: '#React',
    tweets: '89K',
    description: 'Biblioteca de JavaScript para interfaces de usuario'
  },
  {
    id: '3',
    category: 'Tendencia',
    hashtag: '#OpenAI',
    tweets: '234K',
    description: 'Inteligencia artificial y machine learning'
  },
  {
    id: '4',
    category: 'Tendencia en España',
    hashtag: '#JavaScript',
    tweets: '156K',
    description: 'Lenguaje de programación web'
  },
  {
    id: '5',
    category: 'Tendencia en Tecnología',
    hashtag: '#TypeScript',
    tweets: '67K',
    description: 'JavaScript con tipado estático'
  }
];

const suggestedUsers = [
  {
    id: '1',
    name: 'Midudev',
    username: 'midudev',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Desarrollador Full Stack y creador de contenido',
    followers: '234K',
    verified: true
  },
  {
    id: '2',
    name: 'Carlos Azaustre',
    username: 'carlosazaustre',
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'JavaScript Developer & Instructor',
    followers: '89K',
    verified: false
  },
  {
    id: '3',
    name: 'Brais Moure',
    username: 'mouredev',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'iOS Developer & YouTuber',
    followers: '156K',
    verified: true
  }
];

const exploreTweets = [
  {
    id: '1',
    user: {
      name: 'Tech News',
      username: 'technews',
      avatar: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '🚀 Las nuevas características de Next.js 14 están revolucionando el desarrollo web. App Router, Server Components y Turbopack están cambiando las reglas del juego.',
    timestamp: '1h',
    likes: 342,
    retweets: 89,
    replies: 45,
    image: 'https://images.pexels.com/photos/11035471/pexels-photo-11035471.jpeg?auto=compress&cs=tinysrgb&w=600'
  },
  {
    id: '2',
    user: {
      name: 'JavaScript Daily',
      username: 'jsdaily',
      avatar: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '💡 Tip del día: Usa async/await en lugar de .then() para un código más limpio y legible. Tu equipo te lo agradecerá.',
    timestamp: '3h',
    likes: 156,
    retweets: 34,
    replies: 12,
  },
  {
    id: '3',
    user: {
      name: 'Web Dev Tips',
      username: 'webdevtips',
      avatar: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '🎨 CSS Grid vs Flexbox: Usa Grid para layouts bidimensionales y Flexbox para layouts unidimensionales. Cada uno tiene su lugar perfecto.',
    timestamp: '5h',
    likes: 89,
    retweets: 23,
    replies: 8,
  }
];

export function Explore() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar en Twitter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-gray-100 border-none rounded-full focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      <Tabs defaultValue="trending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-gray-200 rounded-none">
          <TabsTrigger 
            value="trending" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Tendencias
          </TabsTrigger>
          <TabsTrigger 
            value="news" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Noticias
          </TabsTrigger>
          <TabsTrigger 
            value="people" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
          >
            Personas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="mt-0">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Tendencias para ti
            </h2>
            <div className="space-y-3">
              {trendingTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <p className="text-sm text-gray-500">{topic.category}</p>
                  <p className="font-bold text-lg">{topic.hashtag}</p>
                  <p className="text-sm text-gray-600">{topic.description}</p>
                  <p className="text-sm text-gray-500">{topic.tweets} Tweets</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="news" className="mt-0">
          <div>
            {exploreTweets.map((tweet) => (
              <TweetCard key={tweet.id} tweet={tweet} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="people" className="mt-0">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              A quién seguir
            </h2>
            <div className="space-y-4">
              {suggestedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="flex items-center space-x-1">
                        <h3 className="font-bold">{user.name}</h3>
                        {user.verified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-500">@{user.username}</p>
                      <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
                      <p className="text-sm text-gray-500">{user.followers} seguidores</p>
                    </div>
                  </div>
                  <button className="bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition-colors">
                    Seguir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}