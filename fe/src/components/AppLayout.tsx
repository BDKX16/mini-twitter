"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { authService } from "@/services";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si el usuario está autenticado usando el servicio
    setIsAuthenticated(authService.isAuthenticated());
    setIsLoading(false);
  }, []);

  // Función para escuchar cambios en la autenticación
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
    };

    // Escuchar cambios en localStorage
    window.addEventListener("storage", handleStorageChange);

    // También escuchar un evento personalizado para cambios internos
    const handleAuthChange = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
    };

    window.addEventListener("authChange", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, []);

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si NO está autenticado, mostrar contenido sin layout (página de login/registro)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Si SÍ está autenticado, mostrar el layout completo de Twitter
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto flex">
        <Sidebar />
        <main className="flex-1 border-x border-gray-200">{children}</main>
        <RightSidebar />
      </div>
    </div>
  );
}
