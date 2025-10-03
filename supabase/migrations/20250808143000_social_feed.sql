-- Social feed: posts, media, follows, reactions, comments, bucket

-- Storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  20971520, -- 20 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read for post-media
DROP POLICY IF EXISTS "Public read post media" ON storage.objects;
CREATE POLICY "Public read post media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'post-media');

-- Authenticated upload/update/delete for post-media
DROP POLICY IF EXISTS "Authenticated upload post media" ON storage.objects;
CREATE POLICY "Authenticated upload post media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated update post media" ON storage.objects;
CREATE POLICY "Authenticated update post media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'post-media')
WITH CHECK (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated delete post media" ON storage.objects;
CREATE POLICY "Authenticated delete post media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media');

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers')),
  has_media boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Post media
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime text,
  width int,
  height int,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CONSTRAINT follows_no_self_follow CHECK (follower_id <> followee_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Reactions (likes)
CREATE TABLE IF NOT EXISTS reactions (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, type)
);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);

-- Policies: Posts
DROP POLICY IF EXISTS "Posts select" ON posts;
CREATE POLICY "Posts select" ON posts
FOR SELECT TO anon, authenticated
USING (
  visibility = 'public' OR 
  author_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.followee_id = author_id
  )
);

DROP POLICY IF EXISTS "Posts insert" ON posts;
CREATE POLICY "Posts insert" ON posts
FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Posts update" ON posts;
CREATE POLICY "Posts update" ON posts
FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Posts delete" ON posts;
CREATE POLICY "Posts delete" ON posts
FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- Policies: Post media
DROP POLICY IF EXISTS "Post media select" ON post_media;
CREATE POLICY "Post media select" ON post_media
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_id 
      AND (p.visibility = 'public' OR p.author_id = auth.uid() OR EXISTS (
        SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.followee_id = p.author_id
      ))
  )
);

DROP POLICY IF EXISTS "Post media insert" ON post_media;
CREATE POLICY "Post media insert" ON post_media
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Post media update" ON post_media;
CREATE POLICY "Post media update" ON post_media
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Post media delete" ON post_media;
CREATE POLICY "Post media delete" ON post_media
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

-- Policies: Follows
DROP POLICY IF EXISTS "Follows select" ON follows;
CREATE POLICY "Follows select" ON follows
FOR SELECT TO authenticated
USING (follower_id = auth.uid() OR followee_id = auth.uid());

DROP POLICY IF EXISTS "Follows insert" ON follows;
CREATE POLICY "Follows insert" ON follows
FOR INSERT TO authenticated
WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Follows delete" ON follows;
CREATE POLICY "Follows delete" ON follows
FOR DELETE TO authenticated
USING (follower_id = auth.uid());

-- Policies: Reactions
DROP POLICY IF EXISTS "Reactions select" ON reactions;
CREATE POLICY "Reactions select" ON reactions
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Reactions upsert" ON reactions;
CREATE POLICY "Reactions upsert" ON reactions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Reactions delete" ON reactions;
CREATE POLICY "Reactions delete" ON reactions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Policies: Comments
DROP POLICY IF EXISTS "Comments select" ON comments;
CREATE POLICY "Comments select" ON comments
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_id 
      AND (p.visibility = 'public' OR p.author_id = auth.uid() OR EXISTS (
        SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.followee_id = p.author_id
      ))
  )
);

DROP POLICY IF EXISTS "Comments insert" ON comments;
CREATE POLICY "Comments insert" ON comments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Comments update" ON comments;
CREATE POLICY "Comments update" ON comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Comments delete" ON comments;
CREATE POLICY "Comments delete" ON comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());


