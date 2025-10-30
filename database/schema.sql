-- InspireMe Supabase Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL CHECK (length(text) > 0),
  author TEXT NOT NULL CHECK (length(author) > 0),
  category TEXT NOT NULL CHECK (length(category) > 0),
  tags TEXT[] DEFAULT '{}',
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Moderation fields
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Create categories table for better normalization (optional)
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (length(name) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category);
CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(author);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_date_added ON quotes(date_added);
CREATE INDEX IF NOT EXISTS idx_quotes_is_favorite ON quotes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_text_search ON quotes USING gin(to_tsvector('english', text || ' ' || author));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_modified = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for quotes table
CREATE TRIGGER update_quotes_updated_at 
  BEFORE UPDATE ON quotes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all quotes (public read access)
CREATE POLICY "Public quotes are viewable by everyone" 
  ON quotes FOR SELECT 
  USING (status = 'approved');

-- Policy: Allow public quote submissions (anonymous or authenticated)
CREATE POLICY "Anyone can insert quotes" 
  ON quotes FOR INSERT 
  WITH CHECK (true);

-- Policy: Users can update their own quotes
CREATE POLICY "Users can update own quotes" 
  ON quotes FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own quotes
CREATE POLICY "Users can delete own quotes" 
  ON quotes FOR DELETE 
  USING (auth.uid() = user_id);

-- Policy: Everyone can view categories
CREATE POLICY "Categories are viewable by everyone" 
  ON categories FOR SELECT 
  USING (true);

-- Policy: Authenticated users can insert categories
CREATE POLICY "Authenticated users can insert categories" 
  ON categories FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Function to search quotes with full text search
CREATE OR REPLACE FUNCTION search_quotes(search_term TEXT)
RETURNS TABLE (
  id BIGINT,
  text TEXT,
  author TEXT,
  category TEXT,
  tags TEXT[],
  date_added TIMESTAMP WITH TIME ZONE,
  last_modified TIMESTAMP WITH TIME ZONE,
  views INTEGER,
  likes INTEGER,
  is_favorite BOOLEAN,
  user_id UUID,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.text,
    q.author,
    q.category,
    q.tags,
    q.date_added,
    q.last_modified,
    q.views,
    q.likes,
    q.is_favorite,
    q.user_id,
    ts_rank(to_tsvector('english', q.text || ' ' || q.author || ' ' || q.category), plainto_tsquery('english', search_term)) as rank
  FROM quotes q
  WHERE to_tsvector('english', q.text || ' ' || q.author || ' ' || q.category) @@ plainto_tsquery('english', search_term)
    OR q.text ILIKE '%' || search_term || '%'
    OR q.author ILIKE '%' || search_term || '%'
    OR q.category ILIKE '%' || search_term || '%'
    OR search_term = ANY(q.tags)
  ORDER BY rank DESC, q.date_added DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get quote statistics
CREATE OR REPLACE FUNCTION get_quote_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalQuotes', (SELECT COUNT(*) FROM quotes),
    'totalCategories', (SELECT COUNT(DISTINCT category) FROM quotes),
    'totalFavorites', (SELECT COUNT(*) FROM quotes WHERE is_favorite = true),
    'totalViews', (SELECT COALESCE(SUM(views), 0) FROM quotes),
    'totalLikes', (SELECT COALESCE(SUM(likes), 0) FROM quotes),
    'lastUpdated', (SELECT MAX(last_modified) FROM quotes)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get all categories
CREATE OR REPLACE FUNCTION get_all_categories()
RETURNS TABLE(category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT q.category
  FROM quotes q
  WHERE q.category IS NOT NULL AND trim(q.category) != ''
  ORDER BY q.category;
END;
$$ LANGUAGE plpgsql;

-- ===== Admin/Moderation Functions =====

-- Note: For admin access to work, you'll need to:
-- 1. Create a custom claim or role for admin users in Supabase Auth
-- 2. OR use service role key (not recommended for client-side)
-- 3. OR temporarily disable RLS for testing (not recommended for production)
-- 
-- For now, admins should use the Supabase dashboard or service role key
-- to access all quotes regardless of status.

-- Function to get pending quotes for review
CREATE OR REPLACE FUNCTION get_pending_quotes()
RETURNS TABLE(
  id BIGINT,
  text TEXT,
  author TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.author, q.category, q.created_at
  FROM quotes q
  WHERE q.status = 'pending'
  ORDER BY q.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to approve a quote
CREATE OR REPLACE FUNCTION approve_quote(quote_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE quotes
  SET status = 'approved',
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = quote_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reject a quote
CREATE OR REPLACE FUNCTION reject_quote(quote_id BIGINT, reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE quotes
  SET status = 'rejected',
      reviewed_at = NOW(),
      reviewed_by = auth.uid(),
      rejection_reason = reason
  WHERE id = quote_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending', (SELECT COUNT(*) FROM quotes WHERE status = 'pending'),
    'approved', (SELECT COUNT(*) FROM quotes WHERE status = 'approved'),
    'rejected', (SELECT COUNT(*) FROM quotes WHERE status = 'rejected'),
    'total', (SELECT COUNT(*) FROM quotes)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data (optional - remove if you don't want sample data)
-- Note: Sample quotes are pre-approved
-- Note: In SQL, apostrophes are escaped by doubling them ('')
INSERT INTO quotes (text, author, category, tags, status) VALUES 
  ('The only way to do great work is to love what you do.', 'Steve Jobs', 'Motivation', ARRAY['work', 'passion', 'success'], 'approved'),
  ('Innovation distinguishes between a leader and a follower.', 'Steve Jobs', 'Innovation', ARRAY['leadership', 'innovation', 'business'], 'approved'),
  ('Life is what happens to you while you''re busy making other plans.', 'John Lennon', 'Life', ARRAY['life', 'planning', 'wisdom'], 'approved'),
  ('It''s not whether you get knocked down, it''s whether you get up.', 'Vince Lombardi', 'Motivation', ARRAY['resilience', 'perseverance'], 'approved'),
  ('Don''t watch the clock; do what it does. Keep going.', 'Sam Levenson', 'Success', ARRAY['persistence', 'time'], 'approved')
ON CONFLICT DO NOTHING;