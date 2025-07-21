"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageModal } from "@/components/ImageModal";

interface Tweet {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  images?: string[]; // Changed from image?: string to images?: string[]
}

interface TweetCardProps {
  tweet: Tweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleRetweet = () => {
    setIsRetweeted(!isRetweeted);
    setRetweetsCount((prev) => (isRetweeted ? prev - 1 : prev + 1));
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsImageModalOpen(false);
  };

  const handleNavigateImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <article className="border-b border-gray-200 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
      <div className="flex space-x-3">
        <img
          src={tweet.user.avatar}
          alt={tweet.user.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-gray-900 hover:underline cursor-pointer">
              {tweet.user.name}
            </h3>
            <span className="text-gray-500">@{tweet.user.username}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{tweet.timestamp}</span>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-2 h-auto"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mt-1">
            <p className="text-gray-900 whitespace-pre-wrap">{tweet.content}</p>
            {tweet.images && tweet.images.length > 0 && (
              <div className="mt-3">
                <div
                  className={`grid gap-2 ${
                    tweet.images.length === 1
                      ? "grid-cols-1"
                      : tweet.images.length === 2
                      ? "grid-cols-2"
                      : tweet.images.length === 3
                      ? "grid-cols-2"
                      : "grid-cols-2"
                  }`}
                >
                  {tweet.images.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-2xl cursor-pointer"
                      onClick={() => handleImageClick(index)}
                    >
                      <img
                        src={imageUrl}
                        alt={`Tweet image ${index + 1}`}
                        className={`w-full object-cover transition-transform duration-200 hover:scale-105 ${
                          tweet.images!.length === 1
                            ? "h-64"
                            : tweet.images!.length === 2
                            ? "h-48"
                            : "h-32"
                        }`}
                      />
                      {/* Overlay sutil para indicar que es clickeable */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 max-w-md">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-2 h-auto group"
            >
              <MessageCircle className="w-5 h-5 group-hover:text-blue-500" />
              <span className="ml-2 text-sm text-gray-500 group-hover:text-blue-500">
                {tweet.replies}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetweet}
              className={cn(
                "rounded-full p-2 h-auto group",
                isRetweeted && "text-green-500"
              )}
            >
              <Repeat2
                className={cn(
                  "w-5 h-5 group-hover:text-green-500",
                  isRetweeted && "text-green-500"
                )}
              />
              <span
                className={cn(
                  "ml-2 text-sm group-hover:text-green-500",
                  isRetweeted ? "text-green-500" : "text-gray-500"
                )}
              >
                {retweetsCount}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "rounded-full p-2 h-auto group",
                isLiked && "text-red-500"
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5 group-hover:text-red-500",
                  isLiked && "text-red-500 fill-current"
                )}
              />
              <span
                className={cn(
                  "ml-2 text-sm group-hover:text-red-500",
                  isLiked ? "text-red-500" : "text-gray-500"
                )}
              >
                {likesCount}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-2 h-auto group"
            >
              <Share className="w-5 h-5 group-hover:text-blue-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de imagen */}
      {tweet.images && tweet.images.length > 0 && (
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={handleCloseModal}
          images={tweet.images}
          currentIndex={currentImageIndex}
          onNavigate={handleNavigateImage}
        />
      )}
    </article>
  );
}
