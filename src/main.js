import supabase from "./supabase-client.js";
import { getUserId } from "./user-utils.js";

const categoryFilter = document.getElementById("categoryFilter");
const newQuote = document.querySelector("#newQuote");

const text = document.querySelector("#quoteText");
const author = document.querySelector("#quoteAuthor");

// data holders for quotes and categories fetched from Supabase
let quotes = [];
let categories = [];

let lastDisplayedQuoteId = null; // Track last displayed quote's ID instead of index
let currentQuoteId = null; // Track currently displayed quote ID for favorites

/**
 * Determine if Supabase is configured, otherwise use mock data. This is set at startup and doesn't change. Read env vars once. The reason is that if Supabase is misconfigured, we want to stay in mock mode rather than toggling back and forth on connection issues.
 */
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
let useMockData = !hasSupabaseConfig; 

/**
 * Connection state management. This tracks if we're in fallback mode due to connection issues. The state can change dynamically. The reason is that if the connection drops, we want to enter fallback mode, and if it restores, we want to exit it.
 */
let isInFallbackMode = false;
let pendingSyncActions = [];
let syncInProgress = false;

if (useMockData) {
  console.log("🎭 Running in MOCK MODE - No Supabase configuration found");
  console.log("To use real database, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file");
}

// ===== LOCALSTORAGE HELPER FUNCTIONS =====
/**
 * Get favorites from localStorage for a given user
 * @param {string} userId - The user ID
 * @returns {number[]} Array of favorite quote IDs
 */
