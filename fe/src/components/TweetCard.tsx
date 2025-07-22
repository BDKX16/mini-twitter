"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageModal } from "@/components/ImageModal";
import { likeService, retweetService, tweetService } from "@/services";

interface Tweet {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
  images?: string[]; // Changed from image?: string to images?: string[]
  isLiked?: boolean; // If current user has liked this tweet
  isRetweeted?: boolean; // If current user has retweeted this tweet
}

interface TweetCardProps {
  tweet: Tweet;
  onTweetDeleted?: (tweetId: string) => void; // Optional callback for when tweet is deleted
}

export function TweetCard({ tweet, onTweetDeleted }: TweetCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(tweet.isLiked || false);
  const [isRetweeted, setIsRetweeted] = useState(tweet.isRetweeted || false);
  const [likesCount, setLikesCount] = useState(tweet.likesCount);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweetsCount);
  const [repliesCount, setRepliesCount] = useState(tweet.repliesCount);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Clear error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Get current user (you might need to adjust this based on your auth system)
  useEffect(() => {
    const getCurrentUser = () => {
      const user = localStorage.getItem("userData");
      if (user) {
        const parsedUser = JSON.parse(user);

        // Try different possible username fields
        const username =
          parsedUser.username ||
          parsedUser.user?.username ||
          parsedUser.data?.username;
        if (username) {
          setCurrentUserId(username);
          return;
        }
      }
    };
    getCurrentUser();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLike = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);

      if (isLiked) {
        await likeService.unlikeTweet(tweet.id);
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await likeService.likeTweet(tweet.id);
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error handling like:", error);
      setErrorMessage("Failed to update like. Please try again.");
      // Revert state on error
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetweet = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (!isRetweeted) {
        await retweetService.retweet(tweet.id);
        setIsRetweeted(true);
        setRetweetsCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error handling retweet:", error);
      setErrorMessage("Failed to update retweet. Please try again.");
      // Revert state on error
      setIsRetweeted(!isRetweeted);
      setRetweetsCount((prev) => (isRetweeted ? prev + 1 : prev - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async () => {
    console.log("handleReply called - showComments:", showComments);
    // Toggle comments visibility
    if (!showComments) {
      console.log("Loading comments and showing section...");
      await loadComments();
      setShowComments(true); // Force show comments section even if no replies
      console.log("Comments section should now be visible");
    } else {
      console.log("Hiding comments section...");
      setShowComments(false);
    }

    // Always show reply input when clicking on comments
    setShowReplyInput(!showReplyInput);
    console.log("Reply input toggled to:", !showReplyInput);
  };

  const loadComments = async () => {
    if (isLoadingComments) return;

    try {
      setIsLoadingComments(true);
      console.log("Loading comments for tweet:", tweet.id);
      const response = await tweetService.getTweetReplies(tweet.id, {
        limit: 10,
        skip: 0,
      });

      console.log("Full response:", response);
      console.log("Response.data:", response.data);

      if (response.data) {
        // Try different possible response structures
        let replies = [];

        if (response.data.success && response.data.data?.replies) {
          replies = response.data.data.replies;
          console.log("Found replies in response.data.data.replies:", replies);
        } else if (response.data.data?.tweets) {
          replies = response.data.data.tweets;
          console.log("Found replies in response.data.data.tweets:", replies);
        } else if (response.data.replies) {
          replies = response.data.replies;
          console.log("Found replies in response.data.replies:", replies);
        } else if (response.data.tweets) {
          replies = response.data.tweets;
          console.log("Found replies in response.data.tweets:", replies);
        } else if (Array.isArray(response.data.data)) {
          replies = response.data.data;
          console.log("Found replies in response.data.data (array):", replies);
        } else if (Array.isArray(response.data)) {
          replies = response.data;
          console.log("Found replies in response.data (array):", replies);
        } else {
          console.log("No valid replies format found, using empty array");
        }

        console.log("Setting comments to:", replies);
        setComments(replies || []);
        console.log("Comments state should now be:", replies || []);
      } else {
        console.log("No response.data, setting empty array");
        setComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      setErrorMessage("Failed to load comments. Please try again.");
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || isLoading) return;

    try {
      setIsLoading(true);
      await tweetService.createReply(tweet.id, replyContent);
      setRepliesCount((prev) => prev + 1);
      setReplyContent("");

      // Reload comments to show the new reply if comments are visible
      if (showComments) {
        // Reset comments and reload to get fresh data including the new reply
        await loadComments();
      } else {
        // If comments aren't visible, hide the reply input
        setShowReplyInput(false);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      setErrorMessage("Failed to send reply. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

  const handleDeleteTweet = async () => {
    try {
      setIsLoading(true);
      await tweetService.deleteTweet(tweet.id);
      console.log(tweet.id);
      // Call the callback if provided, otherwise reload the page
      if (onTweetDeleted) {
        onTweetDeleted(tweet.id);
      } else {
        window.location.reload(); // Fallback - reload the page
      }
    } catch (error) {
      console.error("Error deleting tweet:", error);
      setErrorMessage("Failed to delete tweet. Please try again.");
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNavigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague el click al artículo
    router.push(`/profile/${tweet.user.username}`);
  };

  const handleNavigateToCommentProfile = (
    e: React.MouseEvent,
    username: string
  ) => {
    e.stopPropagation();
    router.push(`/profile/${username}`);
  };

  // Check if current user is the author of this tweet
  const isOwner = currentUserId && tweet.user.username === currentUserId;

  return (
    <article className="border-b border-gray-200 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
      {/* Error Message */}
      {errorMessage && (
        <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex space-x-3">
        <img
          src={tweet.user.avatar}
          alt={tweet.user.name}
          className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80"
          onClick={handleNavigateToProfile}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3
              className="font-bold text-gray-900 hover:underline cursor-pointer"
              onClick={handleNavigateToProfile}
            >
              {tweet.user.name}
            </h3>
            <span
              className="text-gray-500 hover:underline cursor-pointer"
              onClick={handleNavigateToProfile}
            >
              @{tweet.user.username}
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{tweet.timestamp}</span>
            {isOwner && (
              <div className="ml-auto relative" ref={dropdownRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2 h-auto hover:bg-gray-200"
                  onClick={toggleDropdown}
                  disabled={isLoading}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleDeleteTweet}
                      disabled={isLoading}
                      className="w-full flex items-center px-4 py-3 text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 mr-3" />
                      {isLoading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            )}
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
              onClick={handleReply}
              className={cn(
                "rounded-full p-2 h-auto group",
                showComments && "text-blue-500"
              )}
              disabled={isLoading || isLoadingComments}
            >
              <MessageCircle
                className={cn(
                  "w-5 h-5 group-hover:text-blue-500",
                  showComments && "text-blue-500",
                  isLoadingComments && "animate-pulse"
                )}
              />
              <span
                className={cn(
                  "ml-2 text-sm group-hover:text-blue-500",
                  showComments ? "text-blue-500" : "text-gray-500"
                )}
              >
                {repliesCount}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetweet}
              disabled={isLoading}
              className={cn(
                "rounded-full p-2 h-auto group",
                isRetweeted && "text-green-500"
              )}
            >
              <Repeat2
                className={cn(
                  "w-5 h-5 group-hover:text-green-500 transition-colors",
                  isRetweeted && "text-green-500",
                  isLoading && "animate-pulse"
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
              disabled={isLoading}
              className={cn(
                "rounded-full p-2 h-auto group",
                isLiked && "text-red-500"
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5 group-hover:text-red-500 transition-colors",
                  isLiked && "text-red-500 fill-current",
                  isLoading && "animate-pulse"
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

          {showComments && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                {isLoadingComments
                  ? "Loading comments..."
                  : `Comments (${comments.length})`}
              </h4>

              {isLoadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4 mb-4">
                  {comments.map((comment: any) => (
                    <div
                      key={comment.id || comment._id}
                      className="flex space-x-3"
                    >
                      <img
                        src={
                          comment.author?.profileImage ||
                          comment.user?.avatar ||
                          "/default-avatar.png"
                        }
                        alt={
                          comment.author?.username ||
                          comment.user?.username ||
                          "User"
                        }
                        className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80"
                        onClick={(e) =>
                          handleNavigateToCommentProfile(
                            e,
                            comment.author?.username ||
                              comment.user?.username ||
                              ""
                          )
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className="font-medium text-gray-900 cursor-pointer hover:underline"
                            onClick={(e) =>
                              handleNavigateToCommentProfile(
                                e,
                                comment.author?.username ||
                                  comment.user?.username ||
                                  ""
                              )
                            }
                          >
                            {comment.author?.firstName &&
                            comment.author?.lastName
                              ? `${comment.author.firstName} ${comment.author.lastName}`
                              : comment.user?.name || "Anonymous"}
                          </span>
                          <span
                            className="text-gray-500 text-sm cursor-pointer hover:underline"
                            onClick={(e) =>
                              handleNavigateToCommentProfile(
                                e,
                                comment.author?.username ||
                                  comment.user?.username ||
                                  ""
                              )
                            }
                          >
                            @
                            {comment.author?.username ||
                              comment.user?.username ||
                              "unknown"}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {comment.createdAt &&
                              new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-900 mt-1">{comment.content}</p>
                        <div className="flex items-center space-x-4 mt-2 text-gray-500 text-sm">
                          <span>{comment.likesCount || 0} likes</span>
                          <span>{comment.retweetsCount || 0} retweets</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-gray-500 text-center py-4">
                    No comments yet. Be the first to reply!
                  </p>
                </div>
              )}

              {/* Reply Input - Always show when comments are visible */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex space-x-3">
                  <img
                    src={tweet.user.avatar} // En el futuro, obtener del usuario autenticado
                    alt="Your avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Tweet your reply"
                      className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      maxLength={280}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">
                        {280 - replyContent.length} characters remaining
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowComments(false);
                            setShowReplyInput(false);
                            setReplyContent("");
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSendReply}
                          disabled={isLoading || !replyContent.trim()}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {isLoading ? "Replying..." : "Reply"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reply Input - Solo cuando showReplyInput está activo pero comments no están visibles */}
          {showReplyInput && !showComments && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex space-x-3">
                <img
                  src={(() => {
                    const user = localStorage.getItem("userData");
                    if (user) {
                      const parsedUser = JSON.parse(user);
                      return parsedUser.avatar || "";
                    }
                    return "/default-avatar.png";
                  })()}
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Tweet your reply"
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    maxLength={280}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">
                      {280 - replyContent.length} characters remaining
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReplyInput(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={isLoading || !replyContent.trim()}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {isLoading ? "Replying..." : "Reply"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
