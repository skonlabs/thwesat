CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the purge-deleted-accounts edge function to run every hour.
-- Idempotent: drop any existing schedule first.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-deleted-accounts-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-deleted-accounts-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbnyhtvpnzsleeqnmggc.supabase.co/functions/v1/purge-deleted-accounts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibnlodHZwbnpzbGVlcW5tZ2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDY0NTgsImV4cCI6MjA5MDUyMjQ1OH0.--qC2KAu35EFBvyMhm2TwBPowWcQcYVa_D80hipsgSA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);