/**
 * Admin Interface for Quote Database Management
 * Provides UI functionality for managing quotes, viewing stats, and backup/restore
 */
class QuoteAdmin {
  constructor(database) {
    this.db = database;
    this.currentTab = 'add';
    this.initializeAdmin();
  }

  /**
   * Initialize all admin functionality
   */
  initializeAdmin() {
    this.setupEventListeners();
    this.loadStats();
  }

  /**
   * Setup all event listeners for admin interface
   */
  setupEventListeners() {
    // Admin toggle
    const adminToggle = document.getElementById('adminToggle');
    const toggleAdmin = document.getElementById('toggleAdmin');
    const adminSection = document.getElementById('adminSection');

    adminToggle?.addEventListener('click', () => {
      adminSection.style.display = adminSection.style.display === 'none' ? 'block' : 'none';
    });

    toggleAdmin?.addEventListener('click', () => {
      adminSection.style.display = 'none';
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Add quote form
    const addQuoteForm = document.getElementById('addQuoteForm');
    addQuoteForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddQuote();
    });

    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchQuotes');
    
    searchBtn?.addEventListener('click', () => {
      this.handleSearch();
    });
    
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    // Backup functionality
    const downloadBackup = document.getElementById('downloadBackup');
    const restoreBackup = document.getElementById('restoreBackup');
    const clearDatabase = document.getElementById('clearDatabase');

    downloadBackup?.addEventListener('click', () => {
      this.db.downloadBackup();
    });

    restoreBackup?.addEventListener('click', () => {
      this.handleRestore();
    });

    clearDatabase?.addEventListener('click', () => {
      this.handleClearDatabase();
    });
  }

  /**
   * Switch between admin tabs
   */
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;

