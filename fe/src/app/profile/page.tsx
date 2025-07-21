"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Obtener usuario actual del localStorage y redirigir a su perfil
    const userDataString = localStorage.getItem("userData");
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        const username = userData.username;
        if (username) {
          router.replace(`/profile/${username}`);
          return;
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    // Si no hay usuario, redirigir al login o mostrar error
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-500">Redirigiendo a tu perfil...</p>
      </div>
    </div>
  );
}