function getLocalFavorites(userId) {
  const key = useMockData ? 'mock_favorites' : `favorites_${userId}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/**
 * Set favorites in localStorage for a given user
 * @param {string} userId - The user ID (ignored in mock mode)
 * @param {number[]} favorites - Array of favorite quote IDs
 */
function setLocalFavorites(userId, favorites) {
  const key = useMockData ? 'mock_favorites' : `favorites_${userId}`;
  localStorage.setItem(key, JSON.stringify(favorites));
}

/**
 * Add a quote to localStorage favorites
 * @param {string} userId - The user ID
 * @param {number} quoteId - The quote ID to add
 * @returns {boolean} True if added, false if already existed
 */
function addLocalFavorite(userId, quoteId) {
  const favorites = getLocalFavorites(userId);
  if (!favorites.includes(quoteId)) {
    favorites.push(quoteId);
    setLocalFavorites(userId, favorites);
    return true;
  }
  return false;
}

/**
 * Remove a quote from localStorage favorites
 * @param {string} userId - The user ID
 * @param {number} quoteId - The quote ID to remove
 * @returns {boolean} True if removed, false if didn't exist
 */
function removeLocalFavorite(userId, quoteId) {
  const favorites = getLocalFavorites(userId);
  const index = favorites.indexOf(quoteId);
  if (index > -1) {
    favorites.splice(index, 1);
    setLocalFavorites(userId, favorites);
    return true;
  }
  return false;
}

/**
 * Check if a quote is in localStorage favorites
 * @param {string} userId - The user ID
 * @param {number} quoteId - The quote ID to check
 * @returns {boolean} True if favorited
 */
function isLocalFavorite(userId, quoteId) {
  const favorites = getLocalFavorites(userId);
  return favorites.includes(quoteId);
}

// ===== FALLBACK MODE MANAGEMENT =====
// Show warning banner when in fallback mode
function showFallbackWarning() {
  let warningBanner = document.getElementById('fallbackWarning');
  
  if (!warningBanner) {
    warningBanner = document.createElement('div');
    warningBanner.id = 'fallbackWarning';
    warningBanner.className = 'fallback-warning';
    warningBanner.innerHTML = `
      <span>⚠️ Connection issue detected. Favorites are temporarily saved locally and will sync when connection is restored.</span>
      <button id="retryConnection" aria-label="Retry connection">Retry</button>
    `;
    document.body.insertBefore(warningBanner, document.body.firstChild);
    
    // Add retry button handler
    document.getElementById('retryConnection').addEventListener('click', attemptReconnect);
  }
  
  warningBanner.style.display = 'flex';
}

// Hide warning banner
function hideFallbackWarning() {
  const warningBanner = document.getElementById('fallbackWarning');
  if (warningBanner) {
    warningBanner.style.display = 'none';
  }
}

// Attempt to reconnect and sync pending actions
async function attemptReconnect() {
  if (useMockData || syncInProgress) return;
  
  syncInProgress = true;
  const retryBtn = document.getElementById('retryConnection');
  if (retryBtn) {
    retryBtn.textContent = 'Syncing...';
    retryBtn.disabled = true;
  }
  
  try {
    // Test connection with a simple query
    const { error } = await supabase.from('quotes').select('id').limit(1);
    
    if (!error) {
      console.log('✅ Connection restored, syncing pending actions...');
      await syncPendingActions();
      isInFallbackMode = false;
      hideFallbackWarning();
    } else {
      throw error;
    }
  } catch (error) {
    console.error('Reconnection failed:', error);
    alert('Still unable to connect. Please check your internet connection.');
  } finally {
    syncInProgress = false;
    if (retryBtn) {
      retryBtn.textContent = 'Retry';
      retryBtn.disabled = false;
    }
  }
}

// Sync pending actions from localStorage to database
async function syncPendingActions() {
  if (useMockData || pendingSyncActions.length === 0) return;
  
  const userId = getUserId();
  const localFavs = getLocalFavorites(userId);
  
  try {
    // Get current favorites from database
    const { data: dbFavorites, error } = await supabase
      .from('favorites')
      .select('quote_id')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const dbFavIds = new Set(dbFavorites?.map(f => f.quote_id) || []);
    
    // Sync additions
    for (const quoteId of localFavs) {
      if (!dbFavIds.has(quoteId)) {
        await supabase.rpc('add_favorite', {
          p_user_id: userId,
          p_quote_id: quoteId
        });
        console.log(`Synced addition: quote ${quoteId}`);
      }
    }
    
    // Sync removals
    for (const quoteId of dbFavIds) {
      if (!localFavs.includes(quoteId)) {
        await supabase.rpc('remove_favorite', {
          p_user_id: userId,
          p_quote_id: quoteId
        });
        console.log(`Synced removal: quote ${quoteId}`);
      }
    }
    
    pendingSyncActions = [];
    console.log('✅ All pending actions synced successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

// ===== FAVORITES MANAGEMENT =====
// Check if a quote is favorited
async function checkIfFavorited(quoteId) {
  if (useMockData || !supabase) {
    // In mock mode, use localStorage
    return isLocalFavorite(null, quoteId);
  }

  const userId = getUserId();
  
  // If in fallback mode, use localStorage immediately
  if (isInFallbackMode) {
    return isLocalFavorite(userId, quoteId);
  }

  try {
    // Try RPC function first (cast to correct types)
    const { data, error } = await supabase
      .rpc('is_quote_favorited', { 
        p_user_id: userId,
        p_quote_id: quoteId
      });

    if (error) {
      console.error('RPC error checking favorite, entering fallback mode:', error);
      // Enter fallback mode
      isInFallbackMode = true;
      showFallbackWarning();
      
      // Use localStorage as fallback
      return isLocalFavorite(userId, quoteId);
    }
    return data === true;
  } catch (error) {
    console.error('Error checking favorite status, entering fallback mode:', error);
    isInFallbackMode = true;
    showFallbackWarning();
    
    return isLocalFavorite(userId, quoteId);
  }
}

// Toggle favorite status
async function toggleFavorite(quoteId) {
  if (useMockData || !supabase) {
    // Mock mode: use localStorage
    const userId = null; // Not used in mock mode
    const wasRemoved = removeLocalFavorite(userId, quoteId);
    
    if (wasRemoved) {
      console.log('Removed from favorites (mock)');
      return false;
    } else {
      addLocalFavorite(userId, quoteId);
      console.log('Added to favorites (mock)');
      return true;
    }
  }

  const userId = getUserId();

  // If in fallback mode, use localStorage and track for sync
  if (isInFallbackMode) {
    const wasRemoved = removeLocalFavorite(userId, quoteId);
    const wasAdded = !wasRemoved;
    
    if (wasAdded) {
      addLocalFavorite(userId, quoteId);
      console.log('Added to favorites (fallback mode - will sync later)');
    } else {
      console.log('Removed from favorites (fallback mode - will sync later)');
    }
    
    pendingSyncActions.push({ quoteId, action: wasAdded ? 'add' : 'remove' });
    return wasAdded;
  }

  try {
    // Try to add favorite first
    const { error: addError } = await supabase.rpc('add_favorite', {
      p_user_id: userId,
      p_quote_id: quoteId
    });

    if (!addError) {
      console.log('Added to favorites');
      // Update localStorage to stay in sync
      addLocalFavorite(userId, quoteId);
      return true; // Now favorited
    }

    // If add failed (e.g., already favorited), try to remove
    const { error: removeError } = await supabase.rpc('remove_favorite', {
      p_user_id: userId,
      p_quote_id: quoteId
    });

    if (!removeError) {
      console.log('Removed from favorites');
      // Update localStorage to stay in sync
      removeLocalFavorite(userId, quoteId);
      return false; // Now not favorited
    }

    // If both failed, enter fallback mode
    console.warn('Both RPC add/remove failed, entering fallback mode:', addError, removeError);
    isInFallbackMode = true;
    showFallbackWarning();
    
    const wasRemoved = removeLocalFavorite(userId, quoteId);
    const wasAdded = !wasRemoved;
    
    if (wasAdded) {
      addLocalFavorite(userId, quoteId);
      console.log('Added to favorites (fallback mode)');
    } else {
      console.log('Removed from favorites (fallback mode)');
    }
    
    pendingSyncActions.push({ quoteId, action: wasAdded ? 'add' : 'remove' });
    return wasAdded;
  } catch (error) {
    console.error('Error toggling favorite, entering fallback mode:', error);
    isInFallbackMode = true;
    showFallbackWarning();
    
    // Use localStorage fallback
    const wasRemoved = removeLocalFavorite(userId, quoteId);
    const wasAdded = !wasRemoved;
    
    if (wasAdded) {
      addLocalFavorite(userId, quoteId);
    }
    
    pendingSyncActions.push({ quoteId, action: wasAdded ? 'add' : 'remove' });
    return wasAdded;
  }
}

// Update favorite button UI
async function updateFavoriteButton(quoteId) {
  const favoriteBtn = document.getElementById('favoriteBtn');
  if (!favoriteBtn || !quoteId) return;

  const isFavorited = await checkIfFavorited(quoteId);
  
  if (isFavorited) {
    favoriteBtn.classList.add('favorited');
    favoriteBtn.setAttribute('aria-label', 'Remove from favorites');
    favoriteBtn.setAttribute('title', 'Remove from favorites');
  } else {
    favoriteBtn.classList.remove('favorited');
    favoriteBtn.setAttribute('aria-label', 'Add to favorites');
    favoriteBtn.setAttribute('title', 'Add to favorites');
  }
}

// Mock data for testing without Supabase
const MOCK_QUOTES = [
  { id: 1, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Motivation" },
  { id: 2, text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "Innovation" },
  { id: 3, text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon", category: "Life" },
  { id: 4, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "Inspiration" },
  { id: 5, text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "Success" },
  { id: 6, text: "The only impossible journey is the one you never begin.", author: "Tony Robbins", category: "Motivation" },
  { id: 7, text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama", category: "Happiness" },
  { id: 8, text: "Love all, trust a few, do wrong to none.", author: "William Shakespeare", category: "Wisdom" },
  { id: 9, text: "The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.", author: "Audrey Hepburn", category: "Love" },
];

// Fetch quotes from Supabase (with fallback to mock data)
async function fetchQuotes() {
  // If using mock data or supabase not configured, return immediately
  if (useMockData || !supabase) {
    console.log("Using mock data for testing");
    return [...MOCK_QUOTES];
  }

  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("id, text, author, category")
      .eq("status", "approved"); // Only show approved quotes

    if (error) throw error;

    // Return the data directly since category is now stored as text
    return data.map((q) => ({
      id: q.id,
      text: q.text,
      author: q.author,
      category: q.category || "Uncategorized",
    }));
  } catch (error) {
    console.error("Error fetching quotes:", error);
    console.log("Falling back to mock data");
    useMockData = true; // Switch to mock data on error
    return [...MOCK_QUOTES];
  }
}

// fetch categories from Supabase (with fallback to mock data)
async function fetchCategories() {
  // If using mock data or supabase not configured, return categories from mock quotes
  if (useMockData || !supabase) {
    const uniqueCategories = [...new Set(MOCK_QUOTES.map(q => q.category))];
    return uniqueCategories.filter(cat => cat && cat.trim() !== "");
  }
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("category")
      .eq("status", "approved") // Only get categories from approved quotes
      .neq("category", null);

    if (error) throw error;

    // Get unique categories
    const uniqueCategories = [...new Set(data.map(q => q.category))];
    return uniqueCategories.filter(cat => cat && cat.trim() !== "");
  } catch (error) {
    console.error("Error fetching categories:", error);
    const uniqueCategories = [...new Set(MOCK_QUOTES.map(q => q.category))];
    return uniqueCategories.filter(cat => cat && cat.trim() !== "");
  }
}

// populating the dropdown with categories

function populateDropdown(categories) {
  // Clear existing options except "All"
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  
  // Sort categories alphabetically
  const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b));
  
  sortedCategories.forEach((category) => {
    let option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

// Display quotes based on selected category
function displayQuotes(filteredQuotes) {
  if (filteredQuotes.length === 0) {
    text.innerText = "No quotes found for this category.";
    author.innerText = "";
    lastDisplayedQuoteId = null;
    currentQuoteId = null;
    return; // Stop execution here
  }

  // If only one quote exists, just display it
  if (filteredQuotes.length === 1) {
    lastDisplayedQuoteId = filteredQuotes[0].id;
    currentQuoteId = filteredQuotes[0].id;
    text.innerText = `${filteredQuotes[0].text}`;
    author.innerText = `${filteredQuotes[0].author}`;
    updateFavoriteButton(currentQuoteId);
    return; // Stop execution here
  }

  let randomQuote;
  let attempts = 0;
  const maxAttempts = 50; // Prevent infinite loop

  // Ensure we get a different quote from the last one displayed
  do {
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    randomQuote = filteredQuotes[randomIndex];
    attempts++;
  } while (randomQuote.id === lastDisplayedQuoteId && filteredQuotes.length > 1 && attempts < maxAttempts);

  lastDisplayedQuoteId = randomQuote.id;
  currentQuoteId = randomQuote.id;
  text.innerText = `${randomQuote.text}`;
  author.innerText = `${randomQuote.author}`;
  updateFavoriteButton(currentQuoteId);
}

//function to get quotes based on selected category
function getFilteredQuotes() {
  const selectedCategory = categoryFilter.value;
  return selectedCategory === "all"
    ? quotes
    : quotes.filter((q) => q.category === selectedCategory);
}

// Event listener for category selection
categoryFilter.addEventListener("change", function () {
  const filteredQuotes = getFilteredQuotes();
  displayQuotes(filteredQuotes);
});

newQuote.addEventListener("click", function () {
  const filteredQuotes = getFilteredQuotes();
  displayQuotes(filteredQuotes);
});

// ===== Favorite Button Handler =====
const favoriteBtn = document.getElementById('favoriteBtn');
if (favoriteBtn) {
  favoriteBtn.addEventListener('click', async function() {
    if (!currentQuoteId) return;
    
    try {
      // Add loading state
      favoriteBtn.disabled = true;
      
      await toggleFavorite(currentQuoteId);
      await updateFavoriteButton(currentQuoteId); // Reuse existing function
      
      // Show success message if in fallback mode
      if (isInFallbackMode && !useMockData) {
        // The warning banner is already visible, no need for additional alert
        console.log('Favorite updated locally, will sync when connection restored');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      if (isInFallbackMode) {
        // If we're in fallback mode, the action was still saved locally
        console.log('Saved locally despite error');
      } else {
        alert('Failed to update favorite. Please try again.');
      }
    } finally {
      favoriteBtn.disabled = false;
    }
  });
}

// ===== Quote Submission Feature =====

// Modal elements
const submitModal = document.getElementById("submitModal");
const submitQuoteBtn = document.getElementById("submitQuoteBtn");
const closeModalBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const quoteForm = document.getElementById("quoteForm");
const submitFeedback = document.getElementById("submitFeedback");
const quoteTextInput = document.getElementById("quoteTextInput");
const charCount = document.querySelector(".char-count");

// Open modal
submitQuoteBtn.addEventListener("click", function () {
  submitModal.classList.add("show");
  submitModal.setAttribute("aria-hidden", "false");
  quoteTextInput.focus();
});

// Close modal
function closeModal() {
  submitModal.classList.remove("show");
  submitModal.setAttribute("aria-hidden", "true");
  quoteForm.reset();
  submitFeedback.classList.add("hidden");
  charCount.textContent = "0/500";
}

closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

// Close modal when clicking outside
submitModal.addEventListener("click", function (e) {
  if (e.target === submitModal) {
    closeModal();
  }
});

// Close modal with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && submitModal.classList.contains("show")) {
    closeModal();
  }
});

// Character counter
quoteTextInput.addEventListener("input", function () {
  const length = this.value.length;
  charCount.textContent = `${length}/500`;
});

// Submit quote
quoteForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const tagsInput = document.getElementById("tagsInput").value.trim();
  const tagsArray = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  const formData = {
    text: quoteTextInput.value.trim(),
    author: document.getElementById("authorInput").value.trim(),
    category: document.getElementById("categoryInput").value,
    tags: tagsArray,
  };

  // Validate
  if (!formData.text || !formData.author || !formData.category) {
    showFeedback("Please fill in all required fields.", "error");
    return;
  }

  // Show loading state
  const submitBtn = quoteForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    // If using mock data, simulate submission
    if (useMockData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add quote to mock data
      const newQuote = {
        id: MOCK_QUOTES.length + 1,
        ...formData
      };
      MOCK_QUOTES.push(newQuote);
      
      showFeedback("Quote submitted successfully! (Mock mode - not saved to database)", "success");
      
      // Refresh quotes list
      quotes = await fetchQuotes();
      categories = await fetchCategories();
      populateDropdown(categories);
      
      // Reset form after short delay
      setTimeout(() => {
        closeModal();
      }, 2000);
    } else {
      // Real Supabase submission
      const { error } = await supabase.from("quotes").insert([formData]);

      if (error) throw error;

      showFeedback("Quote submitted successfully! Thank you for your contribution.", "success");
      
      // Refresh quotes list
      quotes = await fetchQuotes();
      categories = await fetchCategories();
      populateDropdown(categories);

      // Reset form after short delay
      setTimeout(() => {
        closeModal();
      }, 2000);
    }
  } catch (error) {
    console.error("Error submitting quote:", error);
    showFeedback("Failed to submit quote. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Show feedback message
function showFeedback(message, type) {
  submitFeedback.textContent = message;
  submitFeedback.className = `feedback ${type}`;
  submitFeedback.classList.remove("hidden");
}

// ===== End Quote Submission Feature =====

//Initial display (show any random quote)
async function init() {
  quotes = await fetchQuotes();
  categories = await fetchCategories();

  // Populate main page category filter
  populateDropdown(categories);
  
  // Populate submit form category dropdown
  const categoryInput = document.getElementById('categoryInput');
  if (categoryInput) {
    const sortedCategories = [...categories].sort((a, b) => a.localeCompare(b));
    sortedCategories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryInput.appendChild(option);
    });
  }
  
  displayQuotes(quotes);
  
  // Set copyright year
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

init();

