-- Allow updates on posts (for delete via deleted_at and content edits)
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Anyone can update posts'
	) THEN
		CREATE POLICY "Anyone can update posts"
		ON public.posts
		FOR UPDATE
		USING (true)
		WITH CHECK (true);
	END IF;
END $$;

-- Optional: allow updates on comments (future: edits/deletes)
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Anyone can update comments'
	) THEN
		CREATE POLICY "Anyone can update comments"
		ON public.comments
		FOR UPDATE
		USING (true)
		WITH CHECK (true);
	END IF;
END $$;
