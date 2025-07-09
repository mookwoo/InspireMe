import quotes from "./quotes.js"

const categoryFilter = document.getElementById("categoryFilter");
const newQuote = document.querySelector("#newQuote");

const text = document.querySelector("#quoteText");
const author = document.querySelector("#quoteAuthor");

// Extracting unique categories
const categories = [...new Set(quotes.map((q) => q.category))];

// Populating the dropdown
categories.forEach((category) => {
  let option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  categoryFilter.appendChild(option);
});

let lastDisplayedIndex = -1; // Track last displayed quote's index

function displayQuotes(filteredQuotes) {
  // Handle empty category
  if (filteredQuotes.length === 0) {
    text.textContent = "No quotes available for this category.";
    author.textContent= "";
    return; // Stop execution here
    }

  // If only one quote exists, just display it without looping
  if (filteredQuotes.length === 1) {
    lastDisplayedIndex = 0;
    text.textContent = `${filteredQuotes[0].text}`;
    author.textContent = `${filteredQuotes[0].author}`;
    return; // Stop execution here    
  }

  let newIndex; // store the index of the new random quote

  // Ensure we get a new quote every time
  do {
    newIndex = Math.floor(Math.random() * filteredQuotes.length);
  } while (newIndex === lastDisplayedIndex && filteredQuotes.length > 1);

  lastDisplayedIndex = newIndex;
   
  const randomQuote = filteredQuotes[newIndex];
  text.textContent = `${randomQuote.text}`;
  author.textContent = `${randomQuote.author}`;
}

//function to get quotes based on selected category
function getFilteredQuotes() {
  const selectedCategory = categoryFilter.value;
  return selectedCategory === "all" 
  ? quotes
  : quotes.filter(q => q.category === selectedCategory);
}

// Event listener for category selection
categoryFilter.addEventListener("change", function () {
  const filteredQuotes = getFilteredQuotes();
  displayQuotes(filteredQuotes)
});

newQuote.addEventListener("click", function () {
  const filteredQuotes = getFilteredQuotes();
  displayQuotes(filteredQuotes);
});


displayQuotes(quotes); //Initial display (show any random quote)
