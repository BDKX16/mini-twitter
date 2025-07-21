"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function ImageModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNavigate,
}: ImageModalProps) {
  // Manejar teclas de escape y flechas
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case "ArrowRight":
          if (currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Close Button - Esquina superior derecha de la pantalla */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-4 right-4 z-30 rounded-full p-2 text-white hover:bg-white/10"
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Modal Content */}
      <div className="relative z-10 h-full max-h-[90vh] flex items-center justify-center">
        {/* Navigation Buttons - Solo mostrar si hay múltiples imágenes */}
        {hasMultipleImages && currentIndex > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 z-20 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}

        {hasMultipleImages && currentIndex < images.length - 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 z-20 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}

        {/* Image */}
        <img
          src={currentImage}
          alt={`Imagen ${currentIndex + 1} de ${images.length}`}
          className="w-auto h-auto max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Image Counter - Solo mostrar si hay múltiples imágenes */}
        {hasMultipleImages && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} de {images.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
