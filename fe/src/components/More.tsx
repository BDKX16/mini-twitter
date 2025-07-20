'use client';

import { useState } from 'react';
import { 
  Settings, 
  HelpCircle, 
  Shield, 
  Palette, 
  Bell, 
  Lock, 
  Eye, 
  Globe, 
  Smartphone, 
  Download, 
  BarChart3, 
  Zap, 
  Users, 
  CreditCard, 
  FileText, 
  MessageSquare, 
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const menuSections = [
  {
    title: 'Configuración y privacidad',
    items: [
      {
        icon: Settings,
        title: 'Configuración y privacidad',
        description: 'Gestiona tu cuenta y preferencias',
        href: '/settings'
      },
      {
        icon: Shield,
        title: 'Privacidad y seguridad',
        description: 'Controla quién puede ver tu contenido',
        href: '/privacy'
      },
      {
        icon: Bell,
        title: 'Notificaciones',
        description: 'Selecciona las notificaciones que recibes',
        href: '/notifications-settings'
      },
      {
        icon: Eye,
        title: 'Accesibilidad',
        description: 'Gestiona cómo experimentas Twitter',
        href: '/accessibility'
      }
    ]
  },
  {
    title: 'Herramientas y recursos',
    items: [
      {
        icon: BarChart3,
        title: 'Analytics',
        description: 'Ve cómo funcionan tus Tweets',
        href: '/analytics'
      },
      {
        icon: Zap,
        title: 'Twitter Ads',
        description: 'Promociona tus Tweets',
        href: '/ads'
      },
      {
        icon: Users,
        title: 'Twitter para profesionales',
        description: 'Herramientas para empresas',
        href: '/professional'
      },
      {
        icon: Smartphone,
        title: 'Aplicaciones móviles',
        description: 'Descarga nuestras apps',
        href: '/mobile'
      }
    ]
  },
  {
    title: 'Soporte',
    items: [
      {
        icon: HelpCircle,
        title: 'Centro de ayuda',
        description: 'Obtén respuestas a tus preguntas',
        href: '/help'
      },
      {
        icon: MessageSquare,
        title: 'Contactar soporte',
        description: 'Habla con nuestro equipo',
        href: '/support'
      },
      {
        icon: FileText,
        title: 'Términos y políticas',
        description: 'Lee nuestros términos de servicio',
        href: '/terms'
      }
    ]
  }
];

export function More() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [language, setLanguage] = useState('es');
  const [theme, setTheme] = useState('light');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">Más opciones</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Configuración rápida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuración rápida
            </CardTitle>
            <CardDescription>
              Ajusta las configuraciones más importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">Modo oscuro</Label>
                  <p className="text-sm text-gray-500">Cambia la apariencia de la interfaz</p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {notifications ? <Bell className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <div>
                  <Label htmlFor="notifications" className="font-medium">Notificaciones push</Label>
                  <p className="text-sm text-gray-500">Recibe alertas en tiempo real</p>
                </div>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {autoplay ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <div>
                  <Label htmlFor="autoplay" className="font-medium">Reproducción automática</Label>
                  <p className="text-sm text-gray-500">Videos y GIFs se reproducen solos</p>
                </div>
              </div>
              <Switch
                id="autoplay"
                checked={autoplay}
                onCheckedChange={setAutoplay}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {dataSync ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                <div>
                  <Label htmlFor="data-sync" className="font-medium">Sincronización de datos</Label>
                  <p className="text-sm text-gray-500">Sincroniza entre dispositivos</p>
                </div>
              </div>
              <Switch
                id="data-sync"
                checked={dataSync}
                onCheckedChange={setDataSync}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="font-medium">Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="font-medium">Tema de color</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Menú principal */}
        {menuSections.map((section, index) => (
          <div key={index}>
            <h2 className="text-lg font-semibold mb-3 text-gray-900">{section.title}</h2>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIndex}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6 text-gray-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Información de la cuenta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Tu cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Plan actual</p>
                <p className="text-sm text-gray-500">Gratuito</p>
              </div>
              <Button variant="outline" size="sm">
                Actualizar
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Almacenamiento usado</p>
                <p className="text-sm text-gray-500">2.3 GB de 15 GB</p>
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div className="w-4 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tweets este mes</p>
                <p className="text-sm text-gray-500">47 tweets</p>
              </div>
              <Button variant="ghost" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver estadísticas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Download className="w-6 h-6" />
                <span className="text-sm">Descargar datos</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Globe className="w-6 h-6" />
                <span className="text-sm">Compartir perfil</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Lock className="w-6 h-6" />
                <span className="text-sm">Privacidad</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Palette className="w-6 h-6" />
                <span className="text-sm">Personalizar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información de la app */}
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">Twitter Clone v1.0.0</p>
          <p className="text-xs mt-1">Hecho con ❤️ usando Next.js</p>
        </div>
      </div>
    </div>
  );
}