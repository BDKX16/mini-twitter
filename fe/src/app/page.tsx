"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timeline } from "@/components/Timeline";

// Avatares predefinidos
const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ruby",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bear",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy",
];

// Componente Modal para Avatares Predefinidos usando shadcn/ui
function AvatarModal({
  isOpen,
  onClose,
  onSelect,
  selectedAvatar,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatar: string) => void;
  selectedAvatar: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elige tu avatar</DialogTitle>
          <DialogDescription>
            Selecciona uno de nuestros avatares prediseñados
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 py-4">
          {PRESET_AVATARS.map((avatar, index) => (
            <button
              key={index}
              onClick={() => onSelect(avatar)}
              className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                selectedAvatar === avatar
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={avatar}
                alt={`Avatar ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {selectedAvatar === avatar && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <span className="text-primary-foreground text-lg font-bold">
                    ✓
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onClose} disabled={!selectedAvatar}>
            Seleccionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente Modal para Carga de Imagen Personalizada usando shadcn/ui
function CustomImageModal({
  isOpen,
  onClose,
  onSelect,
  selectedImage,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: string) => void;
  selectedImage: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setUrlInput(selectedImage);
    }
  }, [isOpen, selectedImage]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUrlInput(result);
        onSelect(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              setUrlInput(result);
              onSelect(result);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imagen personalizada</DialogTitle>
          <DialogDescription>
            Sube tu propia imagen desde URL, archivo o portapapeles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              URL de imagen
            </label>
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                onSelect(e.target.value);
              }}
              onPaste={handlePaste}
              placeholder="https://ejemplo.com/imagen.jpg o Ctrl+V para pegar"
            />
          </div>

          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <div className="text-4xl">📸</div>
              <div className="text-sm text-muted-foreground">
                <p>Arrastra una imagen aquí</p>
                <p>o</p>
                <Button
                  type="button"
                  variant="link"
                  onClick={handleFileSelect}
                  className="p-0 h-auto text-primary"
                >
                  selecciona un archivo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                También puedes pegar (Ctrl+V) una imagen
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Preview */}
          {urlInput && (
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border">
                <img
                  src={urlInput}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onClose} disabled={!urlInput}>
            Usar imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [currentStep, setCurrentStep] = useState(1); // 1: username, 2: profile image
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Estados para los modales
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCustomImageModal, setShowCustomImageModal] = useState(false);

  // API base URL
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Verificar si el usuario ya está autenticado al cargar la página
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        setUserProfile(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        // Si hay error parseando, limpiar localStorage
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  /**
   * Función para subir imagen personalizada al servidor
   */
  const uploadImage = async (imageData: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/profile-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData,
          filename: `profile-${Date.now()}.jpg`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error uploading image");
      }

      return result.data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  /**
   * Función para registrar usuario
   */
  const registerUser = async (userData: {
    username: string;
    profileImage?: string;
  }): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: userData.username,
          lastName: "", // Campo opcional
          username: userData.username,
          password: "default123", // Password temporal para demo
          profileImage: userData.profileImage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error registering user");
      }

      return result;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      console.log("Username:", username);
      // Iniciar transición al siguiente paso
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(2);
      }, 250); // Punto medio de la animación
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // Duración total de la animación
    }
  };

  const handleProfileImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalProfileImage = profileImage;

      // Si hay una imagen personalizada (base64), subirla primero
      if (profileImage && profileImage.startsWith("data:image/")) {
        console.log("Subiendo imagen personalizada...");
        finalProfileImage = await uploadImage(profileImage);
        console.log("Imagen subida exitosamente:", finalProfileImage);
      }

      // Registrar usuario con la imagen final
      console.log("Registrando usuario...");
      const result = await registerUser({
        username,
        profileImage: finalProfileImage || undefined,
      });

      console.log("Usuario registrado exitosamente:", result);

      // Guardar token en localStorage si está disponible
      if (result.data.token) {
        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        setUserProfile(result.data.user);
        setIsAuthenticated(true);

        // Disparar evento personalizado para que AppLayout se entere del cambio
        window.dispatchEvent(new Event("authChange"));
      }

      // No mostrar alert, simplemente transicionar al Timeline
      console.log(
        `¡Bienvenido @${username}! Tu cuenta ha sido creada exitosamente. ${
          finalProfileImage
            ? "Con imagen de perfil personalizada."
            : "Sin imagen de perfil."
        }`
      );
    } catch (error: any) {
      console.error("Error en el registro:", error);
      alert(`Error: ${error.message || "No se pudo completar el registro"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(1);
    }, 250); // Punto medio de la animación
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  const handleAvatarSelect = (avatar: string) => {
    setProfileImage(avatar);
    setShowAvatarModal(false);
  };

  const handleCustomImageSelect = (image: string) => {
    setProfileImage(image);
    setShowCustomImageModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUserProfile(null);
    setUsername("");
    setProfileImage("");
    setCurrentStep(1);

    // Disparar evento personalizado para que AppLayout se entere del cambio
    window.dispatchEvent(new Event("authChange"));
  };

  // Si el usuario está autenticado, mostrar el Timeline
  if (isAuthenticated && userProfile) {
    return (
      <>
        <Timeline />
        {/* Botón de logout temporal para testing */}
        <button
          onClick={handleLogout}
          className="fixed top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors z-50"
        >
          Cerrar sesión
        </button>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full">
        <div className="flex flex-row items-center justify-center mb-8 max-w-md mx-auto">
          <Image
            src="/twitter.svg"
            alt="Twitter Logo"
            width={172}
            height={172}
          />
          <p className="text-3xl font-bold text-gray-900 dark:text-white mx-4">
            +
          </p>
          <Image
            src="/uala.webp"
            alt="Ualá Logo"
            width={132}
            height={132}
            className="rounded-full"
          />
        </div>

        {/* Título */}
        <div className="text-center mb-8 max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {currentStep === 1
              ? "Bienvenido a MiniTwitter"
              : `¡Hola @${username}!`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {currentStep === 1
              ? "Ingresa tu nombre de usuario para comenzar"
              : "Agrega una imagen de perfil (opcional)"}
          </p>
        </div>

        {/* Formulario con animaciones */}
        <div className="relative min-h-[200px] max-w-md mx-auto">
          {/* Paso 1: Username */}
          <div
            className={`transition-all duration-500 absolute top-0 left-0 w-full ${
              currentStep === 1
                ? isTransitioning
                  ? "transform -translate-x-full opacity-0"
                  : "transform translate-x-0 opacity-100"
                : isTransitioning
                ? "transform translate-x-full opacity-0"
                : "transform translate-x-full opacity-0"
            }`}
            style={{
              position:
                currentStep === 1 && !isTransitioning ? "relative" : "absolute",
              transitionTimingFunction:
                "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
            }}
          >
            <form onSubmit={handleUsernameSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Nombre de usuario
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                    @
                  </span>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                    placeholder="tu_usuario"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!username.trim()}
              >
                Continuar
              </button>
            </form>
          </div>

          {/* Paso 2: Profile Image */}
          <div
            className={`transition-all duration-500 absolute top-0 left-0 w-full ${
              currentStep === 2
                ? isTransitioning
                  ? "transform translate-x-full opacity-0"
                  : "transform translate-x-0 opacity-100"
                : isTransitioning
                ? "transform -translate-x-full opacity-0"
                : "transform translate-x-full opacity-0"
            }`}
            style={{
              position:
                currentStep === 2 && !isTransitioning ? "relative" : "absolute",
              transitionTimingFunction:
                "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
            }}
          >
            <form onSubmit={handleProfileImageSubmit} className="space-y-6">
              {/* Preview de imagen seleccionada */}
              {profileImage && (
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 dark:border-blue-700">
                    <img
                      src={profileImage}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Opciones de selección - Círculos */}
              <div className="flex items-center justify-center space-x-4">
                {/* Opción: Subir foto */}
                <div className="flex flex-col items-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomImageModal(true)}
                    className="w-20 h-20 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700"
                  >
                    <span className="text-3xl">📷</span>
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
                    Elegir una foto
                  </span>
                </div>

                {/* Separador "o" */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-5">
                    o
                  </span>
                </div>

                {/* Opción: Avatar predefinido */}
                <div className="flex flex-col items-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="w-20 h-20 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700"
                  >
                    <span className="text-3xl">🧑</span>
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
                    Elegir avatar
                  </span>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {profileImage && profileImage.startsWith("data:image/")
                        ? "Subiendo..."
                        : "Registrando..."}
                    </>
                  ) : profileImage ? (
                    "Ingresar"
                  ) : (
                    "Omitir"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modales */}
        <AvatarModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSelect={handleAvatarSelect}
          selectedAvatar={profileImage}
        />

        <CustomImageModal
          isOpen={showCustomImageModal}
          onClose={() => setShowCustomImageModal(false)}
          onSelect={handleCustomImageSelect}
          selectedImage={profileImage}
        />
      </div>

      {/* Footer texto */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Challenge Uala - MiniTwitter Clone
        </p>
      </div>
    </div>
  );
}
