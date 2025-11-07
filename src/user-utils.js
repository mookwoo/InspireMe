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
    const random = Math.random().toString(36).substring(2, 15);
    userId = `user_${timestamp}_${random}`;
    localStorage.setItem(storageKey, userId);
    console.log('Created new user ID:', userId);
  }
  
  return userId;
}
