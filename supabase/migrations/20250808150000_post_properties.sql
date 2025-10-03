-- Link posts to properties
CREATE TABLE IF NOT EXISTS post_properties (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, property_id)
);
ALTER TABLE post_properties ENABLE ROW LEVEL SECURITY;

-- Select: anyone who can see the post can see the link
DROP POLICY IF EXISTS "Post properties select" ON post_properties;
CREATE POLICY "Post properties select" ON post_properties
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_id AND (
      p.visibility = 'public' OR p.author_id = auth.uid() OR EXISTS (
        SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.followee_id = p.author_id
      )
    )
  )
);

-- Insert/Update/Delete: only post author
DROP POLICY IF EXISTS "Post properties modify" ON post_properties;
CREATE POLICY "Post properties modify" ON post_properties
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);

DROP POLICY IF EXISTS "Post properties delete" ON post_properties;
CREATE POLICY "Post properties delete" ON post_properties
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);


