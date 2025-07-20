'use client';

import { Heart, Repeat2, UserPlus, AtSign } from 'lucide-react';

const notifications = [
  {
    id: '1',
    type: 'like',
    user: {
      name: 'María García',
      username: 'mariadev',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    action: 'le gustó tu Tweet',
    content: 'Mi primer tweet desde esta increíble plataforma...',
    timestamp: '2h',
  },
  {
    id: '2',
    type: 'retweet',
    user: {
      name: 'Carlos Tech',
      username: 'carlostech',
      avatar: 'https://images.pexels.com/photos/927022/pexels-photo-927022.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    action: 'retuiteó tu Tweet',
    content: 'Trabajando en algunos proyectos emocionantes...',
    timestamp: '4h',
  },
  {
    id: '3',
    type: 'follow',
    user: {
      name: 'Ana Desarrolladora',
      username: 'anadev',
      avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    action: 'comenzó a seguirte',
    timestamp: '1d',
  },
  {
    id: '4',
    type: 'mention',
    user: {
      name: 'Juan Pérez',
      username: 'juanperez',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    action: 'te mencionó',
    content: '@tuusuario ¡Excelente trabajo en tu último proyecto!',
    timestamp: '2d',
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="w-8 h-8 text-red-500 fill-current" />;
    case 'retweet':
      return <Repeat2 className="w-8 h-8 text-green-500" />;
    case 'follow':
      return <UserPlus className="w-8 h-8 text-blue-500" />;
    case 'mention':
      return <AtSign className="w-8 h-8 text-blue-500" />;
    default:
      return null;
  }
};

export function Notifications() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">Notificaciones</h1>
      </div>

      <div>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="border-b border-gray-200 p-4 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <img
                    src={notification.user.avatar}
                    alt={notification.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span className="font-semibold">{notification.user.name}</span>{' '}
                      <span className="text-gray-600">{notification.action}</span>
                    </p>
                    {notification.content && (
                      <p className="text-gray-500 mt-1 text-sm">"{notification.content}"</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">{notification.timestamp}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 text-center text-gray-500">
        <p>Has visto todas las notificaciones</p>
      </div>
    </div>
  );
}