import supabase from "./supabase-client.js";

// Mock data for testing without Supabase
const MOCK_ALL_QUOTES = [
  // Pending quotes
  { id: 101, text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "Wisdom", created_at: new Date().toISOString(), status: "pending" },
  { id: 102, text: "Two things are infinite: the universe and human stupidity.", author: "Albert Einstein", category: "Humor", created_at: new Date(Date.now() - 3600000).toISOString(), status: "pending" },
  { id: 103, text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu", category: "Motivation", created_at: new Date(Date.now() - 7200000).toISOString(), status: "pending" },
  { id: 104, text: "Life is really simple, but we insist on making it complicated.", author: "Confucius", category: "Life", created_at: new Date(Date.now() - 10800000).toISOString(), status: "pending" },
  
  // Approved quotes
  { id: 1, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Motivation", created_at: new Date(Date.now() - 86400000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 43200000).toISOString() },
  { id: 2, text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "Innovation", created_at: new Date(Date.now() - 172800000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 129600000).toISOString() },
  { id: 3, text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon", category: "Life", created_at: new Date(Date.now() - 259200000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 216000000).toISOString() },
  { id: 4, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "Inspiration", created_at: new Date(Date.now() - 345600000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 302400000).toISOString() },
  { id: 5, text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "Success", created_at: new Date(Date.now() - 432000000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 388800000).toISOString() },
  { id: 6, text: "The only impossible journey is the one you never begin.", author: "Tony Robbins", category: "Motivation", created_at: new Date(Date.now() - 518400000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 475200000).toISOString() },
  
  // Rejected quotes
  { id: 105, text: "This is a test quote.", author: "Test Author", category: "Test", created_at: new Date(Date.now() - 604800000).toISOString(), status: "rejected", reviewed_at: new Date(Date.now() - 561600000).toISOString(), rejection_reason: "Not inspirational enough" },
  { id: 106, text: "Spam content here.", author: "Spammer", category: "Spam", created_at: new Date(Date.now() - 691200000).toISOString(), status: "rejected", reviewed_at: new Date(Date.now() - 648000000).toISOString(), rejection_reason: "Inappropriate content" },
  { id: 107, text: "Buy now for 50% off!", author: "Marketing Bot", category: "Sales", created_at: new Date(Date.now() - 777600000).toISOString(), status: "rejected", reviewed_at: new Date(Date.now() - 734400000).toISOString(), rejection_reason: "Commercial spam" },
];

const MOCK_STATS = {
  pending: 4,
  approved: 6,
  rejected: 3,
  total: 13
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
  
  console.log('Loading quotes with status:', status);
  console.log('useMockData:', useMockData);
  console.log('MOCK_ALL_QUOTES length:', MOCK_ALL_QUOTES.length);
  
  try {
    let quotes;
    
    if (useMockData || !supabase) {
      // Filter mock data by status
      quotes = status === 'all' 
        ? MOCK_ALL_QUOTES 
        : MOCK_ALL_QUOTES.filter(q => q.status === status);
      
      console.log('Filtered quotes:', quotes.length);
      console.log('Quotes:', quotes);
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

  // Add Quote Modal handlers
  const addQuoteModal = document.getElementById('addQuoteModal');
  const addQuoteBtn = document.getElementById('addQuoteBtn');
  const closeAddModal = document.getElementById('closeAddModal');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addQuoteForm = document.getElementById('addQuoteForm');
  const adminQuoteText = document.getElementById('adminQuoteText');
  const charCount = document.querySelector('#addQuoteModal .char-count');
  const addQuoteFeedback = document.getElementById('addQuoteFeedback');

  // Open add quote modal
  addQuoteBtn.addEventListener('click', function() {
    addQuoteModal.classList.add('show');
    addQuoteModal.setAttribute('aria-hidden', 'false');
    adminQuoteText.focus();
  });

  // Close modal function
  function closeAddQuoteModal() {
    addQuoteModal.classList.remove('show');
    addQuoteModal.setAttribute('aria-hidden', 'true');
    addQuoteForm.reset();
    addQuoteFeedback.classList.add('hidden');
    charCount.textContent = '0/500';
  }

  closeAddModal.addEventListener('click', closeAddQuoteModal);
  cancelAddBtn.addEventListener('click', closeAddQuoteModal);

  // Close on outside click
  addQuoteModal.addEventListener('click', function(e) {
    if (e.target === addQuoteModal) {
      closeAddQuoteModal();
    }
  });

  // Close with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && addQuoteModal.classList.contains('show')) {
      closeAddQuoteModal();
    }
  });

  // Character counter
  adminQuoteText.addEventListener('input', function() {
    const length = this.value.length;
    charCount.textContent = `${length}/500`;
  });

  // Submit new quote
  addQuoteForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      text: adminQuoteText.value.trim(),
      author: document.getElementById('adminAuthor').value.trim(),
      category: document.getElementById('adminCategory').value,
      status: document.getElementById('adminStatus').value,
    };

    // Validate
    if (!formData.text || !formData.author || !formData.category || !formData.status) {
      showAddQuoteFeedback('Please fill in all required fields.', 'error');
      return;
    }

    // Show loading state
    const submitBtn = addQuoteForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      if (useMockData || !supabase) {
        // Mock mode - add to mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const newQuote = {
          id: MOCK_ALL_QUOTES.length + 100,
          ...formData,
          created_at: new Date().toISOString(),
          reviewed_at: formData.status === 'approved' ? new Date().toISOString() : null,
        };
        MOCK_ALL_QUOTES.unshift(newQuote);
        
        showAddQuoteFeedback('Quote added successfully! (Mock mode)', 'success');
        
        // Refresh stats and quotes
        loadStats();
        loadQuotes(currentFilter);
        
        setTimeout(() => {
          closeAddQuoteModal();
        }, 1500);
      } else {
        // Real Supabase insertion
        const { data, error } = await supabase.from('quotes').insert([formData]);

        if (error) throw error;

        showAddQuoteFeedback('Quote added successfully!', 'success');
        
        // Refresh stats and quotes
        loadStats();
        loadQuotes(currentFilter);

        setTimeout(() => {
          closeAddQuoteModal();
        }, 1500);
      }
    } catch (error) {
      console.error('Error adding quote:', error);
      showAddQuoteFeedback('Failed to add quote. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Show feedback in modal
  function showAddQuoteFeedback(message, type) {
    addQuoteFeedback.textContent = message;
    addQuoteFeedback.className = `feedback ${type}`;
    addQuoteFeedback.classList.remove('hidden');
  }

  // Initialize - load data after DOM is ready
  loadStats();
  loadQuotes('pending');
});
