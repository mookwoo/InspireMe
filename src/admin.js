import supabase from "./supabase-client.js";

// Mock data for testing without Supabase
const MOCK_PENDING_QUOTES = [
  { id: 101, text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "Wisdom", created_at: new Date().toISOString() },
  { id: 102, text: "Two things are infinite: the universe and human stupidity.", author: "Albert Einstein", category: "Humor", created_at: new Date().toISOString() },
];

const MOCK_STATS = {
  pending: 2,
  approved: 8,
  rejected: 1,
  total: 11
};

// Check if Supabase is configured
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
let useMockData = !hasSupabaseConfig;

if (useMockData) {
  console.log("🎭 Running in MOCK MODE - Admin Panel");
}

// Load stats
async function loadStats() {
  try {
    if (useMockData || !supabase) {
      displayStats(MOCK_STATS);
      return;
    }

    const { data, error } = await supabase.rpc('get_moderation_stats');
    
    if (error) throw error;
    
    displayStats(data);
  } catch (error) {
    console.error("Error loading stats:", error);
    displayStats(MOCK_STATS);
  }
}

function displayStats(stats) {
  document.getElementById('pendingCount').textContent = stats.pending;
  document.getElementById('approvedCount').textContent = stats.approved;
  document.getElementById('rejectedCount').textContent = stats.rejected;
  document.getElementById('totalCount').textContent = stats.total;
}

// Load pending quotes
async function loadPendingQuotes() {
  const container = document.getElementById('pendingQuotes');
  
  try {
    let pendingQuotes;
    
    if (useMockData || !supabase) {
      pendingQuotes = MOCK_PENDING_QUOTES;
    } else {
      const { data, error } = await supabase.rpc('get_pending_quotes');
      
      if (error) throw error;
      
      pendingQuotes = data;
    }

    if (pendingQuotes.length === 0) {
      container.innerHTML = '<p class="no-quotes">🎉 No pending quotes to review!</p>';
      return;
    }

    container.innerHTML = pendingQuotes.map(quote => `
      <div class="quote-card" data-id="${quote.id}">
        <div class="quote-content">
          <p class="quote-text">"${quote.text}"</p>
          <p class="quote-author">— ${quote.author}</p>
          <p class="quote-meta">Category: ${quote.category} | Submitted: ${new Date(quote.created_at).toLocaleDateString()}</p>
        </div>
        <div class="quote-actions">
          <button class="btn btn-approve" onclick="approveQuote(${quote.id})">✓ Approve</button>
          <button class="btn btn-reject" onclick="rejectQuote(${quote.id})">✗ Reject</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error loading pending quotes:", error);
    container.innerHTML = '<p class="error">Failed to load pending quotes.</p>';
  }
}

// Approve quote
window.approveQuote = async function(quoteId) {
  try {
    if (useMockData || !supabase) {
      // Mock mode - just remove from list
      const card = document.querySelector(`[data-id="${quoteId}"]`);
      card.style.opacity = '0.5';
      setTimeout(() => {
        card.remove();
        showToast('Quote approved! (Mock mode - not saved)', 'success');
        loadStats();
        if (document.querySelectorAll('.quote-card').length === 0) {
          loadPendingQuotes();
        }
      }, 300);
      return;
    }

    const { error } = await supabase.rpc('approve_quote', { quote_id: quoteId });
    
    if (error) throw error;
    
    showToast('Quote approved successfully!', 'success');
    loadStats();
    loadPendingQuotes();
  } catch (error) {
    console.error("Error approving quote:", error);
    showToast('Failed to approve quote', 'error');
  }
};

// Reject quote
window.rejectQuote = async function(quoteId) {
  const reason = prompt('Reason for rejection (optional):');
  
  try {
    if (useMockData || !supabase) {
      // Mock mode - just remove from list
      const card = document.querySelector(`[data-id="${quoteId}"]`);
      card.style.opacity = '0.5';
      setTimeout(() => {
        card.remove();
        showToast('Quote rejected! (Mock mode - not saved)', 'success');
        loadStats();
        if (document.querySelectorAll('.quote-card').length === 0) {
          loadPendingQuotes();
        }
      }, 300);
      return;
    }

    const { error } = await supabase.rpc('reject_quote', { 
      quote_id: quoteId,
      reason: reason 
    });
    
    if (error) throw error;
    
    showToast('Quote rejected', 'success');
    loadStats();
    loadPendingQuotes();
  } catch (error) {
    console.error("Error rejecting quote:", error);
    showToast('Failed to reject quote', 'error');
  }
};

// Show toast notification
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize
loadStats();
loadPendingQuotes();
