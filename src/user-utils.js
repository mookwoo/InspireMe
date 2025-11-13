/**
 * User Utilities
 * Shared utilities for anonymous user management across the application
 */

/**
 * Generate or retrieve anonymous user ID
 * Creates a persistent user ID in localStorage if one doesn't exist
 * @returns {string} User ID in format: user_[timestamp]_[random]
 */
export function getUserId() {
  const storageKey = 'inspireme_user_id';
  
  try {
    let userId = localStorage.getItem(storageKey);
    
    if (!userId) {
      // Generate new user ID: user_[timestamp]_[random]
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      userId = `user_${timestamp}_${random}`;
      localStorage.setItem(storageKey, userId);
      // Only log in development to protect user privacy
      if (import.meta.env && import.meta.env.DEV) {
        console.log('Created new user ID:', userId);
      }
    }
    
    return userId;
  } catch (error) {
    console.warn('localStorage unavailable, generating temporary user ID:', error);
    // Fallback: generate a session-only ID
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
