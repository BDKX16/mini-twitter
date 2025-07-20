'use client';

import { useState } from 'react';
import { Bookmark, Search, MoreHorizontal, Share, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TweetCard } from '@/components/TweetCard';

const bookmarkedTweets = [
  {
    id: '1',
    user: {
      name: 'Midudev',
      username: 'midudev',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '🚀 Nuevo tutorial: Cómo crear una aplicación full-stack con Next.js 14, TypeScript y Prisma. Incluye autenticación, base de datos y deployment. Link en bio 👇',
    timestamp: '2d',
    likes: 1247,
    retweets: 234,
    replies: 89,
    bookmarkedAt: '2024-01-15',
    image: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=600'
  },
  {
    id: '2',
    user: {
      name: 'Carlos Azaustre',
      username: 'carlosazaustre',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '💡 Tip de JavaScript: Usa el operador nullish coalescing (??) en lugar de || cuando quieras manejar solo null y undefined, no otros valores falsy como 0 o "".',
    timestamp: '5d',
    likes: 892,
    retweets: 156,
    replies: 34,
    bookmarkedAt: '2024-01-12'
  },
  {
    id: '3',
    user: {
      name: 'Brais Moure',
      username: 'mouredev',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '📱 Acabo de publicar mi roadmap completo para aprender desarrollo móvil en 2024. Incluye iOS, Android, Flutter y React Native. ¿Cuál prefieres?',
    timestamp: '1w',
    likes: 2156,
    retweets: 445,
    replies: 178,
    bookmarkedAt: '2024-01-08'
  },
  {
    id: '4',
    user: {
      name: 'Gentleman Programming',
      username: 'gentlemanprog',
      avatar: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '🎯 Los 5 patrones de diseño más importantes que todo desarrollador debería conocer:\n\n1. Singleton\n2. Factory\n3. Observer\n4. Strategy\n5. Decorator\n\n¿Cuál usas más?',
    timestamp: '1w',
    likes: 1534,
    retweets: 289,
    replies: 92,
    bookmarkedAt: '2024-01-06'
  }
];

export function Bookmarks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState(bookmarkedTweets);

  const filteredBookmarks = bookmarks.filter(tweet =>
    tweet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tweet.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tweet.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const removeBookmark = (tweetId: string) => {
    setBookmarks(bookmarks.filter(tweet => tweet.id !== tweetId));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center">
              <Bookmark className="w-6 h-6 mr-2" />
              Guardados
            </h1>
            <p className="text-sm text-gray-500">@tuusuario</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full p-2">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar en Guardados"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-gray-100 border-none rounded-full focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="p-8 text-center">
          {searchQuery ? (
            <div>
              <h2 className="text-2xl font-bold mb-2">No se encontraron resultados</h2>
              <p className="text-gray-500">
                Intenta buscar con otras palabras clave.
              </p>
            </div>
          ) : (
            <div>
              <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-2xl font-bold mb-2">Guarda Tweets para más tarde</h2>
              <p className="text-gray-500 max-w-sm mx-auto">
                No tienes ningún Tweet guardado aún. Cuando guardes Tweets, aparecerán aquí.
              </p>
            </div>
          )
        }
        </div>
      ) : (
        <div>
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              {filteredBookmarks.length} Tweet{filteredBookmarks.length !== 1 ? 's' : ''} guardado{filteredBookmarks.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {filteredBookmarks.map((tweet) => (
            <div key={tweet.id} className="relative group">
              <TweetCard tweet={tweet} />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2 bg-white shadow-md hover:bg-gray-50"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBookmark(tweet.id)}
                    className="rounded-full p-2 bg-white shadow-md hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 opacity-75">
                <div className="flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded-full shadow-sm">
                  <Bookmark className="w-3 h-3 mr-1 fill-current" />
                  Guardado el {new Date(tweet.bookmarkedAt).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}