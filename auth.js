/**
 * Simple Authentication System for InspireMe Admin Panel
 * Uses sessionStorage for authentication state (expires when browser closes)
 */
class AuthSystem {
  constructor() {
    this.storageKey = 'inspireme_admin_auth';
    this.defaultCredentials = {
      username: 'admin',
      password: 'admin'
    };
    this.setupEventListeners();
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    const authData = sessionStorage.getItem(this.storageKey);
    if (!authData) return false;
    
    try {
      const data = JSON.parse(authData);
      // Check if authentication is still valid (within session)
      return data.authenticated === true && data.timestamp;
    } catch (error) {
      return false;
    }
  }

  /**
   * Authenticate user with username and password
   * @param {string} username 
   * @param {string} password 
   * @returns {boolean} True if authentication successful
   */
  authenticate(username, password) {
    // Simple authentication against default credentials
    if (username === this.defaultCredentials.username && 
        password === this.defaultCredentials.password) {
      
      // Store authentication state in session storage
      const authData = {
        authenticated: true,
        username: username,
        timestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem(this.storageKey, JSON.stringify(authData));
      return true;
    }
    
    return false;
  }

  /**
   * Log out the current user
   */
  logout() {
    sessionStorage.removeItem(this.storageKey);
    
    // Hide admin panel if it's open
    const adminSection = document.getElementById('adminSection');
    if (adminSection) {
      adminSection.style.display = 'none';
    }
    
    this.showMessage('Logged out successfully', 'info');
  }

  /**
   * Show login modal
   */
  showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.style.display = 'flex';
      
      // Focus on username field
      const usernameField = document.getElementById('username');
      if (usernameField) {
        setTimeout(() => usernameField.focus(), 100);
      }
    }
  }

  /**
   * Hide login modal
   */
  hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.style.display = 'none';
      
      // Clear form
      const form = document.getElementById('loginForm');
      if (form) {
        form.reset();
      }
      
      // Hide error message
      const errorDiv = document.getElementById('loginError');
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }
  }

  /**
   * Show error message in login form
   * @param {string} message 
   */
  showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Show temporary message (reuse admin message system if available)
   * @param {string} message 
   * @param {string} type 
   */
  showMessage(message, type = 'info') {
    // Create a simple message display
    const existingMessage = document.querySelector('.auth-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message auth-message-${type}`;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 80px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      font-size: 1.4rem;
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 3000);
  }

  /**
   * Handle admin toggle - show login if not authenticated, otherwise toggle admin panel
   */
  handleAdminToggle() {
    if (!this.isAuthenticated()) {
      this.showLoginModal();
      return false; // Prevent admin panel from showing
    }
    
    return true; // Allow admin panel to show
  }

  /**
   * Setup event listeners for login functionality
   */
  setupEventListeners() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    } else {
      this.bindEvents();
    }
  }

  /**
   * Bind events to DOM elements
   */
  bindEvents() {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Close modal buttons
    const closeModalBtn = document.getElementById('closeLoginModal');
    const cancelBtn = document.getElementById('cancelLogin');
    
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideLoginModal());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideLoginModal());
    }

    // Close modal when clicking outside
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideLoginModal();
        }
      });
    }

    // Add logout button to admin panel if authenticated
    this.addLogoutButton();
  }

  /**
   * Handle login form submission
   */
  handleLogin() {
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!username || !password) {
      this.showLoginError('Please enter both username and password');
      return;
    }

    if (this.authenticate(username, password)) {
      this.hideLoginModal();
      this.showMessage('Login successful!', 'success');
      
      // Show admin panel
      const adminSection = document.getElementById('adminSection');
      if (adminSection) {
        adminSection.style.display = 'block';
      }
      
      // Update logout button visibility
      this.addLogoutButton();
    } else {
      this.showLoginError('Invalid username or password');
      
      // Clear password field
      const passwordField = document.getElementById('password');
      if (passwordField) {
        passwordField.value = '';
        passwordField.focus();
      }
    }
  }

  /**
   * Add logout button to admin panel header
   */
  addLogoutButton() {
    if (!this.isAuthenticated()) return;
    
    // Check if logout button already exists
    const existingLogoutBtn = document.getElementById('adminLogout');
    if (existingLogoutBtn) return;
    
    const adminHeader = document.querySelector('.admin-header');
    if (adminHeader) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'adminLogout';
      logoutBtn.className = 'btn btn-secondary';
      logoutBtn.textContent = 'Logout';
      logoutBtn.style.marginLeft = '10px';
      
      logoutBtn.addEventListener('click', () => this.logout());
      
      // Insert before the hide admin button
      const hideAdminBtn = document.getElementById('toggleAdmin');
      if (hideAdminBtn && hideAdminBtn.parentNode) {
        hideAdminBtn.parentNode.insertBefore(logoutBtn, hideAdminBtn);
      }
    }
  }
}

export default AuthSystem;