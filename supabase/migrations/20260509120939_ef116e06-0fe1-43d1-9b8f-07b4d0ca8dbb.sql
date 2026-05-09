DO $$
DECLARE v_key text; v_id bigint;
BEGIN
  v_key := public._get_service_role_key();
  RAISE NOTICE 'key length: %', length(coalesce(v_key, ''));
  SELECT net.http_post(
    url := 'https://dbnyhtvpnzsleeqnmggc.supabase.co/functions/v1/parse-cv',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
    body := jsonb_build_object('file_path','1130c2db-cc3d-47c3-b2c3-f9994f5b8fb3/1778327793120.pdf','user_id','1130c2db-cc3d-47c3-b2c3-f9994f5b8fb3'),
    timeout_milliseconds := 120000
  ) INTO v_id;
  RAISE NOTICE 'request id: %', v_id;
END $$;