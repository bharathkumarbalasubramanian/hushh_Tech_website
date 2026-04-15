/**
 * User Repository Interface
 * Defines the contract for user data operations
 */
import { User } from '../entities';

export interface IUserRepository {
  /**
   * Get current authenticated user
   */
  getCurrent(): Promise<User | null>;

  /**
   * Get or create user (for first-time login)
   */
  getOrCreate(): Promise<User | null>;

  /**
   * Update user profile
   */
  updateProfile(userId: string, displayName?: string, avatarUrl?: string): Promise<User | null>;

  /**
   * Update last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Promise<boolean>;
}
