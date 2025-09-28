/**
 * Supabase Client Initialization
 * This file initializes the Supabase client for browser use
 */

// Configuration - replace with your actual Supabase credentials
const SUPABASE_URL = 'https://your-project-ref.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'your-anon-key-here'; // Replace with your anon key

let supabase;

// Initialize Supabase client
try {
  // Check if Supabase is loaded from CDN
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully');
  } else {
    console.warn('Supabase client not found. Please include the Supabase CDN script or check your credentials.');
    supabase = null;
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  supabase = null;
}

// Export for use in other modules
export { supabase };