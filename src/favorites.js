import supabase from "./supabase-client.js";

const favoritesContainer = document.getElementById('favoritesContainer');
const emptyState = document.getElementById('emptyState');
const yearElement = document.getElementById('year');

// Get user ID (same function as in main.js)
function getUserId() {
  const storageKey = 'inspireme_user_id';
  let userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    userId = `user_${timestamp}_${random}`;
    localStorage.setItem(storageKey, userId);
  }
  
  return userId;
}

// Check if Supabase is configured
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
const useMockData = !hasSupabaseConfig;

// Mock data for testing
const MOCK_QUOTES = [
  { id: 1, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Motivation" },
  { id: 2, text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "Innovation" },
];

// Fetch user's favorite quotes
async function fetchFavorites() {
  if (useMockData || !supabase) {
    // Mock mode: get favorites from localStorage
    const favoriteIds = JSON.parse(localStorage.getItem('mock_favorites') || '[]');
    return MOCK_QUOTES.filter(q => favoriteIds.includes(q.id)).map(q => ({
      ...q,
      favorited_at: new Date().toISOString()
    }));
  }

  try {
    const userId = getUserId();
    
    // Try RPC function
    const { data, error } = await supabase.rpc('get_user_favorites', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
}

// Remove a quote from favorites
async function removeFavorite(quoteId) {
  if (useMockData || !supabase) {
    // Mock mode
    const favorites = JSON.parse(localStorage.getItem('mock_favorites') || '[]');
    const filtered = favorites.filter(id => id !== quoteId);
    localStorage.setItem('mock_favorites', JSON.stringify(filtered));
    return true;
  }

  try {
    const userId = getUserId();
    // Try RPC function
    const { error } = await supabase.rpc('remove_favorite', {
      p_user_id: userId,
      p_quote_id: quoteId
    });

    if (error) {
      console.warn('RPC remove_favorite failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
}

// Render favorites
function renderFavorites(favorites) {
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  
  const html = favorites.map(quote => `
    <div class="favorite-card" data-quote-id="${quote.id}">
      <button 
        class="remove-btn" 
        data-quote-id="${quote.id}"
        aria-label="Remove from favorites"
        title="Remove from favorites"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>
      <p class="quote-text">"${quote.text}"</p>
      <p class="quote-author">— ${quote.author}</p>
      ${quote.category ? `<span class="quote-category">${quote.category}</span>` : ''}
    </div>
  `).join('');
  
  favoritesContainer.innerHTML = html;

  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const quoteId = parseInt(this.dataset.quoteId);
      
      if (confirm('Remove this quote from your favorites?')) {
        try {
          await removeFavorite(quoteId);
          
          // Remove card with animation
          const card = this.closest('.favorite-card');
          card.style.animation = 'fadeOut 0.3s ease-out';
          
          setTimeout(async () => {
            const favorites = await fetchFavorites();
            renderFavorites(favorites);
          }, 300);
        } catch (error) {
          alert('Failed to remove favorite. Please try again.');
        }
      }
    });
  });
}

// Initialize
async function init() {
  // Show loading state
  favoritesContainer.innerHTML = '<div class="loading-spinner"></div>';
  
  const favorites = await fetchFavorites();
  renderFavorites(favorites);
  
  // Set copyright year
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

init();
