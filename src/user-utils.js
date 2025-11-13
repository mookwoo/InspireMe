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
  let userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    // Generate new user ID: user_[timestamp]_[random]
    const timestamp = Date.now();
    // Generate a 13-character random string using Web Crypto API
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 13);
    userId = `user_${timestamp}_${random}`;
    localStorage.setItem(storageKey, userId);
    // Only log in development to protect user privacy
    if (import.meta.env && import.meta.env.DEV) {
      console.log('Created new user ID:', userId);
    }
  }
  
  return userId;
}
