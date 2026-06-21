CREATE POLICY "Partners can view all payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'partner'::app_role));