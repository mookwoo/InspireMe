/**
 * Authentication Manager for Admin Access
 * Handles login/logout and session management
 */
class AuthManager {
  constructor() {
    this.storageKey = 'inspireme_admin_session';
    this.sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    this.defaultCredentials = {
      username: 'admin',
      // generate a random fallback once, store in localStorage for transparency
      password: localStorage.getItem('inspireme_admin_default_pw') ||
                (() => { const p = crypto?.getRandomValues ? 
                  Array.from(crypto.getRandomValues(new Uint8Array(6)), b=>b.toString(16).padStart(2,'')).join('').slice(0,10) :
                  Math.random().toString(36).slice(2,12);
                  localStorage.setItem('inspireme_admin_default_pw', p);
                  return p;
                })()
    };
  }

  /**
   * Validate login credentials
   * @param {string} username 
   * @param {string} password 
   * @returns {boolean} True if credentials are valid
   */
  validateCredentials(username, password) {
    return username === this.defaultCredentials.username && 
           password === this.defaultCredentials.password;
  }

  /**
   * Perform login
   * @param {string} username 
   * @param {string} password 
   * @returns {boolean} True if login successful
   */
  login(username, password) {
    if (this.validateCredentials(username, password)) {
      const session = {
        loggedIn: true,
        timestamp: Date.now(),
        username: username
      };
      localStorage.setItem(this.storageKey, JSON.stringify(session));
      return true;
    }
    return false;
  }

  /**
   * Logout and clear session
   */
  logout() {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean} True if user is logged in and session is valid
   */
  isAuthenticated() {
    try {
      const sessionData = localStorage.getItem(this.storageKey);
      if (!sessionData) return false;

      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // Check if session has expired
      if (now - session.timestamp > this.sessionTimeout) {
        this.logout();
        return false;
      }

      return session.loggedIn === true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Get current session info
   * @returns {Object|null} Session info or null if not authenticated
   */
  getSession() {
    if (!this.isAuthenticated()) return null;
    
    try {
      const sessionData = localStorage.getItem(this.storageKey);
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
}

export default AuthManager;