    // Load content based on tab
    switch (tabName) {
      case 'manage':
        this.loadQuotesList();
        break;
      case 'stats':
        this.loadStats();
        break;
    }
  }

  /**
   * Handle adding a new quote
   */
  handleAddQuote() {
    const text = document.getElementById('quoteTextInput').value.trim();
    const author = document.getElementById('quoteAuthorInput').value.trim();
    const category = document.getElementById('quoteCategoryInput').value.trim();
    const tagsInput = document.getElementById('quoteTagsInput').value.trim();
    
    if (!text || !author || !category) {
      alert('Please fill in all required fields.');
      return;
    }

    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    try {
      const newQuote = this.db.addQuote(text, author, category, tags);
      this.showSuccess(`Quote added successfully! ID: ${newQuote.id}`);
      this.clearAddForm();
      this.updateCategoryDropdown();
    } catch (error) {
      this.showError('Error adding quote: ' + error.message);
    }
  }

  /**
   * Clear the add quote form
   */
  clearAddForm() {
    document.getElementById('addQuoteForm').reset();
  }

  /**
   * Handle search functionality
   */
  handleSearch() {
    const searchTerm = document.getElementById('searchQuotes').value.trim();
    this.loadQuotesList(searchTerm);
  }

  /**
   * Load and display quotes list
   */
  loadQuotesList(searchTerm = '') {
    const quotesList = document.getElementById('quotesList');
    if (!quotesList) return;

    const quotes = searchTerm ? this.db.searchQuotes(searchTerm) : this.db.getAllQuotes();
    
    if (quotes.length === 0) {
      quotesList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">No quotes found.</div>';
      return;
    }

    quotesList.innerHTML = quotes.map(quote => this.createQuoteItemHTML(quote)).join('');
    
    // Add event listeners for quote actions
    this.setupQuoteItemListeners();
  }

  /**
   * Create HTML for a quote item
   */
  createQuoteItemHTML(quote) {
    return `
      <div class="quote-item" data-quote-id="${quote.id}">
        <div class="quote-item-text">"${this.escapeHtml(quote.text)}"</div>
        <div class="quote-item-meta">
          <div class="quote-item-author">— ${this.escapeHtml(quote.author)}</div>
          <div class="quote-item-category">${this.escapeHtml(quote.category)}</div>
        </div>
        <div class="quote-item-stats">
          <span>👁️ ${quote.views || 0} views</span>
          <span>❤️ ${quote.likes || 0} likes</span>
          <span>📅 ${new Date(quote.dateAdded).toLocaleDateString()}</span>
        </div>
        <div class="quote-item-actions">
          <button class="btn btn-small btn-secondary favorite-btn" data-action="favorite" data-quote-id="${quote.id}">
            ${quote.isFavorite ? '⭐ Unfavorite' : '☆ Favorite'}
          </button>
          <button class="btn btn-small btn-secondary" data-action="edit" data-quote-id="${quote.id}">✏️ Edit</button>
          <button class="btn btn-small btn-danger" data-action="delete" data-quote-id="${quote.id}">🗑️ Delete</button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners for quote item actions
   */
  setupQuoteItemListeners() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const quoteId = parseInt(e.target.dataset.quoteId);
        
        switch (action) {
          case 'favorite':
            this.toggleFavorite(quoteId);
            break;
          case 'edit':
            this.editQuote(quoteId);
            break;
          case 'delete':
            this.deleteQuote(quoteId);
            break;
        }
      });
    });
  }

  /**
   * Toggle favorite status of a quote
   */
  toggleFavorite(quoteId) {
    const updatedQuote = this.db.toggleFavorite(quoteId);
    if (updatedQuote) {
      const btn = document.querySelector(`[data-action="favorite"][data-quote-id="${quoteId}"]`);
      btn.textContent = updatedQuote.isFavorite ? '⭐ Unfavorite' : '☆ Favorite';
      this.showSuccess('Favorite status updated!');
    }
  }

  /**
   * Edit a quote (simple prompt-based editing)
   */
  editQuote(quoteId) {
    const quote = this.db.getQuoteById(quoteId);
    if (!quote) return;

    const newText = prompt('Edit quote text:', quote.text);
    if (newText === null) return;

    const newAuthor = prompt('Edit author:', quote.author);
    if (newAuthor === null) return;

    const newCategory = prompt('Edit category:', quote.category);
    if (newCategory === null) return;

    if (newText.trim() && newAuthor.trim() && newCategory.trim()) {
      this.db.updateQuote(quoteId, {
        text: newText.trim(),
        author: newAuthor.trim(),
        category: newCategory.trim()
      });
      this.loadQuotesList();
      this.updateCategoryDropdown();
      this.showSuccess('Quote updated successfully!');
    }
  }

  /**
   * Delete a quote
   */
  deleteQuote(quoteId) {
    const quote = this.db.getQuoteById(quoteId);
    if (!quote) return;

    if (confirm(`Are you sure you want to delete this quote by ${quote.author}?`)) {
      this.db.deleteQuote(quoteId);
      this.loadQuotesList();
      this.updateCategoryDropdown();
      this.showSuccess('Quote deleted successfully!');
    }
  }

  /**
   * Load and display statistics
   */
  loadStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    const stats = this.db.getStats();
    
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${stats.totalQuotes}</div>
        <div class="stat-label">Total Quotes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalCategories}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalFavorites}</div>
        <div class="stat-label">Favorites</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalViews}</div>
        <div class="stat-label">Total Views</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalLikes}</div>
        <div class="stat-label">Total Likes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${new Date(stats.lastUpdated).toLocaleDateString()}</div>
        <div class="stat-label">Last Updated</div>
      </div>
    `;
  }

  /**
   * Handle backup restoration
   */
  async handleRestore() {
    const fileInput = document.getElementById('backupFile');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please select a backup file first.');
      return;
    }

    if (confirm('This will replace all current data. Are you sure?')) {
      try {
        const success = await this.db.restoreFromBackup(file);
        if (success) {
          this.showSuccess('Backup restored successfully!');
          this.loadStats();
          this.loadQuotesList();
          this.updateCategoryDropdown();
          // Refresh the main quote display
          window.location.reload();
        } else {
          this.showError('Failed to restore backup. Please check the file format.');
        }
      } catch (error) {
        this.showError('Error restoring backup: ' + error.message);
      }
    }
  }

  /**
   * Handle database clearing
   */
  handleClearDatabase() {
    if (confirm('This will permanently delete all quotes. Are you sure you want to clear the database?')) {
      if (this.db.clearDatabase()) {
        this.showSuccess('Database cleared successfully!');
        this.loadStats();
        this.loadQuotesList();
        this.updateCategoryDropdown();
        // Refresh the main quote display
        window.location.reload();
      }
    }
  }

  /**
   * Update the main category dropdown
   */
  updateCategoryDropdown() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    // Save current selection
    const currentValue = categoryFilter.value;
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    // Add updated categories
    const categories = this.db.getAllCategories();
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    // Restore selection if it still exists
    if (categories.includes(currentValue) || currentValue === 'all') {
      categoryFilter.value = currentValue;
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * Show a temporary message
   */
  showMessage(message, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.admin-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message admin-message-${type}`;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 80px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#b8daff'};
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 1.4rem;
      z-index: 1001;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default QuoteAdmin;