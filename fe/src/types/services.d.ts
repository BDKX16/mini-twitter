// Type declarations for JavaScript services

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface TweetData {
  content: string;
  images?: string[];
}

export interface Tweet {
  _id: string;
  content: string;
  images?: string[];
  author: {
    _id: string;
    username: string;
    name: string;
    profileImage?: string;
  };
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
  isLiked?: boolean;
  isRetweeted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TweetService {
  createTweet: (tweetData: TweetData) => Promise<ApiResponse<{ tweet: Tweet }>>;
  getTimeline: (
    page?: number,
    limit?: number
  ) => Promise<ApiResponse<{ tweets: Tweet[] }>>;
  getUserTweets: (
    userId: string,
    page?: number,
    limit?: number
  ) => Promise<ApiResponse<{ tweets: Tweet[] }>>;
  searchTweets: (
    query: string,
    page?: number,
    limit?: number
  ) => Promise<ApiResponse<{ tweets: Tweet[] }>>;
  likeTweet: (tweetId: string) => Promise<ApiResponse>;
  unlikeTweet: (tweetId: string) => Promise<ApiResponse>;
  retweetTweet: (tweetId: string) => Promise<ApiResponse>;
  unretweetTweet: (tweetId: string) => Promise<ApiResponse>;
  deleteTweet: (tweetId: string) => Promise<ApiResponse>;
}

export interface FileService {
  uploadImage: (file: File) => Promise<ApiResponse<{ url: string }>>;
  uploadMultipleImages: (
    files: File[]
  ) => Promise<ApiResponse<{ urls: string[] }>>;
}

export interface AuthService {
  login: (credentials: {
    email: string;
    password: string;
  }) => Promise<ApiResponse>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    name: string;
  }) => Promise<ApiResponse>;
  logout: () => Promise<ApiResponse>;
  getCurrentUser: () => Promise<ApiResponse>;
  updateProfile: (userData: any) => Promise<ApiResponse>;
}

export interface FollowService {
  followUser: (userId: string) => Promise<ApiResponse>;
  unfollowUser: (userId: string) => Promise<ApiResponse>;
  getFollowers: (
    userId: string,
    page?: number,
    limit?: number
  ) => Promise<ApiResponse>;
  getFollowing: (
    userId: string,
    page?: number,
    limit?: number
  ) => Promise<ApiResponse>;
  getFollowSuggestions: () => Promise<ApiResponse>;
}

export interface UserService {
  getUserProfile: (userId: string) => Promise<ApiResponse>;
  updateUserProfile: (userData: any) => Promise<ApiResponse>;
  searchUsers: (
    query: string,
    page?: number,
    limit?: number
  ) => Promise<ApiResponse>;
}

declare module "@/services/tweetService" {
  const tweetService: TweetService;
  export { tweetService };
}

declare module "@/services/fileService" {
  const fileService: FileService;
  export { fileService };
}

declare module "@/services/authService" {
  const authService: AuthService;
  export { authService };
}

declare module "@/services/followService" {
  const followService: FollowService;
  export { followService };
}

declare module "@/services/userService" {
  const userService: UserService;
  export { userService };
}
