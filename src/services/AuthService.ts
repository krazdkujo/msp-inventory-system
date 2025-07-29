import Store from 'electron-store';
import { SecurityService } from './SecurityService';
import { configService } from './ConfigService';
import { User, LoginCredentials, LoginResponse } from '../types/auth';

interface StoredUser {
  id: number;
  username: string;
  email?: string;
  passwordHash: string;
  role: 'admin' | 'technician' | 'readonly';
  assignedClients?: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

interface Session {
  userId: number;
  username: string;
  role: 'admin' | 'technician' | 'readonly';
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

class AuthService {
  private userStore: any;
  private sessionStore: any;
  private rateLimiter: ReturnType<typeof SecurityService.createRateLimiter>;
  private currentSession: Session | null = null;

  constructor() {
    // Initialize user store with encryption
    this.userStore = new Store({
      name: 'msp-inventory-users',
      encryptionKey: configService['encryptionKey'],
      fileExtension: 'dat',
      defaults: {
        users: [],
        nextId: 1,
      },
    });

    // Initialize session store
    this.sessionStore = new Store({
      name: 'msp-inventory-sessions',
      encryptionKey: configService['encryptionKey'],
      fileExtension: 'dat',
      defaults: {
        sessions: [],
      },
    });

    this.rateLimiter = SecurityService.createRateLimiter();
    
    // Create default admin user if no users exist
    this.initializeDefaultUser();
    
    // Clean up expired sessions on startup
    this.cleanupExpiredSessions();
  }

  private async initializeDefaultUser(): Promise<void> {
    const users = this.userStore.get('users', []);
    
    if (users.length === 0) {
      console.log('Creating default admin user...');
      
      const defaultAdmin: StoredUser = {
        id: 1,
        username: 'admin',
        email: 'admin@msp-inventory.local',
        passwordHash: await SecurityService.hashPassword('admin123'),
        role: 'admin',
        createdAt: new Date(),
        isActive: true,
        failedLoginAttempts: 0,
      };
      
      this.userStore.set('users', [defaultAdmin]);
      this.userStore.set('nextId', 2);
    }
  }

  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { username, password } = credentials;
    
    // Input validation
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    // Rate limiting
    const clientId = `login_${username}`;
    if (!this.rateLimiter.isAllowed(clientId, 5, 15 * 60 * 1000)) {
      const remainingTime = Math.ceil(this.rateLimiter.getRemainingTime(clientId) / 1000 / 60);
      return { 
        success: false, 
        error: `Too many failed attempts. Try again in ${remainingTime} minutes.` 
      };
    }

    // Find user
    const users = this.userStore.get('users', []);
    const user = users.find((u: StoredUser) => u.username === username && u.isActive);
    
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      return { 
        success: false, 
        error: `Account is locked. Try again in ${remainingTime} minutes.` 
      };
    }

    // Verify password
    const isValidPassword = await SecurityService.verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      this.updateStoredUser(user);
      
      return { success: false, error: 'Invalid username or password' };
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLogin = new Date();
    this.updateUser(user);

    // Reset rate limiting for this user
    this.rateLimiter.reset(clientId);

    // Create session
    const session = this.createSession(user);
    this.currentSession = session;

    // Update last user preference
    configService.setLastUser(username);

    return {
      success: true,
      user: this.mapStoredUserToUser(user),
      token: session.sessionId,
    };
  }

  public async logout(): Promise<{ success: boolean }> {
    if (this.currentSession) {
      this.destroySession(this.currentSession.sessionId);
      this.currentSession = null;
    }
    
    return { success: true };
  }

  public getCurrentUser(): User | null {
    if (!this.currentSession || !this.isSessionValid(this.currentSession)) {
      return null;
    }
    
    const users = this.userStore.get('users', []);
    const user = users.find((u: StoredUser) => u.id === this.currentSession!.userId);
    
    return user ? this.mapStoredUserToUser(user) : null;
  }

  public async autoLoginAsAdmin(): Promise<LoginResponse> {
    // Check if already logged in
    if (this.getCurrentUser()) {
      return { 
        success: true, 
        user: this.getCurrentUser()!, 
        token: this.currentSession!.sessionId 
      };
    }

    // Auto-login as default admin
    console.log('Auto-logging in as default admin...');
    return await this.login({
      username: 'admin',
      password: 'admin123'
    });
  }

