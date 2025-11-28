// ===== INTELLIGENT TAG SUGGESTION SYSTEM =====
// Shared module for tag suggestion functionality

// Comprehensive tag database organized by themes
export const TAG_DATABASE = {
  // Emotion-based tags
  emotions: ['happiness', 'joy', 'sadness', 'anger', 'fear', 'love', 'hope', 'peace', 'gratitude', 'compassion'],
  
  // Action-based tags
  actions: ['change', 'growth', 'learning', 'achievement', 'persistence', 'courage', 'action', 'effort', 'practice'],
  
  // Motivation & Success
  motivation: ['motivation', 'inspiration', 'success', 'goals', 'determination', 'ambition', 'drive', 'excellence', 'achievement', 'winning'],
  
  // Personal Development
  development: ['self-improvement', 'mindfulness', 'wisdom', 'knowledge', 'education', 'growth', 'development', 'potential', 'transformation'],
  
  // Life & Philosophy
  philosophy: ['life', 'philosophy', 'meaning', 'purpose', 'existence', 'truth', 'reality', 'perspective', 'mindset'],
  
  // Work & Career
  career: ['career', 'work', 'leadership', 'teamwork', 'innovation', 'entrepreneurship', 'business', 'productivity', 'efficiency'],
  
  // Relationships
  relationships: ['friendship', 'family', 'relationships', 'connection', 'trust', 'communication', 'empathy', 'understanding'],
  
  // Time & Future
  time: ['future', 'present', 'past', 'time', 'now', 'moment', 'tomorrow', 'today', 'forever'],
  
  // Challenges
  challenges: ['adversity', 'struggle', 'failure', 'obstacles', 'challenge', 'difficulty', 'hardship', 'resilience', 'overcoming']
};

// Category-specific tag suggestions
export const CATEGORY_TAGS = {
  'Motivation': ['inspiration', 'determination', 'drive', 'ambition', 'goals', 'success', 'achievement', 'perseverance'],
  'Success': ['achievement', 'excellence', 'winning', 'goals', 'ambition', 'growth', 'progress', 'victory'],
  'Life': ['wisdom', 'experience', 'journey', 'perspective', 'meaning', 'purpose', 'existence', 'living'],
  'Love': ['romance', 'affection', 'heart', 'passion', 'devotion', 'connection', 'soul', 'relationship'],
  'Wisdom': ['knowledge', 'insight', 'understanding', 'truth', 'philosophy', 'enlightenment', 'learning', 'sage'],
  'Happiness': ['joy', 'contentment', 'bliss', 'gratitude', 'pleasure', 'delight', 'cheerfulness', 'positivity'],
  'Inspiration': ['creativity', 'imagination', 'vision', 'dreams', 'aspiration', 'encouragement', 'uplift', 'empowerment'],
  'Innovation': ['creativity', 'invention', 'progress', 'technology', 'change', 'transformation', 'breakthrough', 'pioneering'],
  'Courage': ['bravery', 'strength', 'fearlessness', 'boldness', 'valor', 'heroism', 'confidence', 'determination']
};

// Keywords that suggest specific tags
export const KEYWORD_MAPPINGS = {
  'dream': ['dreams', 'aspiration', 'vision', 'goals', 'future'],
  'work': ['effort', 'dedication', 'labor', 'career', 'productivity'],
  'fail': ['failure', 'learning', 'resilience', 'perseverance', 'growth'],
  'succeed': ['success', 'achievement', 'victory', 'winning', 'excellence'],
  'love': ['affection', 'passion', 'heart', 'romance', 'devotion'],
  'friend': ['friendship', 'companionship', 'relationships', 'connection', 'loyalty'],
  'learn': ['learning', 'education', 'knowledge', 'growth', 'wisdom'],
  'change': ['transformation', 'evolution', 'progress', 'adaptation', 'growth'],
  'time': ['moment', 'present', 'future', 'now', 'eternity'],
  'life': ['existence', 'living', 'journey', 'experience', 'vitality'],
  'happy': ['happiness', 'joy', 'contentment', 'pleasure', 'bliss'],
  'strong': ['strength', 'power', 'resilience', 'fortitude', 'endurance'],
  'believe': ['faith', 'confidence', 'trust', 'conviction', 'certainty'],
  'beautiful': ['beauty', 'aesthetic', 'elegance', 'grace', 'charm'],
  'create': ['creativity', 'innovation', 'imagination', 'invention', 'artistry']
};

// Famous authors and their associated tags
const FAMOUS_AUTHORS = {
  'steve jobs': ['technology', 'innovation', 'business'],
  'albert einstein': ['science', 'genius', 'physics'],
  'maya angelou': ['poetry', 'empowerment', 'resilience'],
  'nelson mandela': ['freedom', 'justice', 'leadership'],
  'martin luther king': ['equality', 'justice', 'peace'],
  'buddha': ['mindfulness', 'meditation', 'enlightenment'],
  'confucius': ['wisdom', 'philosophy', 'ancient']
};

