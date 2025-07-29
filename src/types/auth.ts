export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'technician' | 'readonly';
  assignedClients?: string[];
  createdAt?: Date;
  lastLogin?: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}