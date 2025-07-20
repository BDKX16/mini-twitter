'use client';

import { useState } from 'react';
import { Search, MoreHorizontal, Phone, Video, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const conversations = [
  {
    id: '1',
    user: {
      name: 'María García',
      username: 'mariadev',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    lastMessage: '¡Hola! ¿Cómo va tu proyecto?',
    timestamp: '2h',
    unread: true,
    online: true
  },
  {
    id: '2',
    user: {
      name: 'Carlos Tech',
      username: 'carlostech',
      avatar: 'https://images.pexels.com/photos/927022/pexels-photo-927022.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    lastMessage: 'Perfecto, nos vemos mañana',
    timestamp: '1d',
    unread: false,
    online: false
  },
  {
    id: '3',
    user: {
      name: 'Ana Desarrolladora',
      username: 'anadev',
      avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    lastMessage: 'Gracias por la ayuda con React',
    timestamp: '3d',
    unread: false,
    online: true
  }
];

const messages = [
  {
    id: '1',
    senderId: '1',
    content: '¡Hola! ¿Cómo va tu proyecto?',
    timestamp: '14:30',
    isOwn: false
  },
  {
    id: '2',
    senderId: 'me',
    content: '¡Hola María! Va muy bien, gracias por preguntar. Estoy trabajando en la implementación de los componentes.',
    timestamp: '14:32',
    isOwn: true
  },
  {
    id: '3',
    senderId: '1',
    content: 'Genial, me alegra escuchar eso. Si necesitas ayuda con algo específico, no dudes en preguntarme.',
    timestamp: '14:33',
    isOwn: false
  },
  {
    id: '4',
    senderId: 'me',
    content: 'Perfecto, muchas gracias. Ahora mismo estoy con el sistema de autenticación.',
    timestamp: '14:35',
    isOwn: true
  }
];

export function Messages() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Aquí iría la lógica para enviar el mensaje
      setNewMessage('');
    }
  };

  return (
    <div className="flex h-screen">
      {/* Lista de conversaciones */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold mb-4">Mensajes</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar mensajes"
              className="pl-10 bg-gray-100 border-none rounded-full"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation.id === conversation.id ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={conversation.user.avatar}
                    alt={conversation.user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{conversation.user.name}</h3>
                    <span className="text-sm text-gray-500">{conversation.timestamp}</span>
                  </div>
                  <p className={`text-sm truncate ${conversation.unread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    {conversation.lastMessage}
                  </p>
                </div>
                {conversation.unread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat activo */}
      <div className="flex-1 flex flex-col">
        {/* Header del chat */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={selectedConversation.user.avatar}
              alt={selectedConversation.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="font-semibold">{selectedConversation.user.name}</h2>
              <p className="text-sm text-gray-500">@{selectedConversation.user.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Info className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.isOwn
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p>{message.content}</p>
                <p className={`text-xs mt-1 ${message.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input para nuevo mensaje */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 rounded-full border-gray-300"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}