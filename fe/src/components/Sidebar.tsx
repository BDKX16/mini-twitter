"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  User,
  Bell,
  Search,
  Mail,
  Bookmark,
  Hash,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authService } from "@/services";

const navigation = [
  { name: "Inicio", href: "/", icon: Home },
  //{ name: "Explorar", href: "/explore", icon: Search },
  //{ name: "Notificaciones", href: "/notifications", icon: Bell },
  //{ name: "Mensajes", href: "/messages", icon: Mail },
  //{ name: "Guardados", href: "/bookmarks", icon: Bookmark },
  //{ name: "Listas", href: "/lists", icon: Hash },
  { name: "Perfil", href: "/profile", icon: User },
  //{ name: "Más", href: "/more", icon: MoreHorizontal },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  // Cargar datos del usuario desde localStorage
  useEffect(() => {
    const userDataString = localStorage.getItem("userData");
    if (userDataString) {
      try {
        const user = JSON.parse(userDataString);
        setUserData(user);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
  };

  const handleUserClick = () => {
    if (userData?.username) {
      router.push(`/profile/${userData.username}`);
    } else {
      router.push("/profile");
    }
  };

  return (
    <div className="w-64 p-4 h-screen sticky top-0">
      <div className="mb-8">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">T</span>
        </div>
      </div>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-full transition-colors hover:bg-gray-100",
                  isActive && "font-bold"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-2")} />
                <span className="text-xl hidden lg:block">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <Button
        className="w-full mt-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full py-3 text-lg font-bold"
        onClick={() => {
          router.push("/");
          setTimeout(() => {
            const tweetInput = document.getElementById("tweet-input");
            if (tweetInput) {
              tweetInput.focus();
            }
          }, 100);
        }}
      >
        Twittear
      </Button>

      <div className="mt-auto pt-8">
        <div
          className="flex items-center space-x-3 p-3 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
          onClick={handleUserClick}
        >
          {userData?.avatar || userData?.profileImage ? (
            <img
              src={userData.avatar || userData.profileImage}
              alt="Your avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          )}
          <div className="hidden lg:block">
            <p className="font-semibold">
              {userData?.name || userData?.username || "Tu Usuario"}
            </p>
            <p className="text-gray-500">
              @{userData?.username || "tuusuario"}
            </p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full mt-4 pl-4 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-full py-2 text-sm font-normal flex items-center justify-start space-x-2"
        >
          <LogOut className="w-4 h-4 ml-4" />
          <span className="hidden lg:block">Cerrar sesión</span>
        </Button>
      </div>
    </div>
  );
}
