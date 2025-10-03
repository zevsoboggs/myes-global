-- Notify on new post to followers
CREATE OR REPLACE FUNCTION public.on_post_insert_notify_followers()
RETURNS TRIGGER AS $$
DECLARE f RECORD;
BEGIN
  FOR f IN SELECT follower_id FROM follows WHERE followee_id = NEW.author_id LOOP
    PERFORM public.create_notification(
      f.follower_id,
      'Новый пост',
      NULL,
      jsonb_build_object('post_id', NEW.id, 'author_id', NEW.author_id)
    );
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_post_insert_notify_followers ON posts;
CREATE TRIGGER trg_on_post_insert_notify_followers
AFTER INSERT ON posts
FOR EACH ROW EXECUTE PROCEDURE public.on_post_insert_notify_followers();


