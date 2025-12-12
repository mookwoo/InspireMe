// ===== HUGGING FACE AI TAGGING SERVICE =====
// Uses zero-shot classification to auto-tag quotes

// Your Hugging Face API token (get free at huggingface.co/settings/tokens)
// Add to your .env file: VITE_HUGGINGFACE_TOKEN=your_token_here
const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN || '';

// Model for zero-shot classification
const CLASSIFICATION_MODEL = 'facebook/bart-large-mnli';
const API_URL = `https://router.huggingface.co/hf-inference/models/${CLASSIFICATION_MODEL}`;

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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({
        inputs: quoteText,
        parameters: {
          candidate_labels: candidateLabels,
          multi_label: true
        },
        options: {
          wait_for_model: true  // Wait for model to load instead of returning 503
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HF API error:', response.status, errorText);
      
      // Handle model loading (Hugging Face returns 503 while model is loading)
      if (response.status === 503) {
        return {
          tags: [],
          scores: [],
          error: 'AI model is loading. Please try again in 20-30 seconds.',
          isLoading: true,
          estimatedTime: 20
        };
      }
      
      if (response.status === 401) {
        return {
          tags: [],
          scores: [],
          error: 'Invalid API token. Please check your VITE_HUGGINGFACE_TOKEN.'
        };
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both array format (new API) and object format (old API)
    let labels, scores;
    
    if (Array.isArray(data)) {
      // New API format: [{label: "x", score: 0.9}, ...]
      labels = data.map(item => item.label);
      scores = data.map(item => item.score);
    } else if (data.labels && data.scores) {
      // Old API format: {labels: [...], scores: [...]}
      labels = data.labels;
      scores = data.scores;
    } else {
      console.error('Unexpected API response:', data);
      return {
        tags: [],
        scores: [],
        error: 'Unexpected response from AI service.'
      };
    }
    
    // Extract labels that meet confidence threshold
    const results = [];
    for (let i = 0; i < labels.length; i++) {
      if (scores[i] >= CONFIDENCE_THRESHOLD) {
        results.push({
          tag: labels[i],
          score: scores[i]
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
    
    // Check if it's a network/CORS error
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return {
        tags: [],
        scores: [],
        error: 'Network error. The AI service may be temporarily unavailable.'
      };
    }
    
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
