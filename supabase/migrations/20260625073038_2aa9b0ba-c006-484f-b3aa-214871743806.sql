
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  COALESCE(length(name), 0) BETWEEN 1 AND 200
  AND COALESCE(length(email), 0) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND COALESCE(length(subject), 0) BETWEEN 1 AND 300
  AND COALESCE(length(message), 0) BETWEEN 1 AND 5000
  AND COALESCE(length(category), 0) <= 60
  AND (status IS NULL OR status = 'new')
);

DROP POLICY IF EXISTS "Agent client logos are publicly readable" ON storage.objects;
CREATE POLICY "Agent client logos owner folder list"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-client-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
