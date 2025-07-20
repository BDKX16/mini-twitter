'use client';

import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TweetCard } from '@/components/TweetCard';

const userTweets = [
  {
    id: '1',
    user: {
      name: 'Tu Usuario',
      username: 'tuusuario',
      avatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: 'Mi primer tweet desde esta increíble plataforma. ¡Emocionado por compartir mis pensamientos aquí! 🎉',
    timestamp: '1d',
    likes: 45,
    retweets: 12,
    replies: 8,
  },
  {
    id: '2',
    user: {
      name: 'Tu Usuario',
      username: 'tuusuario',
      avatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: 'Trabajando en algunos proyectos emocionantes. La tecnología nunca deja de sorprenderme con las posibilidades infinitas que ofrece.',
    timestamp: '3d',
    likes: 23,
    retweets: 5,
    replies: 3,
  }
];

export function Profile() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div>
          <h1 className="text-xl font-bold">Tu Usuario</h1>
          <p className="text-sm text-gray-500">147 Tweets</p>
        </div>
      </div>

      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-blue-400 to-purple-500"></div>
        <div className="absolute -bottom-16 left-4">
          <img
            src="https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400"
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
          <h1 className="text-2xl font-bold">Tu Usuario</h1>
          <p className="text-gray-500">@tuusuario</p>
          
          <p className="mt-3 text-gray-900">
            Desarrollador apasionado por la tecnología y la innovación. 
            Amante del código limpio y las nuevas tecnologías.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-500">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Madrid, España</span>
            </div>
            <div className="flex items-center">
              <LinkIcon className="w-4 h-4 mr-1" />
              <a href="#" className="text-blue-500 hover:underline">miwebsite.com</a>
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
          <div>
            {userTweets.map((tweet) => (
              <TweetCard key={tweet.id} tweet={tweet} />
            ))}
          </div>
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