import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export class SecurityService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_LENGTH = 32;

  // Password hashing
  public static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  // Token generation
  public static generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  public static generateSessionId(): string {
    return crypto.randomUUID();
  }

  // Data encryption/decryption
  public static encrypt(data: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(key, 'hex');
    
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  public static decrypt(encryptedData: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const keyBuffer = Buffer.from(key, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Input validation and sanitization
  public static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove potential XSS and injection attempts
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  public static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public static validateUsername(username: string): boolean {
    // Username should be 3-50 characters, alphanumeric plus underscore/hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return usernameRegex.test(username);
  }

  public static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '12345678', 'qwerty', 'abc123',
      'admin', 'admin123', 'root', 'user', 'guest'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and not secure');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Rate limiting helpers
  public static createRateLimiter() {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    
    return {
      isAllowed: (identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
        const now = Date.now();
        const record = attempts.get(identifier);
        
        if (!record || now > record.resetTime) {
          attempts.set(identifier, { count: 1, resetTime: now + windowMs });
          return true;
        }
        
        if (record.count >= maxAttempts) {
          return false;
        }
        
        record.count++;
        return true;
      },
      
      reset: (identifier: string): void => {
        attempts.delete(identifier);
      },
      
      getRemainingTime: (identifier: string): number => {
        const record = attempts.get(identifier);
        if (!record) return 0;
        
        const now = Date.now();
        return Math.max(0, record.resetTime - now);
      }
    };
  }

  // Secure random string generation
  public static generateSecureString(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      result += charset[randomIndex];
    }
    
    return result;
  }

  // Audit logging helpers
  public static createAuditEntry(action: string, userId: string, details: Record<string, any> = {}): {
    timestamp: Date;
    action: string;
    userId: string;
    details: Record<string, any>;
    sessionId: string;
  } {
    // Remove sensitive information from details
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.pat;
    
    return {
      timestamp: new Date(),
      action,
      userId,
      details: sanitizedDetails,
      sessionId: this.generateSessionId(),
    };
  }
}

export default SecurityService;