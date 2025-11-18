import supabase from "./supabase-client.js";
import { getUserId } from "./user-utils.js";

const favoritesContainer = document.getElementById('favoritesContainer');
const emptyState = document.getElementById('emptyState');
const yearElement = document.getElementById('year');
const searchInput = document.getElementById('searchInput');
const compactToggle = document.getElementById('compactToggle');
const favoritesControls = document.getElementById('favoritesControls');
const favoritesStats = document.getElementById('favoritesStats');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Pagination state
let currentPage = 1;
const itemsPerPage = 12;
let allFavorites = [];
let filteredFavorites = [];

// Swipe gesture constants
const SWIPE_THRESHOLD_X = 50; // Minimum horizontal distance to trigger swipe
const SWIPE_THRESHOLD_Y = 100; // Maximum vertical distance allowed for horizontal swipe

// HTML escaping utility to prevent XSS attacks
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
function renderFavorites(favorites, preservePage = false) {
  allFavorites = favorites;
  filteredFavorites = favorites;
  if (!preservePage) {
    currentPage = 1;
  }
  
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    favoritesControls.style.display = 'none';
    pagination.style.display = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  favoritesControls.style.display = 'flex';
  
  // Update stats
  favoritesStats.textContent = `${favorites.length} favorite${favorites.length !== 1 ? 's' : ''}`;
  
  renderPage();
}

// Render current page
function renderPage() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filteredFavorites.slice(startIndex, endIndex);
  
  const html = pageItems.map(quote => `
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
      <p class="quote-text">"${escapeHtml(quote.text)}"</p>
      <p class="quote-author">— ${escapeHtml(quote.author)}</p>
      ${quote.category ? `<span class="quote-category">${escapeHtml(quote.category)}</span>` : ''}
    </div>
  `).join('');
  
  favoritesContainer.innerHTML = html;

  // Event listeners are now handled via event delegation outside this function.
  
  // Update pagination
  updatePagination();
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(filteredFavorites.length / itemsPerPage);
  
  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }
  
  pagination.style.display = 'flex';
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
}

// Show custom confirmation modal
function showRemoveConfirmation(quoteId, cardElement) {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = `
    <div class="confirm-content">
      <h3>Remove from Favorites?</h3>
      <p>This quote will no longer appear in your favorites collection.</p>
      <div class="confirm-actions">
        <button class="confirm-btn cancel">Cancel</button>
        <button class="confirm-btn delete">Remove</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle modal actions
  const cancelBtn = modal.querySelector('.cancel');
  const deleteBtn = modal.querySelector('.delete');
  
  const closeModal = () => {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => modal.remove(), 300);
  };
  
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  deleteBtn.addEventListener('click', async () => {
    closeModal();
    await handleRemoveFavorite(quoteId, cardElement);
  });
}

// Handle the actual removal with animation
async function handleRemoveFavorite(quoteId, cardElement) {
  try {
    // Start removal animation
    cardElement.classList.add('removing');
    
    // Remove from database
    const success = await removeFavorite(quoteId);
    
    if (success) {
      // Wait for animation to complete, then refresh the list
      setTimeout(async () => {
        const favorites = await fetchFavorites();
        renderFavorites(favorites);
      }, 400);
    } else {
      // If removal failed, revert animation
      cardElement.classList.remove('removing');
      showErrorMessage('Failed to remove favorite. Please try again.');
    }
  } catch (error) {
    cardElement.classList.remove('removing');
    showErrorMessage('Failed to remove favorite. Please try again.');
  }
}

// Show error message
function showErrorMessage(message) {
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
  
  // Event delegation for remove buttons
  favoritesContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    if (removeBtn) {
      const quoteId = parseInt(removeBtn.dataset.quoteId);
      const cardElement = removeBtn.closest('.favorite-card');
      if (cardElement) {
        showRemoveConfirmation(quoteId, cardElement);
      }
    }
  });
  
  // Search functionality
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
          filteredFavorites = allFavorites;
        } else {
          filteredFavorites = allFavorites.filter(quote => 
            quote.text.toLowerCase().includes(searchTerm) ||
            quote.author.toLowerCase().includes(searchTerm) ||
            (quote.category && quote.category.toLowerCase().includes(searchTerm))
          );
        }
        
        currentPage = 1;
        favoritesStats.textContent = `${filteredFavorites.length} of ${allFavorites.length} favorite${allFavorites.length !== 1 ? 's' : ''}`;
        renderPage();
      }, 300); // 300ms debounce
    });
  }
  
  // Compact view toggle
  if (compactToggle) {
    // Ensure aria-pressed is initialized to "false"
    if (!compactToggle.hasAttribute('aria-pressed')) {
      compactToggle.setAttribute('aria-pressed', 'false');
    }
    compactToggle.addEventListener('click', () => {
      const isActive = favoritesContainer.classList.toggle('compact');
      compactToggle.classList.toggle('active');
      compactToggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }
  
  // Pagination controls
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredFavorites.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}

init();
