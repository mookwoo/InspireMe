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
  { id: 7, text: "The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.", author: "Audrey Hepburn", category: "Love", created_at: new Date(Date.now() - 604800000).toISOString(), status: "approved", reviewed_at: new Date(Date.now() - 561600000).toISOString() },
  
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

// Check if Supabase is configured - declare early to avoid hoisting issues
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
const useMockData = !hasSupabaseConfig;

// Fetch and populate category dropdown for admin add quote form
async function populateAdminCategoryDropdown() {
  try {
    const adminCategory = document.getElementById('adminCategory');
    if (!adminCategory) return;
    
    let categories;
    
    if (useMockData || !supabase) {
      // Get categories from mock data
      categories = [...new Set(MOCK_ALL_QUOTES.map(q => q.category))];
    } else {
      // Fetch from database
      const { data, error } = await supabase
        .from("quotes")
        .select("category")
        .eq("status", "approved")
        .neq("category", null);
      
      if (error) throw error;
      categories = [...new Set(data.map(q => q.category))];
    }
    
    // Sort alphabetically
    const sortedCategories = categories.filter(cat => cat && cat.trim() !== "").sort((a, b) => a.localeCompare(b));
    
    // Populate dropdown
    sortedCategories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      adminCategory.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating categories:', error);
  }
}

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
      <div class="quote-card ${quote.status}" data-quote-id="${quote.id}">
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
            <button class="btn btn-approve" data-action="approve">✓ Approve</button>
            <button class="btn btn-reject" data-action="reject">✗ Reject</button>
          ` : quote.status === 'rejected' ? `
            <button class="btn btn-approve" data-action="approve">✓ Approve</button>
          ` : `
            <button class="btn btn-reject" data-action="reject">✗ Reject</button>
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
async function approveQuote(quoteId) {
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
}

// Reject quote
let pendingRejectQuoteId = null;

function showRejectModal(quoteId) {
  pendingRejectQuoteId = quoteId;
  const rejectModal = document.getElementById('rejectModal');
  const rejectionReason = document.getElementById('rejectionReason');
  
  rejectModal.classList.add('show');
  rejectModal.setAttribute('aria-hidden', 'false');
  rejectionReason.focus();
}

async function submitReject(reason) {
  const quoteId = pendingRejectQuoteId;
  
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
      // Note: Not awaited intentionally - non-blocking UI update after user action
      loadStats();
      loadQuotes(currentFilter);
      return;
    }

    const { error } = await supabase.rpc('reject_quote', { 
      quote_id: quoteId,
      reason: reason || null
    });
    
    if (error) throw error;
    
    showToast('Quote rejected!', 'success');
    // Note: Not awaited intentionally - non-blocking UI update after user action
    loadStats();
    loadQuotes(currentFilter);
  } catch (error) {
    console.error("Error rejecting quote:", error);
    showToast('Failed to reject quote', 'error');
  }
}

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
document.addEventListener('DOMContentLoaded', async function() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active state
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Load quotes for selected status
      // Note: Not awaited intentionally - non-blocking UI update
      const status = this.dataset.status;
      loadQuotes(status);
    });
  });

  // Event delegation for approve/reject buttons
  const quotesContainer = document.getElementById('quotesContainer');
  quotesContainer.addEventListener('click', function(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const quoteCard = button.closest('.quote-card');
    if (!quoteCard) return;

    const quoteId = parseInt(quoteCard.dataset.quoteId, 10);
    if (isNaN(quoteId)) {
      console.error('Invalid quote ID');
      return;
    }

    const action = button.dataset.action;
    
    if (action === 'approve') {
      approveQuote(quoteId);
    } else if (action === 'reject') {
      showRejectModal(quoteId);
    }
  });

  // Reject Quote Modal handlers
  const rejectModal = document.getElementById('rejectModal');
  const closeRejectModal = document.getElementById('closeRejectModal');
  const cancelRejectBtn = document.getElementById('cancelRejectBtn');
  const rejectQuoteForm = document.getElementById('rejectQuoteForm');
  const rejectionReason = document.getElementById('rejectionReason');
  const rejectCharCount = document.querySelector('#rejectModal .char-count');
  const rejectFeedback = document.getElementById('rejectFeedback');

  // Close reject modal function
  function closeRejectQuoteModal() {
    rejectModal.classList.remove('show');
    rejectModal.setAttribute('aria-hidden', 'true');
    rejectQuoteForm.reset();
    rejectFeedback.classList.add('hidden');
    rejectCharCount.textContent = '0/500';
    pendingRejectQuoteId = null;
  }

  closeRejectModal.addEventListener('click', closeRejectQuoteModal);
  cancelRejectBtn.addEventListener('click', closeRejectQuoteModal);

  // Close on outside click
  rejectModal.addEventListener('click', function(e) {
    if (e.target === rejectModal) {
      closeRejectQuoteModal();
    }
  });

  // Character counter for rejection reason
  rejectionReason.addEventListener('input', function() {
    const length = this.value.length;
    rejectCharCount.textContent = `${length}/500`;
  });

  // Submit rejection
  rejectQuoteForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const reason = rejectionReason.value.trim();

    // Show loading state
    const submitBtn = rejectQuoteForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Rejecting...';

    try {
      await submitReject(reason);
      closeRejectQuoteModal();
    } catch (error) {
      console.error('Error in reject form:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Update Escape key handler to handle both modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (addQuoteModal.classList.contains('show')) {
        closeAddQuoteModal();
      } else if (rejectModal.classList.contains('show')) {
        closeRejectQuoteModal();
      }
    }
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

  // Character counter
  adminQuoteText.addEventListener('input', function() {
    const length = this.value.length;
    charCount.textContent = `${length}/500`;
  });

  // Submit new quote
  addQuoteForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const tagsInput = document.getElementById('adminTags').value.trim();
    const tagsArray = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const formData = {
      text: adminQuoteText.value.trim(),
      author: document.getElementById('adminAuthor').value.trim(),
      category: document.getElementById('adminCategory').value,
      status: document.getElementById('adminStatus').value,
      tags: tagsArray,
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
        const { error } = await supabase.from('quotes').insert([formData]);

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
  await loadStats();
  await loadQuotes('pending');
  
  // Populate category dropdown
  await populateAdminCategoryDropdown();
});
