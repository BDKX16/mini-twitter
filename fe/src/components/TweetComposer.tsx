"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Smile, Calendar, MapPin, X } from "lucide-react";
import { tweetService } from "@/services/tweetService";
import { fileService } from "@/services/fileService";
import { userService } from "@/services/userService";
import { ApiResponse, Tweet } from "@/types/services";

interface User {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  profileImage?: string;
}

interface TweetComposerProps {
  onTweet?: (tweet: any) => void;
  onError?: (error: string) => void;
}

export function TweetComposer({ onTweet, onError }: TweetComposerProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [currentMentionSearch, setCurrentMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState<number>(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const maxLength = 280;

  // Cargar avatar del usuario desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserAvatar(user.avatar || user.profileImage || null);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
  }, []);

  // Cerrar sugerencias cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowUserSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Función para extraer hashtags del contenido
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.substring(1)) : []; // Remover el '#' del inicio
  };

  // Función para extraer menciones del contenido
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@[a-zA-Z0-9_]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map((mention) => mention.substring(1)) : []; // Remover el '@' del inicio
  };

  // Buscar usuarios para autocompletado
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSuggestions([]);
      return;
    }

    try {
      const response = await userService.searchUsers(query, { limit: 5 });
      if (response?.success && response?.data?.users) {
        setUserSuggestions(response.data.users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  // Manejar cambio de contenido y detectar menciones
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setContent(newContent);

    // Detectar si estamos escribiendo una mención
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Verificar que no hay espacios después del @
      if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
        setCurrentMentionSearch(textAfterAt);
        setMentionPosition(lastAtIndex);
        setShowUserSuggestions(true);
        setSelectedSuggestionIndex(0);

        // Buscar usuarios solo si hay al menos 1 carácter después del @
        if (textAfterAt.length > 0) {
          searchUsers(textAfterAt);
        } else {
          setUserSuggestions([]);
        }
      } else {
        setShowUserSuggestions(false);
      }
    } else {
      setShowUserSuggestions(false);
    }
  };

  // Seleccionar usuario de las sugerencias
  const selectUser = (user: User) => {
    const beforeMention = content.substring(0, mentionPosition);
    const afterMention = content.substring(
      mentionPosition + currentMentionSearch.length + 1
    );
    const newContent = beforeMention + `@${user.username} ` + afterMention;

    setContent(newContent);
    setShowUserSuggestions(false);
    setCurrentMentionSearch("");

    // Enfocar de nuevo el textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = mentionPosition + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);
  };

  // Manejar teclas en el textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showUserSuggestions && userSuggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < userSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : userSuggestions.length - 1
          );
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          selectUser(userSuggestions[selectedSuggestionIndex]);
          break;
        case "Escape":
          e.preventDefault();
          setShowUserSuggestions(false);
          break;
      }
    }
  };
  const handleSubmit = async () => {
    if (content.trim() && content.length <= maxLength && !isLoading) {
      setIsLoading(true);

      try {
        const hashtags = extractHashtags(content);
        const mentions = extractMentions(content);

        const tweetData = {
          content: content.trim(),
          ...(images.length > 0 && { images }),
          ...(hashtags.length > 0 && { hashtags }),
          ...(mentions.length > 0 && { mentions }),
        };

        const response = (await tweetService.createTweet(
          tweetData
        )) as unknown as ApiResponse<{ tweet: Tweet }>;
        if (response?.success) {
          setContent("");
          setImages([]);
          onTweet?.(response.data?.tweet);
        } else {
          throw new Error(response?.message || "Failed to create tweet");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create tweet";
        onError?.(errorMessage);
        console.error("Error creating tweet:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Limit to 4 images
    const remainingSlots = 4 - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(
            `Image "${file.name}" is too large. Maximum size is 5MB.`
          );
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          throw new Error(`"${file.name}" is not a valid image file.`);
        }

        const response = (await fileService.uploadImage(
          file
        )) as unknown as ApiResponse<{ url: string }>;
        console.log("Upload response:", response);

        // Manejar estructura de respuesta de Axios
        if (response?.success) {
          return response.data?.url;
        } else {
          throw new Error(
            `Failed to upload ${file.name}: ${
              response?.message || "Unknown error"
            }`
          );
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(
        (url): url is string => url !== undefined
      );
      setImages((prev) => [...prev, ...validUrls]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload images";
      onError?.(errorMessage);
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = content.trim().length === 0;
  const canAddImages = images.length < 4;

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex space-x-3">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt="Your avatar"
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
        )}
        <div className="flex-1 relative">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="¿Qué está pasando?"
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              className="border-none resize-none text-xl placeholder:text-gray-500 focus-visible:ring-0 p-0 bg-transparent relative z-10"
              rows={3}
              disabled={isLoading}
              style={{
                color: "transparent",
                caretColor: "#000",
                WebkitTextFillColor: "transparent",
              }}
            />

            {/* Texto resaltado superpuesto */}
            <div
              className="absolute top-0 left-0 w-full text-xl whitespace-pre-wrap break-words pointer-events-none z-0"
              style={{
                fontFamily: "inherit",
                fontSize: "1.25rem",
                lineHeight: "1.5",
                padding: "0px",
                minHeight: "4.5rem",
              }}
            >
              {content
                .split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g)
                .map((part, index) => {
                  if (part.startsWith("@")) {
                    return (
                      <span key={index} className="text-blue-500 font-medium">
                        {part}
                      </span>
                    );
                  } else if (part.startsWith("#")) {
                    return (
                      <span key={index} className="text-blue-500 font-medium">
                        {part}
                      </span>
                    );
                  }
                  return (
                    <span key={index} className="text-gray-900">
                      {part}
                    </span>
                  );
                })}
            </div>
          </div>

          {/* User suggestions dropdown */}
          {showUserSuggestions && userSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64"
            >
              {userSuggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${
                    index === selectedSuggestionIndex ? "bg-blue-50" : ""
                  }`}
                  onClick={() => selectUser(user)}
                >
                  <img
                    src={
                      user.avatar ||
                      user.profileImage ||
                      "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400"
                    }
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">
                      @{user.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-3">
              <div
                className={`grid gap-2 ${
                  images.length === 1
                    ? "grid-cols-1"
                    : images.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2"
                }`}
              >
                {images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full p-1 hover:bg-opacity-80 transition-opacity"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={triggerFileUpload}
                disabled={!canAddImages || isUploading || isLoading}
                className="p-2 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  className={`w-5 h-5 ${
                    isUploading ? "text-gray-400" : "text-blue-500"
                  }`}
                />
              </button>
              <button
                disabled={isLoading}
                className="p-2 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              >
                <Smile className="w-5 h-5 text-blue-500" />
              </button>
              <button
                disabled={isLoading}
                className="p-2 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              >
                <Calendar className="w-5 h-5 text-blue-500" />
              </button>
              <button
                disabled={isLoading}
                className="p-2 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              >
                <MapPin className="w-5 h-5 text-blue-500" />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {isUploading && (
                <span className="text-sm text-blue-500">
                  Subiendo imagen...
                </span>
              )}
              <span
                className={`text-sm ${
                  isOverLimit
                    ? "text-red-500"
                    : remainingChars <= 20
                    ? "text-yellow-500"
                    : "text-gray-500"
                }`}
              >
                {remainingChars < 0
                  ? remainingChars
                  : remainingChars <= 20
                  ? remainingChars
                  : ""}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={isEmpty || isOverLimit || isLoading || isUploading}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2 font-semibold disabled:opacity-50"
              >
                {isLoading ? "Publicando..." : "Twittear"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