/**
 * Analyze quote text and generate intelligent tag suggestions
 * @param {string} quoteText - The quote text to analyze
 * @param {string} author - The author name
 * @param {string} category - The quote category
 * @param {string[]} selectedTags - Already selected tags to filter out
 * @returns {string[]} Array of suggested tags
 */
export function generateTagSuggestions(quoteText, author, category, selectedTags = []) {
  const suggestions = new Set();
  const lowerText = quoteText.toLowerCase();
  
  // 1. Add category-specific tags
  if (category && CATEGORY_TAGS[category]) {
    CATEGORY_TAGS[category].slice(0, 3).forEach(tag => suggestions.add(tag));
  }
  
  // 2. Analyze keywords in quote text
  Object.entries(KEYWORD_MAPPINGS).forEach(([keyword, tags]) => {
    if (lowerText.includes(keyword)) {
      tags.slice(0, 2).forEach(tag => suggestions.add(tag));
    }
  });
  
  // 3. Check for thematic keywords
  Object.entries(TAG_DATABASE).forEach(([theme, tags]) => {
    tags.forEach(tag => {
      if (lowerText.includes(tag)) {
        suggestions.add(tag);
        // Add related tags from the same theme
        tags.slice(0, 2).forEach(relatedTag => {
          if (relatedTag !== tag) suggestions.add(relatedTag);
        });
      }
    });
  });
  
  // 4. Check quote length and sentiment for additional tags
  if (quoteText.length < 100) {
    suggestions.add('short');
    suggestions.add('concise');
  }
  
  if (lowerText.includes('never') || lowerText.includes('always') || lowerText.includes('forever')) {
    suggestions.add('timeless');
    suggestions.add('eternal');
  }
  
  if (lowerText.includes('you') || lowerText.includes('your')) {
    suggestions.add('personal');
    suggestions.add('introspective');
  }
  
  // 5. Detect famous authors and add relevant tags
  const lowerAuthor = author.toLowerCase();
  Object.entries(FAMOUS_AUTHORS).forEach(([name, tags]) => {
    if (lowerAuthor.includes(name)) {
      tags.forEach(tag => suggestions.add(tag));
    }
  });
  
  // Return top 8 suggestions, excluding already selected tags
  return Array.from(suggestions)
    .filter(tag => !selectedTags.includes(tag))
    .slice(0, 8);
}

/**
 * Create and render tag suggestion buttons
 * @param {string[]} suggestions - Array of tag suggestions
 * @param {HTMLElement} container - Container element to render suggestions into
 */
export function renderTagSuggestions(suggestions, container) {
  if (!container) return;
  
  container.innerHTML = '';
  suggestions.forEach(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggested-tag';
    button.setAttribute('data-tag', tag);
    
    const span = document.createElement('span');
    span.textContent = tag;
    button.appendChild(span);
    
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    
    const line1 = document.createElementNS(svgNS, "line");
    line1.setAttribute("x1", "12");
    line1.setAttribute("y1", "5");
    line1.setAttribute("x2", "12");
    line1.setAttribute("y2", "19");
    svg.appendChild(line1);
    
    const line2 = document.createElementNS(svgNS, "line");
    line2.setAttribute("x1", "5");
    line2.setAttribute("y1", "12");
    line2.setAttribute("x2", "19");
    line2.setAttribute("y2", "12");
    svg.appendChild(line2);
    
    button.appendChild(svg);
    container.appendChild(button);
  });
}

/**
 * Render selected tags with remove buttons
 * @param {string[]} tags - Array of selected tags
 * @param {HTMLElement} container - Container element to render tags into
 */
export function renderSelectedTags(tags, container) {
  if (!container) return;
  
  // Clear the container
  container.innerHTML = '';

  tags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'selected-tag';

    // Tag text
    const tagText = document.createTextNode(tag);
    span.appendChild(tagText);

    // Remove button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'remove-tag';
    button.setAttribute('data-tag', tag);
    button.setAttribute('aria-label', `Remove ${tag} tag`);

    // SVG icon
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");

    const line1 = document.createElementNS(svgNS, "line");
    line1.setAttribute("x1", "18");
    line1.setAttribute("y1", "6");
    line1.setAttribute("x2", "6");
    line1.setAttribute("y2", "18");
    svg.appendChild(line1);

    const line2 = document.createElementNS(svgNS, "line");
    line2.setAttribute("x1", "6");
    line2.setAttribute("y1", "6");
    line2.setAttribute("x2", "18");
    line2.setAttribute("y2", "18");
    svg.appendChild(line2);

    button.appendChild(svg);
    span.appendChild(button);

    container.appendChild(span);
  });
}
