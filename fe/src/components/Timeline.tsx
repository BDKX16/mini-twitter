'use client';

import { useState } from 'react';
import { TweetComposer } from '@/components/TweetComposer';
import { TweetCard } from '@/components/TweetCard';

const mockTweets = [
  {
    id: '1',
    user: {
      name: 'Juan Pérez',
      username: 'juanperez',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: 'Acabo de terminar mi nuevo proyecto con Next.js 13. ¡Las nuevas características son increíbles! 🚀',
    timestamp: '2h',
    likes: 24,
    retweets: 8,
    replies: 3,
    image: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=600'
  },
  {
    id: '2',
    user: {
      name: 'María García',
      username: 'mariadev',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: '¿Alguien más está emocionado por las nuevas funciones de React 18? Los Suspense boundaries han cambiado mi forma de pensar sobre el loading state.',
    timestamp: '4h',
    likes: 156,
    retweets: 32,
    replies: 18,
  },
  {
    id: '3',
    user: {
      name: 'Carlos Tech',
      username: 'carlostech',
      avatar: 'https://images.pexels.com/photos/927022/pexels-photo-927022.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: 'Recordatorio diario: siempre haz commits pequeños y descriptivos. Tu yo del futuro te lo agradecerá 💭',
    timestamp: '6h',
    likes: 89,
    retweets: 21,
    replies: 9,
  },
  {
    id: '4',
    user: {
      name: 'Ana Desarrolladora',
      username: 'anadev',
      avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    content: 'Trabajando en mi portfolio personal. ¿Algún consejo sobre qué proyectos incluir para mostrar mis habilidades en frontend?',
    timestamp: '8h',
    likes: 67,
    retweets: 12,
    replies: 25,
  }
];

export function Timeline() {
  const [tweets, setTweets] = useState(mockTweets);

  const handleNewTweet = (content: string) => {
    const newTweet = {
      id: Date.now().toString(),
      user: {
        name: 'Tu Usuario',
        username: 'tuusuario',
        avatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400',
      },
      content,
      timestamp: 'ahora',
      likes: 0,
      retweets: 0,
      replies: 0,
    };
    setTweets([newTweet, ...tweets]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">Inicio</h1>
      </div>
      
      <TweetComposer onTweet={handleNewTweet} />
      
      <div className="border-b border-gray-200"></div>
      
      <div>
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
      </div>
    </div>
  );
}