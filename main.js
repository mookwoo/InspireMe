import quotes from "./quotes.js";
import QuoteDatabase from "./database/QuoteDatabase.js";
import QuoteAdmin from "./database/admin.js";
import AuthManager from "./database/auth.js";

// Initialize database
const db = new QuoteDatabase();

// Initialize authentication manager
const auth = new AuthManager();

// Import existing quotes if database is empty
if (db.getAllQuotes().length === 0) {
  console.log('Importing existing quotes to database...');
  const importedCount = db.importQuotes(quotes);
  console.log(`Imported ${importedCount} quotes successfully!`);
}

// Initialize admin interface with authentication
const admin = new QuoteAdmin(db, auth);

const categoryFilter = document.getElementById("categoryFilter");
const newQuote = document.querySelector("#newQuote");

const text = document.querySelector("#quoteText");
const author = document.querySelector("#quoteAuthor");

// Get categories from database
const categories = db.getAllCategories();

// Populate the dropdown
categories.forEach((category) => {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  categoryFilter.appendChild(option);
});

let lastDisplayedIndex = -1; // Track last displayed quote's index

function displayQuotes(filteredQuotes) {
  // Handle empty category
  if (filteredQuotes.length === 0) {
    text.textContent = "No quotes available for this category.";
    author.textContent = "";
    return;
  }

  // If only one quote exists, just display it without looping
  if (filteredQuotes.length === 1) {
    lastDisplayedIndex = 0;
    const quote = filteredQuotes[0];
    text.textContent = `${quote.text}`;
    author.textContent = `${quote.author}`;
    db.incrementViews(quote.id); // Increment view count
    return;
  }

  let newIndex;

  // Ensure we get a new quote every time
  do {
    newIndex = Math.floor(Math.random() * filteredQuotes.length);
  } while (newIndex === lastDisplayedIndex && filteredQuotes.length > 1);

  lastDisplayedIndex = newIndex;

  const randomQuote = filteredQuotes[newIndex];
  text.textContent = `${randomQuote.text}`;
  author.textContent = `${randomQuote.author}`;

  // Increment view count in database
  db.incrementViews(randomQuote.id);
}

// Get quotes based on selected category
function getFilteredQuotes() {
  const selectedCategory = categoryFilter.value;
  return db.getQuotesByCategory(selectedCategory);
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

// Initial display (show any random quote)
displayQuotes(db.getAllQuotes());

// Set the current year in the footer
const currentYear = new Date().getFullYear();
console.log(currentYear);
document.getElementById("year").textContent = `${currentYear}.`;
document.getElementById("sr-year").textContent = `Copyright © ${currentYear}`;

// Expose database for debugging (consider removing in production)
window.quoteDB = db;

// Ensure admin panel is properly secured on page load
document.addEventListener('DOMContentLoaded', () => {
  const adminSection = document.getElementById('adminSection');
  if (adminSection && !auth.isAuthenticated()) {
    adminSection.style.display = 'none';
  }
});