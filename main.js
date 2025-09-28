import quotes from "./quotes.js";
import QuoteDatabase from "./database/QuoteDatabase.js";
import SupabaseDatabase from "./database/SupabaseDatabase.js";
import QuoteAdmin from "./database/admin.js";
import AuthManager from "./database/auth.js";
import SupabaseAuthManager from "./database/SupabaseAuth.js";
import DataMigrationUtility from "./utils/DataMigration.js";

// Initialize databases and authentication
const localDB = new QuoteDatabase(); // Keep localStorage as fallback
const supabaseDB = new SupabaseDatabase();
const localAuth = new AuthManager();
const supabaseAuth = new SupabaseAuthManager();

// Use Supabase as primary, localStorage as fallback
let db = supabaseDB;
let auth = supabaseAuth;

// Initialize migration utility
const migrationUtil = new DataMigrationUtility(localDB, supabaseDB, supabaseAuth);

// Initialize database with data
async function initializeDatabase() {
  try {
    // Wait for Supabase to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (await supabaseDB.isInitialized()) {
      console.log('Using Supabase database');
      
      // Check for migration
      const stats = await migrationUtil.getMigrationStats();
      if (stats.hasLocalData && !stats.migrationCompleted) {
        // Show migration option to user
        const shouldMigrate = await migrationUtil.showMigrationInterface(stats);
        
        if (shouldMigrate && auth.isAuthenticated()) {
          const result = await migrationUtil.migrateData();
          if (result.success) {
            alert(`Successfully migrated ${result.migrated} quotes to Supabase!`);
          } else {
            alert(`Migration failed: ${result.error}`);
          }
        }
      }
      
      // Import default quotes if database is empty
      const allQuotes = await db.getAllQuotes();
      if (allQuotes.length === 0) {
        console.log('Importing default quotes to Supabase...');
        const importedCount = await db.importQuotes(quotes);
        console.log(`Imported ${importedCount} quotes successfully!`);
      }
    } else {
      console.log('Supabase not available, using localStorage fallback');
      // Fallback to localStorage
      db = localDB;
      auth = localAuth;
      
      if (localDB.getAllQuotes().length === 0) {
        console.log('Importing existing quotes to localStorage...');
        const importedCount = localDB.importQuotes(quotes);
        console.log(`Imported ${importedCount} quotes successfully!`);
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    // Fallback to localStorage
    db = localDB;
    auth = localAuth;
  }
}

// Initialize admin interface with authentication
const admin = new QuoteAdmin(db, auth);

// Initialize the database
await initializeDatabase();

const categoryFilter = document.getElementById("categoryFilter");
const newQuote = document.querySelector("#newQuote");

const text = document.querySelector("#quoteText");
const author = document.querySelector("#quoteAuthor");

// Get categories from database (async)
async function loadCategories() {
  try {
    const categories = await db.getAllCategories();
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    // Populate the dropdown
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Load categories on startup
loadCategories();

let lastDisplayedIndex = -1; // Track last displayed quote's index

async function displayQuotes(filteredQuotes) {
  // Handle empty category
  if (filteredQuotes.length === 0) {
    text.textContent = "No quotes available for this category.";
    author.textContent = "";
    return;
  }

  // If only one quote exists, just display it without looping
  if (filteredQuotes.length === 1) {
    lastDisplayedIndex = 0;
    const quote = filteredQuotes[0];
    text.textContent = `${quote.text}`;
    author.textContent = `${quote.author}`;
    
    // Increment view count asynchronously
    try {
      await db.incrementViews(quote.id);
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
    return;
  }

  let newIndex;

  // Ensure we get a new quote every time
  do {
    newIndex = Math.floor(Math.random() * filteredQuotes.length);
  } while (newIndex === lastDisplayedIndex && filteredQuotes.length > 1);

  lastDisplayedIndex = newIndex;

  const randomQuote = filteredQuotes[newIndex];
  text.textContent = `${randomQuote.text}`;
  author.textContent = `${randomQuote.author}`;

  // Increment view count in database asynchronously
  try {
    await db.incrementViews(randomQuote.id);
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
}

// Get quotes based on selected category (async)
async function getFilteredQuotes() {
  try {
    const selectedCategory = categoryFilter.value;
    return await db.getQuotesByCategory(selectedCategory);
  } catch (error) {
    console.error('Error getting filtered quotes:', error);
    return [];
  }
}

// Event listener for category selection
categoryFilter.addEventListener("change", async function () {
  const filteredQuotes = await getFilteredQuotes();
  await displayQuotes(filteredQuotes);
});

newQuote.addEventListener("click", async function () {
  const filteredQuotes = await getFilteredQuotes();
  await displayQuotes(filteredQuotes);
});

// Initial display (show any random quote)
async function initializeDisplay() {
  try {
    const allQuotes = await db.getAllQuotes();
    await displayQuotes(allQuotes);
  } catch (error) {
    console.error('Error initializing display:', error);
    text.textContent = "Error loading quotes. Please refresh the page.";
    author.textContent = "";
  }
}

// Initialize display after a short delay to ensure database is ready
setTimeout(initializeDisplay, 1500);

// Set the current year in the footer
const currentYear = new Date().getFullYear();
console.log(currentYear);
document.getElementById("year").textContent = `${currentYear}.`;
document.getElementById("sr-year").textContent = `Copyright © ${currentYear}`;

// Expose database for debugging (consider removing in production)
window.quoteDB = db;

// Ensure admin panel is properly secured on page load
document.addEventListener('DOMContentLoaded', () => {
  const adminSection = document.getElementById('adminSection');
  if (adminSection && !auth.isAuthenticated()) {
    adminSection.style.display = 'none';
  }
});