/**
 * QuoteDatabase - A simple localStorage-based database for managing quotes
 * Provides CRUD operations, search functionality, and data persistence
 */
class QuoteDatabase {
  constructor() {
    this.storageKey = 'inspireme_quotes';
    this.initializeDatabase();
  }

  /**
   * Initialize database with default structure if empty
   */
  initializeDatabase() {
    if (!localStorage.getItem(this.storageKey)) {
      const defaultData = {
        quotes: [],
        categories: [],
        nextId: 1,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      this.saveToStorage(defaultData);
    }
  }

  /**
   * Get all data from storage
   * @returns {Object|null} The complete database object
   */
  getAllData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Save data to storage
   * @param {Object} data - The data to save
   */
  saveToStorage(data) {
    try {
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Get all quotes
   * @returns {Array} Array of all quotes
   */
  getAllQuotes() {
    const data = this.getAllData();
    return data ? data.quotes : [];
  }

  /**
   * Get quotes by category
   * @param {string} category - The category to filter by ('all' for all quotes)
   * @returns {Array} Filtered array of quotes
   */
  getQuotesByCategory(category) {
    const quotes = this.getAllQuotes();
    return category === 'all' ? quotes : quotes.filter(q => q.category === category);
  }

  /**
   * Add new quote
   * @param {string} text - Quote text
   * @param {string} author - Quote author
   * @param {string} category - Quote category
   * @param {Array} tags - Array of tags (optional)
   * @returns {Object} The newly created quote
   */
  addQuote(text, author, category, tags = []) {
    const data = this.getAllData();
    const newQuote = {
      id: data.nextId,
      text: text.trim(),
      author: author.trim(),
      category: category.trim(),
      tags: Array.isArray(tags) ? tags : [],
      dateAdded: new Date().toISOString(),
      likes: 0,
      views: 0,
      isFavorite: false
    };
    
    data.quotes.push(newQuote);
    data.nextId++;
    
    // Update categories list
    if (!data.categories.includes(category)) {
      data.categories.push(category);
    }
    
    this.saveToStorage(data);
    return newQuote;
  }

  /**
   * Update quote
   * @param {number} id - Quote ID
   * @param {Object} updates - Object with fields to update
   * @returns {Object|null} Updated quote or null if not found
   */
  updateQuote(id, updates) {
    const data = this.getAllData();
    const quoteIndex = data.quotes.findIndex(q => q.id === id);
    
    if (quoteIndex !== -1) {
      data.quotes[quoteIndex] = { 
        ...data.quotes[quoteIndex], 
        ...updates,
        lastModified: new Date().toISOString()
      };
      this.saveToStorage(data);
      return data.quotes[quoteIndex];
    }
    return null;
  }

  /**
   * Delete quote
   * @param {number} id - Quote ID
   * @returns {Object|null} Deleted quote or null if not found
   */
  deleteQuote(id) {
    const data = this.getAllData();
    const quoteIndex = data.quotes.findIndex(q => q.id === id);
    
    if (quoteIndex !== -1) {
      const deletedQuote = data.quotes.splice(quoteIndex, 1)[0];
      this.saveToStorage(data);
      return deletedQuote;
    }
    return null;
  }

  /**
   * Get quote by ID
   * @param {number} id - Quote ID
   * @returns {Object|null} Quote object or null if not found
   */
  getQuoteById(id) {
    const quotes = this.getAllQuotes();
    return quotes.find(q => q.id === id) || null;
  }

  /**
   * Search quotes by text, author, or tags
   * @param {string} searchTerm - The search term
   * @returns {Array} Array of matching quotes
   */
  searchQuotes(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.getAllQuotes();
    }
    
    const quotes = this.getAllQuotes();
    const term = searchTerm.toLowerCase().trim();
    
    return quotes.filter(q => 
      q.text.toLowerCase().includes(term) ||
      q.author.toLowerCase().includes(term) ||
      (q.tags && q.tags.some(tag => tag.toLowerCase().includes(term))) ||
      q.category.toLowerCase().includes(term)
    );
  }

  /**
   * Get all unique categories
   * @returns {Array} Array of category names
   */
  getAllCategories() {
    const quotes = this.getAllQuotes();
    const categories = [...new Set(quotes.map(q => q.category))];
    return categories.filter(cat => cat && cat.trim() !== '');
  }

  /**
   * Get favorite quotes
   * @returns {Array} Array of favorite quotes
   */
  getFavoriteQuotes() {
    const quotes = this.getAllQuotes();
    return quotes.filter(q => q.isFavorite);
  }

  /**
   * Toggle favorite status of a quote
   * @param {number} id - Quote ID
   * @returns {Object|null} Updated quote or null if not found
   */
  toggleFavorite(id) {
    const quote = this.getQuoteById(id);
    if (quote) {
      return this.updateQuote(id, { isFavorite: !quote.isFavorite });
    }
    return null;
  }

  /**
   * Increment view count for a quote
   * @param {number} id - Quote ID
   * @returns {Object|null} Updated quote or null if not found
   */
  incrementViews(id) {
    const quote = this.getQuoteById(id);
    if (quote) {
      return this.updateQuote(id, { views: quote.views + 1 });
    }
    return null;
  }

  /**
   * Increment like count for a quote
   * @param {number} id - Quote ID
   * @returns {Object|null} Updated quote or null if not found
   */
  incrementLikes(id) {
    const quote = this.getQuoteById(id);
    if (quote) {
      return this.updateQuote(id, { likes: quote.likes + 1 });
    }
    return null;
  }

  /**
   * Import quotes from an array (e.g., your existing quotes.js)
   * @param {Array} quotesArray - Array of quote objects
   * @returns {number} Number of quotes imported
   */
  importQuotes(quotesArray) {
    if (!Array.isArray(quotesArray)) {
      console.error('importQuotes expects an array');
      return 0;
    }

    const data = this.getAllData();
    let importedCount = 0;
    
    quotesArray.forEach(quote => {
      // Check if quote already exists (by text and author)
      const exists = data.quotes.some(existingQuote => 
        existingQuote.text.trim() === quote.text.trim() && 
        existingQuote.author.trim() === quote.author.trim()
      );
      
      if (!exists) {
        const newQuote = {
          id: data.nextId,
          text: quote.text.trim(),
          author: quote.author.trim(),
          category: quote.category ? quote.category.trim() : 'General',
          tags: quote.tags || [],
          dateAdded: new Date().toISOString(),
          likes: 0,
          views: 0,
          isFavorite: false
        };
        
        data.quotes.push(newQuote);
        data.nextId++;
        importedCount++;
        
        // Update categories list
        if (!data.categories.includes(newQuote.category)) {
          data.categories.push(newQuote.category);
        }
      }
    });
    
    this.saveToStorage(data);
    return importedCount;
  }

  /**
   * Export all quotes for backup
   * @returns {Object} Complete database object
   */
  exportQuotes() {
    return this.getAllData();
  }

  /**
   * Get database statistics
   * @returns {Object} Statistics about the database
   */
  getStats() {
    const quotes = this.getAllQuotes();
    const categories = this.getAllCategories();
    const favorites = this.getFavoriteQuotes();
    
    return {
      totalQuotes: quotes.length,
      totalCategories: categories.length,
      totalFavorites: favorites.length,
      totalViews: quotes.reduce((sum, q) => sum + q.views, 0),
      totalLikes: quotes.reduce((sum, q) => sum + q.likes, 0),
      lastUpdated: this.getAllData()?.lastUpdated || null
    };
  }

  /**
   * Clear all data (use with caution)
   */
  clearDatabase() {
    localStorage.removeItem(this.storageKey);
    this.initializeDatabase();
    return true;
  }

  /**
   * Backup database to JSON file download
   */
  downloadBackup() {
    const data = this.exportQuotes();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `inspireme-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  /**
   * Restore database from backup file
   * @param {File} file - The backup file to restore from
   * @returns {Promise<boolean>} Success status
   */
  async restoreFromBackup(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate data structure
      if (data && data.quotes && Array.isArray(data.quotes)) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        return true;
      } else {
        console.error('Invalid backup file format');
        return false;
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }
}

export default QuoteDatabase;