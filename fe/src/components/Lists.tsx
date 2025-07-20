'use client';

import { useState } from 'react';
import { List, Plus, Users, Lock, Globe, MoreHorizontal, UserPlus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const userLists = [
  {
    id: '1',
    name: 'Desarrolladores Frontend',
    description: 'Los mejores desarrolladores de frontend y sus consejos',
    members: 234,
    isPrivate: false,
    isOwner: true,
    coverImage: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=600',
    lastActivity: '2h'
  },
  {
    id: '2',
    name: 'Noticias Tech',
    description: 'Últimas noticias del mundo tecnológico',
    members: 1247,
    isPrivate: false,
    isOwner: true,
    coverImage: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
    lastActivity: '1d'
  },
  {
    id: '3',
    name: 'Proyectos Personales',
    description: 'Ideas y proyectos en los que estoy trabajando',
    members: 12,
    isPrivate: true,
    isOwner: true,
    coverImage: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600',
    lastActivity: '3d'
  }
];

const suggestedLists = [
  {
    id: '4',
    name: 'JavaScript Experts',
    description: 'Expertos en JavaScript y sus mejores prácticas',
    members: 892,
    owner: 'Midudev',
    ownerUsername: 'midudev',
    isPrivate: false
  },
  {
    id: '5',
    name: 'React Developers',
    description: 'Comunidad de desarrolladores React',
    members: 1534,
    owner: 'Carlos Azaustre',
    ownerUsername: 'carlosazaustre',
    isPrivate: false
  }
];

export function Lists() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListPrivate, setNewListPrivate] = useState(false);

  const handleCreateList = () => {
    if (newListName.trim()) {
      // Aquí iría la lógica para crear la lista
      setNewListName('');
      setNewListDescription('');
      setNewListPrivate(false);
      setIsCreateDialogOpen(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center">
            <List className="w-6 h-6 mr-2" />
            Listas
          </h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Nueva lista
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear una nueva lista</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="listName">Nombre</Label>
                  <Input
                    id="listName"
                    placeholder="Nombre de la lista"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    maxLength={25}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newListName.length}/25
                  </p>
                </div>
                <div>
                  <Label htmlFor="listDescription">Descripción</Label>
                  <Textarea
                    id="listDescription"
                    placeholder="Descripción de la lista"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newListDescription.length}/100
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="private"
                    checked={newListPrivate}
                    onCheckedChange={setNewListPrivate}
                  />
                  <Label htmlFor="private">Hacer privada</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Crear
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Tus listas</h2>
          <div className="space-y-3">
            {userLists.map((list) => (
              <div
                key={list.id}
                className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="relative h-24 bg-gradient-to-r from-blue-400 to-purple-500">
                  {list.coverImage && (
                    <img
                      src={list.coverImage}
                      alt={list.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    <Button variant="ghost" size="sm" className="rounded-full p-1 bg-black/20 hover:bg-black/30">
                      <MoreHorizontal className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-bold">{list.name}</h3>
                        {list.isPrivate ? (
                          <Lock className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{list.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {list.members} miembros
                        </span>
                        <span>Actualizada hace {list.lastActivity}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="rounded-full">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Listas sugeridas</h2>
          <div className="space-y-3">
            {suggestedLists.map((list) => (
              <div
                key={list.id}
                className="border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold">{list.name}</h3>
                      <Globe className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{list.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {list.members} miembros
                      </span>
                      <span>Por @{list.ownerUsername}</span>
                    </div>
                  </div>
                  <Button className="bg-black text-white rounded-full hover:bg-gray-800">
                    Seguir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-2xl text-center">
          <List className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold mb-2">¿No encuentras una lista?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Crea tu propia lista para organizar a las personas que sigues por temas, intereses o cualquier otra categoría.
          </p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
          >
            Crear nueva lista
          </Button>
        </div>
      </div>
    </div>
  );
}