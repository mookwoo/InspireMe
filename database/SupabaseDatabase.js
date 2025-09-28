/**
 * SupabaseDatabase - A Supabase-based database for managing quotes
 * Provides CRUD operations, search functionality, and cloud data persistence
 * Replaces the localStorage-based QuoteDatabase with cloud storage
 */

import { supabase } from '../config/supabase-client.js';

class SupabaseDatabase {
  constructor() {
    this.tableName = 'quotes';
    this.initialized = false;
    this.initializeDatabase();
  }

  /**
   * Initialize database connection and check if it's working
   */
  async initializeDatabase() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Test connection
      const { data, error } = await supabase
        .from(this.tableName)
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Database initialization error:', error);
        return false;
      }
      
      this.initialized = true;
      console.log('Supabase database initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Supabase database:', error);
      return false;
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get all quotes
   * @returns {Promise<Array>} Array of all quotes
   */
  async getAllQuotes() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching quotes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllQuotes:', error);
      return [];
    }
  }

  /**
   * Get quotes by category
   * @param {string} category - The category to filter by ('all' for all quotes)
   * @returns {Promise<Array>} Filtered array of quotes
   */
  async getQuotesByCategory(category) {
    try {
      if (category === 'all') {
        return await this.getAllQuotes();
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('category', category)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching quotes by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQuotesByCategory:', error);
      return [];
    }
  }

  /**
   * Add new quote
   * @param {string} text - Quote text
   * @param {string} author - Quote author
   * @param {string} category - Quote category
   * @param {Array} tags - Array of tags (optional)
   * @returns {Promise<Object>} The newly created quote
   */
  async addQuote(text, author, category, tags = []) {
    try {
      const quoteData = {
        text: text.trim(),
        author: author.trim(),
        category: category.trim(),
        tags: Array.isArray(tags) ? tags : [],
        views: 0,
        likes: 0,
        is_favorite: false
      };

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([quoteData])
        .select()
        .single();

      if (error) {
        console.error('Error adding quote:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in addQuote:', error);
      throw error;
    }
  }

  /**
   * Update quote
   * @param {number} id - Quote ID
   * @param {Object} updates - Object with fields to update
   * @returns {Promise<Object|null>} Updated quote or null if not found
   */
  async updateQuote(id, updates) {
    try {
      // Remove any undefined values and convert camelCase to snake_case for database
      const dbUpdates = {};
      
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.author !== undefined) dbUpdates.author = updates.author;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.views !== undefined) dbUpdates.views = updates.views;
      if (updates.likes !== undefined) dbUpdates.likes = updates.likes;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quote:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateQuote:', error);
      return null;
    }
  }

  /**
   * Delete quote
   * @param {number} id - Quote ID
   * @returns {Promise<Object|null>} Deleted quote or null if not found
   */
  async deleteQuote(id) {
    try {
      // First get the quote before deleting
      const { data: quoteToDelete, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !quoteToDelete) {
        console.error('Error fetching quote to delete:', fetchError);
        return null;
      }

      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting quote:', deleteError);
        return null;
      }

      return quoteToDelete;
    } catch (error) {
      console.error('Error in deleteQuote:', error);
      return null;
    }
  }

  /**
   * Get quote by ID
   * @param {number} id - Quote ID
   * @returns {Promise<Object|null>} Quote object or null if not found
   */
  async getQuoteById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching quote by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getQuoteById:', error);
      return null;
    }
  }

  /**
   * Search quotes using full-text search function
   * @param {string} searchTerm - The search term
   * @returns {Promise<Array>} Array of matching quotes
   */
  async searchQuotes(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.getAllQuotes();
      }

      // Use the search_quotes function from the database
      const { data, error } = await supabase
        .rpc('search_quotes', { search_term: searchTerm.trim() });

      if (error) {
        console.error('Error searching quotes:', error);
        // Fallback to simple text search
        return await this.searchQuotesSimple(searchTerm);
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchQuotes:', error);
      return await this.searchQuotesSimple(searchTerm);
    }
  }

  /**
   * Simple search fallback (if full-text search fails)
   * @param {string} searchTerm - The search term
   * @returns {Promise<Array>} Array of matching quotes
   */
  async searchQuotesSimple(searchTerm) {
    try {
      const term = searchTerm.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .or(`text.ilike.%${term}%,author.ilike.%${term}%,category.ilike.%${term}%`)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error in simple search:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchQuotesSimple:', error);
      return [];
    }
  }

  /**
   * Get all unique categories
   * @returns {Promise<Array>} Array of category names
   */
  async getAllCategories() {
    try {
      // Use the get_all_categories function
      const { data, error } = await supabase.rpc('get_all_categories');

      if (error) {
        console.error('Error fetching categories:', error);
        // Fallback to simple distinct query
        return await this.getAllCategoriesSimple();
      }

      return (data || []).map(item => item.category).filter(cat => cat && cat.trim() !== '');
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return await this.getAllCategoriesSimple();
    }
  }

  /**
   * Simple categories fetch fallback
   * @returns {Promise<Array>} Array of category names
   */
  async getAllCategoriesSimple() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('category')
        .not('category', 'is', null)
        .neq('category', '');

      if (error) {
        console.error('Error in simple categories fetch:', error);
        return [];
      }

      // Extract unique categories
      const categories = [...new Set((data || []).map(item => item.category))];
      return categories.filter(cat => cat && cat.trim() !== '');
    } catch (error) {
      console.error('Error in getAllCategoriesSimple:', error);
      return [];
    }
  }

  /**
   * Get favorite quotes
   * @returns {Promise<Array>} Array of favorite quotes
   */
  async getFavoriteQuotes() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('is_favorite', true)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching favorite quotes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFavoriteQuotes:', error);
      return [];
    }
  }

  /**
   * Toggle favorite status of a quote
   * @param {number} id - Quote ID
   * @returns {Promise<Object|null>} Updated quote or null if not found
   */
  async toggleFavorite(id) {
    try {
      const quote = await this.getQuoteById(id);
      if (!quote) return null;

      return await this.updateQuote(id, { isFavorite: !quote.is_favorite });
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return null;
    }
  }

  /**
   * Increment view count for a quote
   * @param {number} id - Quote ID
   * @returns {Promise<Object|null>} Updated quote or null if not found
   */
  async incrementViews(id) {
    try {
      const quote = await this.getQuoteById(id);
      if (!quote) return null;

      return await this.updateQuote(id, { views: (quote.views || 0) + 1 });
    } catch (error) {
      console.error('Error in incrementViews:', error);
      return null;
    }
  }

  /**
   * Increment like count for a quote
   * @param {number} id - Quote ID
   * @returns {Promise<Object|null>} Updated quote or null if not found
   */
  async incrementLikes(id) {
    try {
      const quote = await this.getQuoteById(id);
      if (!quote) return null;

      return await this.updateQuote(id, { likes: (quote.likes || 0) + 1 });
    } catch (error) {
      console.error('Error in incrementLikes:', error);
      return null;
    }
  }

  /**
   * Import quotes from an array (e.g., from localStorage migration)
   * @param {Array} quotesArray - Array of quote objects
   * @returns {Promise<number>} Number of quotes imported
   */
  async importQuotes(quotesArray) {
    if (!Array.isArray(quotesArray)) {
      console.error('importQuotes expects an array');
      return 0;
    }

    let importedCount = 0;
    
    for (const quote of quotesArray) {
      try {
        // Check if quote already exists (by text and author)
        const { data: existingQuotes, error: checkError } = await supabase
          .from(this.tableName)
          .select('id')
          .eq('text', quote.text.trim())
          .eq('author', quote.author.trim())
          .limit(1);

        if (checkError) {
          console.error('Error checking existing quote:', checkError);
          continue;
        }

        if (existingQuotes && existingQuotes.length > 0) {
          continue; // Quote already exists
        }

        // Add the quote
        const newQuote = await this.addQuote(
          quote.text,
          quote.author,
          quote.category || 'General',
          quote.tags || []
        );

        if (newQuote) {
          importedCount++;
        }
      } catch (error) {
        console.error('Error importing quote:', error);
      }
    }
    
    return importedCount;
  }

  /**
   * Export all quotes for backup
   * @returns {Promise<Object>} Complete database export
   */
  async exportQuotes() {
    try {
      const quotes = await this.getAllQuotes();
      const stats = await this.getStats();
      
      return {
        quotes,
        categories: await this.getAllCategories(),
        exportDate: new Date().toISOString(),
        version: '2.0',
        stats
      };
    } catch (error) {
      console.error('Error in exportQuotes:', error);
      return null;
    }
  }

  /**
   * Get database statistics using the stats function
   * @returns {Promise<Object>} Statistics about the database
   */
  async getStats() {
    try {
      const { data, error } = await supabase.rpc('get_quote_stats');

      if (error) {
        console.error('Error fetching stats:', error);
        // Fallback to manual calculation
        return await this.getStatsManual();
      }

      return data || {};
    } catch (error) {
      console.error('Error in getStats:', error);
      return await this.getStatsManual();
    }
  }

  /**
   * Manual statistics calculation fallback
   * @returns {Promise<Object>} Statistics about the database
   */
  async getStatsManual() {
    try {
      const quotes = await this.getAllQuotes();
      const categories = await this.getAllCategories();
      const favorites = await this.getFavoriteQuotes();
      
      return {
        totalQuotes: quotes.length,
        totalCategories: categories.length,
        totalFavorites: favorites.length,
        totalViews: quotes.reduce((sum, q) => sum + (q.views || 0), 0),
        totalLikes: quotes.reduce((sum, q) => sum + (q.likes || 0), 0),
        lastUpdated: quotes.length > 0 ? 
          Math.max(...quotes.map(q => new Date(q.last_modified || q.date_added).getTime())) : null
      };
    } catch (error) {
      console.error('Error in getStatsManual:', error);
      return {
        totalQuotes: 0,
        totalCategories: 0,
        totalFavorites: 0,
        totalViews: 0,
        totalLikes: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * Clear all data (admin function - use with caution)
   * Note: This will only work if user has appropriate permissions
   * @param {boolean} confirmed - Must be true to proceed with clearing the database
   */
  async clearDatabase(confirmed = false) {
    if (!confirmed) {
      // Confirmation required; abort if not confirmed
      return false;
    }

    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .neq('id', 0); // Delete all quotes

      if (error) {
        console.error('Error clearing database:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearDatabase:', error);
      return false;
    }
  }

  /**
   * Download backup as JSON file
   */
  async downloadBackup() {
    try {
      const data = await this.exportQuotes();
      if (!data) {
        alert('Error creating backup. Please try again.');
        return;
      }

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `inspireme-supabase-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error('Error in downloadBackup:', error);
      alert('Error creating backup. Please try again.');
    }
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
      if (!data || !data.quotes || !Array.isArray(data.quotes)) {
        console.error('Invalid backup file format');
        return false;
      }

      // Import quotes
      const importedCount = await this.importQuotes(data.quotes);
      console.log(`Imported ${importedCount} quotes from backup`);
      
      return importedCount > 0;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }
}

export default SupabaseDatabase;