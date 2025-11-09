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

// Check if Supabase is configured - declare early to avoid hoisting issues
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
let useMockData = !hasSupabaseConfig; // Use mock data if Supabase not configured

if (useMockData) {
  console.log("🎭 Running in MOCK MODE - No Supabase configuration found");
  console.log("To use real database, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file");
}

// ===== FAVORITES MANAGEMENT =====
// Check if a quote is favorited
async function checkIfFavorited(quoteId) {
  if (useMockData || !supabase) {
    // In mock mode, use localStorage
    const favorites = JSON.parse(localStorage.getItem('mock_favorites') || '[]');
    return favorites.includes(quoteId);
  }

  try {
    const userId = getUserId();
    // Try RPC function first (cast to correct types)
    const { data, error } = await supabase
      .rpc('is_quote_favorited', { 
        p_user_id: userId,
        p_quote_id: quoteId
      });

    if (error) {
      console.error('Error checking favorite (using fallback):', error);
      // Fallback: check localStorage
      const localFavs = JSON.parse(localStorage.getItem(`favorites_${userId}`) || '[]');
      return localFavs.includes(quoteId);
    }
    return data === true;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

// Toggle favorite status
async function toggleFavorite(quoteId) {
  if (useMockData || !supabase) {
    // Mock mode: use localStorage
    const favorites = JSON.parse(localStorage.getItem('mock_favorites') || '[]');
    const index = favorites.indexOf(quoteId);
    
    if (index > -1) {
      favorites.splice(index, 1);
      console.log('Removed from favorites (mock)');
    } else {
      favorites.push(quoteId);
      console.log('Added to favorites (mock)');
    }
    
    localStorage.setItem('mock_favorites', JSON.stringify(favorites));
    return index === -1; // Return true if added, false if removed
  }

  const userId = getUserId();
  const isFavorited = await checkIfFavorited(quoteId);

  try {
    if (isFavorited) {
      // Try RPC function
      const { error } = await supabase.rpc('remove_favorite', {
        p_user_id: userId,
        p_quote_id: quoteId
      });
      
      if (error) {
        console.warn('RPC remove_favorite failed, using localStorage:', error);
        // Fallback to localStorage
        const localFavs = JSON.parse(localStorage.getItem(`favorites_${userId}`) || '[]');
        const filtered = localFavs.filter(id => id !== quoteId);
        localStorage.setItem(`favorites_${userId}`, JSON.stringify(filtered));
      }
      console.log('Removed from favorites');
      return false; // Return new state: not favorited
    } else {
      // Try RPC function
      const { error } = await supabase.rpc('add_favorite', {
        p_user_id: userId,
        p_quote_id: quoteId
      });
      
      if (error) {
        console.warn('RPC add_favorite failed, using localStorage fallback:', error);
        // Fallback to localStorage
        const localFavs = JSON.parse(localStorage.getItem(`favorites_${userId}`) || '[]');
        localFavs.push(quoteId);
        localStorage.setItem(`favorites_${userId}`, JSON.stringify(localFavs));
      }
      console.log('Added to favorites');
      
      return true; // Return new state: now favorited
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
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
      
      const isNowFavorited = await toggleFavorite(currentQuoteId);
      
      // Update UI
      if (isNowFavorited) {
        favoriteBtn.classList.add('favorited');
        favoriteBtn.setAttribute('aria-label', 'Remove from favorites');
        favoriteBtn.setAttribute('title', 'Remove from favorites');
      } else {
        favoriteBtn.classList.remove('favorited');
        favoriteBtn.setAttribute('aria-label', 'Add to favorites');
        favoriteBtn.setAttribute('title', 'Add to favorites');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Failed to update favorite. Please try again.');
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

