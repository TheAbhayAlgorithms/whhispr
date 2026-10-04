export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  statusMessage?: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface AuthSuccessPayload {
  user: User;
  accessToken: string;
  refreshToken?: string;
}
