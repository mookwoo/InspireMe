/**
 * Supabase Authentication Manager
 * Handles user authentication using Supabase Auth
 * Replaces the localStorage-based AuthManager
 */

import { supabase } from '../config/supabase-client.js';

class SupabaseAuthManager {
  constructor() {
    this.sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    this.currentUser = null;
    this.initializeAuth();
  }

  /**
   * Initialize authentication and set up auth state listeners
   */
  async initializeAuth() {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }

      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        this.currentUser = session?.user || null;
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        this.currentUser = session?.user || null;
        console.log('Auth state changed:', event, this.currentUser ? 'logged in' : 'logged out');
        
        // Update UI based on auth state
        this.updateUIForAuthState();
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  /**
   * Update UI elements based on authentication state
   */
  updateUIForAuthState() {
    const adminSection = document.getElementById('adminSection');
    if (adminSection) {
      adminSection.style.display = this.isAuthenticated() ? 'block' : 'none';
    }
  }

  /**
   * Sign up a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} metadata - Additional user metadata
   * @returns {Promise<Object>} Sign up result
   */
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data,
        message: 'Sign up successful! Please check your email to confirm your account.' 
      };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Sign in result
   */
  async signInWithEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }

      this.currentUser = data.user;
      return { success: true, data, message: 'Login successful!' };
    } catch (error) {
      console.error('Error in signInWithEmail:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in with OAuth provider (Google, GitHub, etc.)
   * @param {string} provider - OAuth provider name
   * @returns {Promise<Object>} Sign in result
   */
  async signInWithOAuth(provider) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error(`${provider} sign in error:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error(`Error in signInWithOAuth (${provider}):`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in anonymously (for demo/guest access)
   * @returns {Promise<Object>} Sign in result
   */
  async signInAnonymously() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('Anonymous sign in error:', error);
        return { success: false, error: error.message };
      }

      this.currentUser = data.user;
      return { success: true, data, message: 'Signed in anonymously' };
    } catch (error) {
      console.error('Error in signInAnonymously:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Legacy login method for backward compatibility
   * @param {string} username - Username (will be treated as email)
   * @param {string} password - Password
   * @returns {Promise<boolean>} True if login successful
   */
  async login(username, password) {
    // For backward compatibility, try to sign in with email/password
    const result = await this.signInWithEmail(username, password);
    return result.success;
  }

  /**
   * Sign out the current user
   * @returns {Promise<boolean>} True if logout successful
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        return false;
      }

      this.currentUser = null;
      return true;
    } catch (error) {
      console.error('Error in logout:', error);
      return false;
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean} True if user is logged in
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Get current user information
   * @returns {Object|null} Current user object or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current session information
   * @returns {Object|null} Session info or null if not authenticated
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error in getSession:', error);
      return null;
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Update result
   */
  async updateProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser(updates);

      if (error) {
        console.error('Profile update error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data,
        message: 'Password reset email sent! Check your inbox.' 
      };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data, message: 'Password updated successfully!' };
    } catch (error) {
      console.error('Error in updatePassword:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has admin role
   * @returns {boolean} True if user has admin privileges
   */
  isAdmin() {
    if (!this.currentUser) return false;
    
    // Check user metadata for admin role
    return this.currentUser.user_metadata?.role === 'admin' ||
           this.currentUser.app_metadata?.role === 'admin';
  }

  /**
   * Validate credentials (legacy method for backward compatibility)
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async validateCredentials(username, password) {
    const result = await this.signInWithEmail(username, password);
    if (result.success) {
      await this.logout(); // Don't actually log in for validation
    }
    return result.success;
  }
}

export default SupabaseAuthManager;