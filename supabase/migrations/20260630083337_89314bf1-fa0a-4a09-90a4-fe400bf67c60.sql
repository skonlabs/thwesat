DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.wallet_transactions'::regclass
      AND conname = 'wallet_transactions_source_table_source_id_key'
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_source_table_source_id_key
      UNIQUE (source_table, source_id);
  END IF;
END $$;