  public async createUser(userData: {
    username: string;
    email?: string;
    password: string;
    role: 'admin' | 'technician' | 'readonly';
    assignedClients?: string[];
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    // Validate current user permissions
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions to create users' };
    }

    // Validate input
    const { username, email, password, role, assignedClients } = userData;
    
    if (!SecurityService.validateUsername(username)) {
      return { success: false, error: 'Invalid username format' };
    }
    
    if (email && !SecurityService.validateEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }
    
    const passwordValidation = SecurityService.validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(', ') };
    }

    // Check if username already exists
    const users = this.userStore.get('users', []);
    if (users.some((u: StoredUser) => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }

    // Create new user
    const nextId = this.userStore.get('nextId', 1);
    const passwordHash = await SecurityService.hashPassword(password);
    
    const newUser: StoredUser = {
      id: nextId,
      username,
      email,
      passwordHash,
      role,
      assignedClients,
      createdAt: new Date(),
      isActive: true,
      failedLoginAttempts: 0,
    };

    users.push(newUser);
    this.userStore.set('users', users);
    this.userStore.set('nextId', nextId + 1);

    return {
      success: true,
      user: this.mapStoredUserToUser(newUser),
    };
  }

  public async updateUser(userData: Partial<StoredUser> & { id: number }): Promise<{ success: boolean; error?: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.id !== userData.id)) {
      return { success: false, error: 'Insufficient permissions to update user' };
    }

    const users = this.userStore.get('users', []);
    const userIndex = users.findIndex((u: StoredUser) => u.id === userData.id);
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found' };
    }

    // Update user data
    users[userIndex] = { ...users[userIndex], ...userData };
    this.userStore.set('users', users);

    return { success: true };
  }

  public getUsers(): User[] {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return [];
    }

    const users = this.userStore.get('users', []);
    return users
      .filter((u: StoredUser) => u.isActive)
      .map((u: StoredUser) => this.mapStoredUserToUser(u));
  }

  public async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.id !== userId)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const users = this.userStore.get('users', []);
    const user = users.find((u: StoredUser) => u.id === userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify old password (unless admin is changing another user's password)
    if (currentUser.id === userId) {
      const isValidOldPassword = await SecurityService.verifyPassword(oldPassword, user.passwordHash);
      if (!isValidOldPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }
    }

    // Validate new password
    const passwordValidation = SecurityService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(', ') };
    }

    // Update password
    user.passwordHash = await SecurityService.hashPassword(newPassword);
    this.updateUser(user);

    return { success: true };
  }

  public hasPermission(requiredRole: 'admin' | 'technician' | 'readonly'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const roleHierarchy = { admin: 3, technician: 2, readonly: 1 };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  public canAccessClient(clientId: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Admins can access all clients
    if (user.role === 'admin') return true;

    // Other roles can only access assigned clients
    return user.assignedClients?.includes(clientId) || false;
  }

  private createSession(user: StoredUser): Session {
    const sessionId = SecurityService.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours

    const session: Session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId,
      createdAt: now,
      expiresAt,
      lastActivity: now,
    };

    const sessions = this.sessionStore.get('sessions', []);
    sessions.push(session);
    this.sessionStore.set('sessions', sessions);

    return session;
  }

  private isSessionValid(session: Session): boolean {
    const now = new Date();
    return now < session.expiresAt && 
           (now.getTime() - session.lastActivity.getTime()) < (2 * 60 * 60 * 1000); // 2 hours inactivity
  }

  private destroySession(sessionId: string): void {
    const sessions = this.sessionStore.get('sessions', []);
    const filteredSessions = sessions.filter((s: Session) => s.sessionId !== sessionId);
    this.sessionStore.set('sessions', filteredSessions);
  }

  private cleanupExpiredSessions(): void {
    const sessions = this.sessionStore.get('sessions', []);
    const now = new Date();
    const validSessions = sessions.filter((s: Session) => now < s.expiresAt);
    this.sessionStore.set('sessions', validSessions);
  }

  private updateStoredUser(user: StoredUser): void {
    const users = this.userStore.get('users', []);
    const userIndex = users.findIndex((u: StoredUser) => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = user;
      this.userStore.set('users', users);
    }
  }

  private mapStoredUserToUser(storedUser: StoredUser): User {
    return {
      id: storedUser.id,
      username: storedUser.username,
      email: storedUser.email,
      role: storedUser.role,
      assignedClients: storedUser.assignedClients,
      createdAt: storedUser.createdAt,
      lastLogin: storedUser.lastLogin,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;