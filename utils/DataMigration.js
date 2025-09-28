/**
 * Data Migration Utility
 * Helps users migrate from localStorage to Supabase
 */

class DataMigrationUtility {
  constructor(localStorageDB, supabaseDB, auth) {
    this.localDB = localStorageDB;
    this.supabaseDB = supabaseDB;
    this.auth = auth;
    this.migrationKey = 'inspireme_migration_status';
  }

  /**
   * Check if migration has been completed
   * @returns {boolean} True if migration was completed
   */
  isMigrationCompleted() {
    return localStorage.getItem(this.migrationKey) === 'completed';
  }

  /**
   * Mark migration as completed
   */
  markMigrationCompleted() {
    localStorage.setItem(this.migrationKey, 'completed');
  }

  /**
   * Check if there's localStorage data to migrate
   * @returns {boolean} True if localStorage data exists
   */
  hasLocalStorageData() {
    try {
      const localData = this.localDB.getAllData();
      return localData && localData.quotes && localData.quotes.length > 0;
    } catch (error) {
      console.error('Error checking localStorage data:', error);
      return false;
    }
  }

  /**
   * Get migration statistics
   * @returns {Object} Migration statistics
   */
  async getMigrationStats() {
    try {
      const localData = this.localDB.getAllData();
      const localQuotesCount = localData ? localData.quotes.length : 0;
      
      const supabaseQuotes = await this.supabaseDB.getAllQuotes();
      const supabaseQuotesCount = supabaseQuotes.length;

      return {
        localQuotesCount,
        supabaseQuotesCount,
        hasLocalData: localQuotesCount > 0,
        migrationCompleted: this.isMigrationCompleted(),
        canMigrate: localQuotesCount > 0 && this.auth.isAuthenticated()
      };
    } catch (error) {
      console.error('Error getting migration stats:', error);
      return {
        localQuotesCount: 0,
        supabaseQuotesCount: 0,
        hasLocalData: false,
        migrationCompleted: false,
        canMigrate: false
      };
    }
  }

  /**
   * Migrate data from localStorage to Supabase
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrateData(options = {}) {
    const { skipDuplicates = true, batchSize = 10 } = options;

    try {
      if (!this.auth.isAuthenticated()) {
        return {
          success: false,
          error: 'Authentication required for migration',
          migrated: 0
        };
      }

      const localData = this.localDB.getAllData();
      if (!localData || !localData.quotes || localData.quotes.length === 0) {
        return {
          success: false,
          error: 'No local data found to migrate',
          migrated: 0
        };
      }

      const quotesToMigrate = localData.quotes;
      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process quotes in batches
      for (let i = 0; i < quotesToMigrate.length; i += batchSize) {
        const batch = quotesToMigrate.slice(i, i + batchSize);
        
        for (const quote of batch) {
          try {
            // Check for duplicates if skipDuplicates is true
            if (skipDuplicates) {
              const existingQuotes = await this.supabaseDB.searchQuotes(quote.text);
              const duplicate = existingQuotes.find(q => 
                q.text.trim().toLowerCase() === quote.text.trim().toLowerCase() &&
                q.author.trim().toLowerCase() === quote.author.trim().toLowerCase()
              );
              
              if (duplicate) {
                skippedCount++;
                continue;
              }
            }

            // Migrate the quote
            const migratedQuote = await this.supabaseDB.addQuote(
              quote.text,
              quote.author,
              quote.category || 'General',
              quote.tags || []
            );

            if (migratedQuote) {
              // Update additional fields if they exist
              const updates = {};
              if (quote.views) updates.views = quote.views;
              if (quote.likes) updates.likes = quote.likes;
              if (quote.isFavorite) updates.isFavorite = quote.isFavorite;

              if (Object.keys(updates).length > 0) {
                await this.supabaseDB.updateQuote(migratedQuote.id, updates);
              }

              migratedCount++;
            }
          } catch (error) {
            console.error(`Error migrating quote: ${quote.text.substring(0, 50)}...`, error);
            errors.push({
              quote: quote.text.substring(0, 50) + '...',
              error: error.message
            });
            errorCount++;
          }
        }

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < quotesToMigrate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const result = {
        success: migratedCount > 0,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount,
        errorDetails: errors,
        total: quotesToMigrate.length,
        message: `Migration completed: ${migratedCount} quotes migrated, ${skippedCount} skipped, ${errorCount} errors`
      };

      if (result.success) {
        this.markMigrationCompleted();
      }

      return result;
    } catch (error) {
      console.error('Error in migration:', error);
      return {
        success: false,
        error: error.message,
        migrated: 0
      };
    }
  }

  /**
   * Create a backup of localStorage data before migration
   * @returns {boolean} True if backup was successful
   */
  createLocalBackup() {
    try {
      const localData = this.localDB.exportQuotes();
      if (!localData) return false;

      const dataStr = JSON.stringify(localData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `inspireme-localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      return true;
    } catch (error) {
      console.error('Error creating local backup:', error);
      return false;
    }
  }

  /**
   * Show migration modal/interface
   */
  async showMigrationInterface() {
    const stats = await this.getMigrationStats();
    
    if (stats.migrationCompleted) {
      alert('Migration has already been completed!');
      return;
    }

    if (!stats.hasLocalData) {
      alert('No local data found to migrate.');
      return;
    }

    if (!stats.canMigrate) {
      alert('Please sign in to migrate your data to Supabase.');
      return;
    }

    const shouldMigrate = confirm(
      `Found ${stats.localQuotesCount} quotes in local storage.\n` +
      `Supabase database currently has ${stats.supabaseQuotesCount} quotes.\n\n` +
      `Would you like to migrate your local quotes to Supabase?\n` +
      `(This will preserve your local data and sync it to the cloud)`
    );

    if (shouldMigrate) {
      // Create backup first
      const backupCreated = this.createLocalBackup();
      if (!backupCreated) {
        const continueAnyway = confirm('Failed to create backup. Continue with migration anyway?');
        if (!continueAnyway) return;
      }

      // Show progress
      const migrationMessage = document.createElement('div');
      migrationMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        border: 2px solid #007bff;
      `;
      migrationMessage.innerHTML = `
        <h3>Migrating Data...</h3>
        <p>Please wait while we migrate your quotes to Supabase.</p>
        <div style="margin: 10px 0;">🔄 Processing...</div>
      `;
      document.body.appendChild(migrationMessage);

      try {
        const result = await this.migrateData();
        
        migrationMessage.innerHTML = `
          <h3>Migration ${result.success ? 'Complete' : 'Failed'}</h3>
          <p>${result.message}</p>
          ${result.success ? '✅' : '❌'}
          <br><br>
          <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;

        if (result.success) {
          // Refresh the page to use Supabase data
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      } catch (error) {
        migrationMessage.innerHTML = `
          <h3>Migration Failed</h3>
          <p>Error: ${error.message}</p>
          ❌
          <br><br>
          <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;
      }
    }
  }

  /**
   * Auto-migrate if conditions are met
   * @returns {Promise<boolean>} True if auto-migration was performed
   */
  async autoMigrate() {
    try {
      const stats = await this.getMigrationStats();
      
      if (stats.migrationCompleted || !stats.hasLocalData || !stats.canMigrate) {
        return false;
      }

      // Only auto-migrate if there's a reasonable amount of data
      if (stats.localQuotesCount >= 5) {
        const result = await this.migrateData();
        return result.success;
      }

      return false;
    } catch (error) {
      console.error('Error in auto-migrate:', error);
      return false;
    }
  }
}

export default DataMigrationUtility;