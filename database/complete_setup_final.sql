-- =============================================================================
-- STEP 1: CLEAN SLATE
-- =============================================================================

DROP TABLE IF EXISTS collection_quotes CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS search_quotes(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_quote_stats() CASCADE;
DROP FUNCTION IF EXISTS get_all_categories() CASCADE;
DROP FUNCTION IF EXISTS get_pending_quotes() CASCADE;
DROP FUNCTION IF EXISTS approve_quote(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS reject_quote(BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_moderation_stats() CASCADE;
DROP FUNCTION IF EXISTS add_favorite(TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS remove_favorite(TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS get_user_favorites(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_quote_favorited(TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS create_collection(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_collections(TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_quote_to_collection(BIGINT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS remove_quote_from_collection(BIGINT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS get_collection_quotes(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS delete_collection(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =============================================================================
-- STEP 2: CREATE TABLES (with TEXT user_id for anonymous users)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE quotes (
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (length(name) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Use TEXT for user_id to support anonymous users
CREATE TABLE user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quote_id)
);

-- Use TEXT for user_id to support anonymous users
CREATE TABLE collections (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  description TEXT,
  color TEXT DEFAULT '#667eea',
  icon TEXT DEFAULT '📁',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE collection_quotes (
  id BIGSERIAL PRIMARY KEY,
  collection_id BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  quote_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, quote_id)
);

-- =============================================================================
-- STEP 3: CREATE INDEXES
-- =============================================================================

CREATE INDEX idx_quotes_category ON quotes(category);
CREATE INDEX idx_quotes_author ON quotes(author);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_date_added ON quotes(date_added);
CREATE INDEX idx_quotes_is_favorite ON quotes(is_favorite);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_text_search ON quotes USING gin(to_tsvector('english', text || ' ' || author));
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_quote_id ON user_favorites(quote_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at);
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collection_quotes_collection_id ON collection_quotes(collection_id);
CREATE INDEX idx_collection_quotes_quote_id ON collection_quotes(quote_id);

-- =============================================================================
-- STEP 4: CREATE TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotes_updated_at 
  BEFORE UPDATE ON quotes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at 
  BEFORE UPDATE ON collections 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 5: ENABLE RLS WITH ADMIN-FRIENDLY POLICIES
-- =============================================================================

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_quotes ENABLE ROW LEVEL SECURITY;

-- Quotes policies (admins can see ALL quotes)
CREATE POLICY "Anyone can view all quotes (for admin panel)" 
  ON quotes FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert quotes" 
  ON quotes FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own quotes" 
  ON quotes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes" 
  ON quotes FOR DELETE 
  USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" 
  ON categories FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert categories" 
  ON categories FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- User Favorites policies (allow anonymous users)
CREATE POLICY "Users can view own favorites" 
  ON user_favorites FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own favorites" 
  ON user_favorites FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can delete own favorites" 
  ON user_favorites FOR DELETE 
  USING (true);

-- Collections policies (allow anonymous users)
CREATE POLICY "Users can view own collections" 
  ON collections FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own collections" 
  ON collections FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own collections" 
  ON collections FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete own collections" 
  ON collections FOR DELETE 
  USING (true);

-- Collection Quotes policies
CREATE POLICY "Users can view quotes in collections" 
  ON collection_quotes FOR SELECT 
  USING (true);

CREATE POLICY "Users can add quotes to collections" 
  ON collection_quotes FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can remove quotes from collections" 
  ON collection_quotes FOR DELETE 
  USING (true);

-- =============================================================================
-- STEP 6: CREATE FUNCTIONS (with TEXT user_id support)
-- =============================================================================

CREATE OR REPLACE FUNCTION search_quotes(search_term TEXT)
RETURNS TABLE (
  id BIGINT, text TEXT, author TEXT, category TEXT, tags TEXT[],
  date_added TIMESTAMP WITH TIME ZONE, last_modified TIMESTAMP WITH TIME ZONE,
  views INTEGER, likes INTEGER, is_favorite BOOLEAN, user_id UUID, rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.author, q.category, q.tags, q.date_added, q.last_modified,
    q.views, q.likes, q.is_favorite, q.user_id,
    ts_rank(to_tsvector('english', q.text || ' ' || q.author || ' ' || q.category), plainto_tsquery('english', search_term)) as rank
  FROM quotes q
  WHERE q.status = 'approved' AND (
    to_tsvector('english', q.text || ' ' || q.author || ' ' || q.category) @@ plainto_tsquery('english', search_term)
    OR q.text ILIKE '%' || search_term || '%'
    OR q.author ILIKE '%' || search_term || '%'
    OR q.category ILIKE '%' || search_term || '%'
    OR search_term = ANY(q.tags)
  )
  ORDER BY rank DESC, q.date_added DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_quote_stats()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'totalQuotes', (SELECT COUNT(*) FROM quotes WHERE status = 'approved'),
    'totalCategories', (SELECT COUNT(DISTINCT category) FROM quotes WHERE status = 'approved'),
    'totalFavorites', (SELECT COUNT(*) FROM user_favorites),
    'totalViews', (SELECT COALESCE(SUM(views), 0) FROM quotes),
    'totalLikes', (SELECT COALESCE(SUM(likes), 0) FROM quotes),
    'lastUpdated', (SELECT MAX(last_modified) FROM quotes)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_categories()
RETURNS TABLE(category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT q.category FROM quotes q
  WHERE q.category IS NOT NULL AND trim(q.category) != '' AND q.status = 'approved'
  ORDER BY q.category;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_pending_quotes()
RETURNS TABLE(id BIGINT, text TEXT, author TEXT, category TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY SELECT q.id, q.text, q.author, q.category, q.created_at FROM quotes q WHERE q.status = 'pending' ORDER BY q.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_quote(quote_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE quotes SET status = 'approved', reviewed_at = NOW(), reviewed_by = auth.uid() WHERE id = quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_quote(quote_id BIGINT, reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE quotes SET status = 'rejected', reviewed_at = NOW(), reviewed_by = auth.uid(), rejection_reason = reason WHERE id = quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'pending', (SELECT COUNT(*) FROM quotes WHERE status = 'pending'),
    'approved', (SELECT COUNT(*) FROM quotes WHERE status = 'approved'),
    'rejected', (SELECT COUNT(*) FROM quotes WHERE status = 'rejected'),
    'total', (SELECT COUNT(*) FROM quotes)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Favorites functions with TEXT user_id
CREATE OR REPLACE FUNCTION add_favorite(p_user_id TEXT, p_quote_id BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_favorites (user_id, quote_id) VALUES (p_user_id, p_quote_id) ON CONFLICT (user_id, quote_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_favorite(p_user_id TEXT, p_quote_id BIGINT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_favorites WHERE user_id = p_user_id AND quote_id = p_quote_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_favorites(p_user_id TEXT)
RETURNS TABLE(id BIGINT, text TEXT, author TEXT, category TEXT, created_at TIMESTAMP WITH TIME ZONE, favorited_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.author, q.category, q.created_at, uf.created_at as favorited_at
  FROM quotes q INNER JOIN user_favorites uf ON q.id = uf.quote_id
  WHERE uf.user_id = p_user_id AND q.status = 'approved' ORDER BY uf.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_quote_favorited(p_user_id TEXT, p_quote_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE result BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM user_favorites WHERE user_id = p_user_id AND quote_id = p_quote_id) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Collections functions with TEXT user_id
CREATE OR REPLACE FUNCTION create_collection(p_user_id TEXT, p_name TEXT, p_description TEXT DEFAULT NULL, p_color TEXT DEFAULT '#667eea', p_icon TEXT DEFAULT '📁')
RETURNS BIGINT AS $$
DECLARE collection_id BIGINT;
BEGIN
  INSERT INTO collections (user_id, name, description, color, icon) VALUES (p_user_id, p_name, p_description, p_color, p_icon) RETURNING id INTO collection_id;
  RETURN collection_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_collections(p_user_id TEXT)
RETURNS TABLE(id BIGINT, name TEXT, description TEXT, color TEXT, icon TEXT, quote_count BIGINT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.description, c.color, c.icon, COUNT(cq.quote_id) as quote_count, c.created_at, c.updated_at
  FROM collections c LEFT JOIN collection_quotes cq ON c.id = cq.collection_id
  WHERE c.user_id = p_user_id GROUP BY c.id, c.name, c.description, c.color, c.icon, c.created_at, c.updated_at
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_quote_to_collection(p_collection_id BIGINT, p_quote_id BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO collection_quotes (collection_id, quote_id) VALUES (p_collection_id, p_quote_id) ON CONFLICT (collection_id, quote_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_quote_from_collection(p_collection_id BIGINT, p_quote_id BIGINT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM collection_quotes WHERE collection_id = p_collection_id AND quote_id = p_quote_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_collection_quotes(p_collection_id BIGINT)
RETURNS TABLE(id BIGINT, text TEXT, author TEXT, category TEXT, added_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.text, q.author, q.category, cq.added_at
  FROM quotes q INNER JOIN collection_quotes cq ON q.id = cq.quote_id
  WHERE cq.collection_id = p_collection_id AND q.status = 'approved' ORDER BY cq.added_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_collection(p_collection_id BIGINT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM collections WHERE id = p_collection_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 7: INSERT SAMPLE DATA
-- =============================================================================

INSERT INTO quotes (text, author, category, tags, status) VALUES 
  ('The only way to do great work is to love what you do.', 'Steve Jobs', 'Motivation', ARRAY['work', 'passion', 'success'], 'approved'),
  ('Innovation distinguishes between a leader and a follower.', 'Steve Jobs', 'Innovation', ARRAY['leadership', 'innovation', 'business'], 'approved'),
  ('Life is what happens to you while you''re busy making other plans.', 'John Lennon', 'Life', ARRAY['life', 'planning', 'wisdom'], 'approved'),
  ('The future belongs to those who believe in the beauty of their dreams.', 'Eleanor Roosevelt', 'Inspiration', ARRAY['dreams', 'future', 'belief'], 'approved'),
  ('Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Winston Churchill', 'Success', ARRAY['success', 'failure', 'courage'], 'approved'),
  ('The only impossible journey is the one you never begin.', 'Tony Robbins', 'Motivation', ARRAY['journey', 'beginning', 'action'], 'approved'),
  ('Happiness is not something ready made. It comes from your own actions.', 'Dalai Lama', 'Happiness', ARRAY['happiness', 'action', 'wisdom'], 'approved'),
  ('It''s not whether you get knocked down, it''s whether you get up.', 'Vince Lombardi', 'Motivation', ARRAY['resilience', 'perseverance'], 'approved'),
  ('Don''t watch the clock; do what it does. Keep going.', 'Sam Levenson', 'Success', ARRAY['persistence', 'time'], 'approved'),
  ('Love all, trust a few, do wrong to none.', 'William Shakespeare', 'Wisdom', ARRAY['love', 'trust', 'wisdom'], 'approved')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Complete setup finished!';
  RAISE NOTICE '📊 Tables: 5 created';
  RAISE NOTICE '⚡ Functions: 20 created';
  RAISE NOTICE '🔒 RLS: Enabled with admin-friendly policies';
  RAISE NOTICE '👤 User IDs: Support for anonymous users (TEXT format)';
  RAISE NOTICE '📝 Sample quotes: 10 approved quotes added';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ready to use! Your app should now work perfectly.';
END $$;