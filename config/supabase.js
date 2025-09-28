/**
 * Supabase Configuration
 * Configure your Supabase connection here
 */

// You'll need to replace these with your actual Supabase project details
const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
  anonKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'
};

export default SUPABASE_CONFIG;