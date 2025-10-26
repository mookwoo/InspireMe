import supabase from "./supabase-client.js";

const categoryFilter = document.getElementById("categoryFilter");
const newQuote = document.querySelector("#newQuote");

const text = document.querySelector("#quoteText");
const author = document.querySelector("#quoteAuthor");

// data holders for quotes and categories fetched from Supabase
let quotes = [];
let categories = [];

let lastDisplayedIndex = -1; // Track last displayed quote's index

// Fetch quotes from Supabase
async function fetchQuotes() {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, text, author, category");

  if (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }

  // Return the data directly since category is now stored as text
  return data.map((q) => ({
    id: q.id,
    text: q.text,
    author: q.author,
    category: q.category || "Uncategorized",
  }));
}

// fetch categories from Supabase
async function fetchCategories() {
  const { data, error } = await supabase
    .from("quotes")
    .select("category")
    .neq("category", null);

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  // Get unique categories
  const uniqueCategories = [...new Set(data.map(q => q.category))];
  return uniqueCategories.filter(cat => cat && cat.trim() !== "");
}

// populating the dropdown with categories

function populateDropdown(categories) {
  // Clear existing options except "All"
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach((category) => {
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
    return; // Stop execution here
  }

  // If only one quote exists, just display it without looping
  if (filteredQuotes.length === 1) {
    lastDisplayedIndex = 0;
    text.innerText = `${filteredQuotes[0].text}`;
    author.innerText = `${filteredQuotes[0].author}`;
    return; // Stop execution here
  }

  let newIndex; // store the index of the new random quote

  // Ensure we get a new quote every time
  do {
    newIndex = Math.floor(Math.random() * filteredQuotes.length);
  } while (newIndex === lastDisplayedIndex && filteredQuotes.length > 1);

  lastDisplayedIndex = newIndex;

  const randomQuote = filteredQuotes[newIndex];
  text.innerText = `${randomQuote.text}`;
  author.innerText = `${randomQuote.author}`;
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

  const formData = {
    text: quoteTextInput.value.trim(),
    author: document.getElementById("authorInput").value.trim(),
    category: document.getElementById("categoryInput").value,
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
    const { data, error } = await supabase.from("quotes").insert([formData]);

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

  populateDropdown(categories);
  displayQuotes(quotes);
}

init();

