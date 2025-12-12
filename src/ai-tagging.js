// ===== HUGGING FACE AI TAGGING SERVICE =====
// Uses zero-shot classification to auto-tag quotes

// Your Hugging Face API token (get free at huggingface.co/settings/tokens)
// Add to your .env file: VITE_HUGGINGFACE_TOKEN=your_token_here
const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN || '';

// Model for zero-shot classification
const CLASSIFICATION_MODEL = 'facebook/bart-large-mnli';
const API_URL = `https://api-inference.huggingface.co/models/${CLASSIFICATION_MODEL}`;

// All possible tags for classification (these match your existing tag database)
export const AI_TAG_CANDIDATES = [
  // Core themes
  'motivation', 'inspiration', 'success', 'wisdom', 'happiness',
  'love', 'courage', 'perseverance', 'growth', 'change',
  
  // Emotions
  'hope', 'gratitude', 'peace', 'joy', 'compassion',
  
  // Life topics
  'life', 'relationships', 'friendship', 'family', 'leadership',
  
  // Personal development
  'learning', 'mindfulness', 'self-improvement', 'confidence', 'determination',
  
  // Career & work
  'career', 'business', 'innovation', 'creativity', 'productivity',
  
  // Challenges
  'resilience', 'adversity', 'failure', 'overcoming', 'strength',
  
  // Philosophy
  'philosophy', 'truth', 'meaning', 'purpose', 'perspective'
];

// Minimum confidence threshold (0-1) for including a tag
const CONFIDENCE_THRESHOLD = 0.3;

// Maximum tags to return
const MAX_TAGS = 5;

/**
 * Check if Hugging Face API is configured
 * @returns {boolean}
 */
export function isAITaggingAvailable() {
  return Boolean(HF_TOKEN);
}

/**
 * Generate AI-powered tag suggestions using Hugging Face zero-shot classification
 * @param {string} quoteText - The quote text to analyze
 * @param {string[]} candidateLabels - Optional custom labels (defaults to AI_TAG_CANDIDATES)
 * @returns {Promise<{tags: string[], scores: number[], error?: string}>}
 */
export async function generateAITags(quoteText, candidateLabels = AI_TAG_CANDIDATES) {
  if (!HF_TOKEN) {
    return {
      tags: [],
      scores: [],
      error: 'Hugging Face API token not configured. Add VITE_HUGGINGFACE_TOKEN to your .env file.'
    };
  }

  if (!quoteText || quoteText.trim().length < 10) {
    return {
      tags: [],
      scores: [],
      error: 'Quote text is too short for analysis.'
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: quoteText,
        parameters: {
          candidate_labels: candidateLabels,
          multi_label: true  // Allow multiple tags
        }
      })
    });

    if (!response.ok) {
      // Handle model loading (Hugging Face returns 503 while model is loading)
      if (response.status === 503) {
        const data = await response.json();
        const waitTime = data.estimated_time || 20;
        return {
          tags: [],
          scores: [],
          error: `AI model is loading. Please try again in ${Math.ceil(waitTime)} seconds.`,
          isLoading: true,
          estimatedTime: waitTime
        };
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract labels that meet confidence threshold
    const results = [];
    for (let i = 0; i < data.labels.length; i++) {
      if (data.scores[i] >= CONFIDENCE_THRESHOLD) {
        results.push({
          tag: data.labels[i],
          score: data.scores[i]
        });
      }
    }

    // Sort by score and take top tags
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, MAX_TAGS);

    return {
      tags: topResults.map(r => r.tag),
      scores: topResults.map(r => r.score),
      error: null
    };

  } catch (error) {
    console.error('AI tagging error:', error);
    return {
      tags: [],
      scores: [],
      error: error.message || 'Failed to generate AI tags.'
    };
  }
}

/**
 * Generate AI tags with retry for model loading
 * @param {string} quoteText - The quote text to analyze
 * @param {number} maxRetries - Maximum retries (default 2)
 * @returns {Promise<{tags: string[], scores: number[], error?: string}>}
 */
export async function generateAITagsWithRetry(quoteText, maxRetries = 2) {
  let lastResult;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await generateAITags(quoteText);
    
    if (!lastResult.isLoading || attempt === maxRetries) {
      return lastResult;
    }
    
    // Wait for model to load
    const waitTime = Math.min(lastResult.estimatedTime || 5, 30) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  return lastResult;
}

/**
 * Combine AI tags with keyword-based suggestions
 * @param {string} quoteText - The quote text
 * @param {string} author - The author name
 * @param {string} category - The quote category
 * @param {string[]} selectedTags - Already selected tags
 * @param {function} keywordSuggestionFn - The keyword-based suggestion function
 * @returns {Promise<{aiTags: string[], keywordTags: string[], combined: string[]}>}
 */
export async function getHybridTagSuggestions(quoteText, author, category, selectedTags, keywordSuggestionFn) {
  // Get keyword-based suggestions immediately
  const keywordTags = keywordSuggestionFn(quoteText, author, category, selectedTags);
  
  // If AI is not available, just return keyword tags
  if (!isAITaggingAvailable()) {
    return {
      aiTags: [],
      keywordTags,
      combined: keywordTags,
      aiError: 'AI tagging not configured'
    };
  }

  // Get AI suggestions
  const aiResult = await generateAITags(quoteText);
  
  if (aiResult.error) {
    return {
      aiTags: [],
      keywordTags,
      combined: keywordTags,
      aiError: aiResult.error
    };
  }

  // Combine and deduplicate (AI tags first, as they're more relevant)
  const combined = [...new Set([...aiResult.tags, ...keywordTags])]
    .filter(tag => !selectedTags.includes(tag))
    .slice(0, 10);

  return {
    aiTags: aiResult.tags,
    keywordTags,
    combined,
    aiError: null
  };
}
