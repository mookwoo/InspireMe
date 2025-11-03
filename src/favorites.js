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

  // Add event listeners to cards for enhanced interaction
  document.querySelectorAll('.favorite-card').forEach(card => {
    const quoteId = parseInt(card.dataset.quoteId);
    const removeBtn = card.querySelector('.remove-btn');
    
    // Touch events for swipe-to-delete on mobile
    let startX, startY, currentX, currentY;
    let isSwipeStarted = false;
    
    card.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwipeStarted = true;
    });
    
    card.addEventListener('touchmove', (e) => {
      if (!isSwipeStarted) return;
      
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
      
      const diffX = startX - currentX;
      const diffY = Math.abs(startY - currentY);
      
      // Only trigger swipe if horizontal movement is greater than vertical
      if (diffX > 50 && diffY < 100) {
        card.classList.add('swipe-left');
      } else {
        card.classList.remove('swipe-left');
      }
    });
    
    card.addEventListener('touchend', () => {
      isSwipeStarted = false;
      if (card.classList.contains('swipe-left')) {
        // Show confirmation after swipe
        showRemoveConfirmation(quoteId, card);
      }
      card.classList.remove('swipe-left');
    });
    
    // Click event for remove button
    removeBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      showRemoveConfirmation(quoteId, card);
    });
  });
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
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 1.4rem;
    z-index: 1001;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
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
}

init();
