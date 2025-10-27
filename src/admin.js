import supabase from "./supabase-client.js";

// Mock data for testing without Supabase
const MOCK_ALL_QUOTES = [
  { id: 101, text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "Wisdom", created_at: new Date().toISOString(), status: "pending" },
  { id: 102, text: "Two things are infinite: the universe and human stupidity.", author: "Albert Einstein", category: "Humor", created_at: new Date().toISOString(), status: "pending" },
  { id: 1, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Motivation", created_at: new Date(Date.now() - 86400000).toISOString(), status: "approved" },
  { id: 2, text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "Innovation", created_at: new Date(Date.now() - 172800000).toISOString(), status: "approved" },
  { id: 103, text: "This is a test quote.", author: "Test Author", category: "Test", created_at: new Date(Date.now() - 259200000).toISOString(), status: "rejected" },
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

// Current filter status
let currentFilter = 'pending';

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
async function loadQuotes(status = 'pending') {
  const container = document.getElementById('quotesContainer');
  currentFilter = status;
  
  try {
    let quotes;
    
    if (useMockData || !supabase) {
      // Filter mock data by status
      quotes = status === 'all' 
        ? MOCK_ALL_QUOTES 
        : MOCK_ALL_QUOTES.filter(q => q.status === status);
    } else {
      // Fetch from Supabase
      let query = supabase
        .from("quotes")
        .select("id, text, author, category, created_at, status, reviewed_at, rejection_reason")
        .order('created_at', { ascending: false });
      
      // Apply status filter if not 'all'
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      quotes = data;
    }

    if (quotes.length === 0) {
      container.innerHTML = `<p class="no-quotes">📭 No ${status === 'all' ? '' : status} quotes found.</p>`;
      return;
    }

    container.innerHTML = quotes.map(quote => `
      <div class="quote-card ${quote.status}" data-id="${quote.id}">
        <div class="quote-status-badge ${quote.status}">${quote.status}</div>
        <div class="quote-content">
          <p class="quote-text">"${quote.text}"</p>
          <p class="quote-author">— ${quote.author}</p>
          <p class="quote-meta">
            Category: ${quote.category} | 
            Submitted: ${new Date(quote.created_at).toLocaleDateString()}
            ${quote.reviewed_at ? `| Reviewed: ${new Date(quote.reviewed_at).toLocaleDateString()}` : ''}
          </p>
          ${quote.rejection_reason ? `<p class="rejection-reason">Rejection reason: ${quote.rejection_reason}</p>` : ''}
        </div>
        <div class="quote-actions">
          ${quote.status === 'pending' ? `
            <button class="btn btn-approve" onclick="approveQuote(${quote.id})">✓ Approve</button>
            <button class="btn btn-reject" onclick="rejectQuote(${quote.id})">✗ Reject</button>
          ` : quote.status === 'rejected' ? `
            <button class="btn btn-approve" onclick="approveQuote(${quote.id})">✓ Approve</button>
          ` : `
            <button class="btn btn-reject" onclick="rejectQuote(${quote.id})">✗ Reject</button>
          `}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error loading quotes:", error);
    container.innerHTML = '<p class="error">Failed to load quotes.</p>';
  }
}

// Approve quote
window.approveQuote = async function(quoteId) {
  try {
    if (useMockData || !supabase) {
      // Mock mode - update mock data
      const quote = MOCK_ALL_QUOTES.find(q => q.id === quoteId);
      if (quote) {
        quote.status = 'approved';
        quote.reviewed_at = new Date().toISOString();
      }
      
      showToast('Quote approved! (Mock mode - not saved)', 'success');
      loadStats();
      loadQuotes(currentFilter);
      return;
    }

    const { error } = await supabase.rpc('approve_quote', { quote_id: quoteId });
    
    if (error) throw error;
    
    showToast('Quote approved successfully!', 'success');
    loadStats();
    loadQuotes(currentFilter);
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
      // Mock mode - update mock data
      const quote = MOCK_ALL_QUOTES.find(q => q.id === quoteId);
      if (quote) {
        quote.status = 'rejected';
        quote.reviewed_at = new Date().toISOString();
        quote.rejection_reason = reason;
      }
      
      showToast('Quote rejected! (Mock mode - not saved)', 'success');
      loadStats();
      loadQuotes(currentFilter);
      return;
    }

    const { error } = await supabase.rpc('reject_quote', { 
      quote_id: quoteId,
      reason: reason 
    });
    
    if (error) throw error;
    
    showToast('Quote rejected', 'success');
    loadStats();
    loadQuotes(currentFilter);
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

// Tab filtering
document.addEventListener('DOMContentLoaded', function() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active state
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Load quotes for selected status
      const status = this.dataset.status;
      loadQuotes(status);
    });
  });
});

// Initialize
loadStats();
loadQuotes('pending');
