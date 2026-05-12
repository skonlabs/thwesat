CREATE TABLE IF NOT EXISTS public.agent_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  name text NOT NULL,
  logo_url text DEFAULT '',
  website text DEFAULT '',
  industry text DEFAULT '',
  notes text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_clients_agent ON public.agent_clients(agent_id);

ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own clients"
  ON public.agent_clients
  FOR ALL TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Authenticated read active clients"
  ON public.agent_clients
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage all clients"
  ON public.agent_clients
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_agent_clients_updated_at
  BEFORE UPDATE ON public.agent_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS agent_client_id uuid REFERENCES public.agent_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_company_name text,
  ADD COLUMN IF NOT EXISTS client_logo_url text,
  ADD COLUMN IF NOT EXISTS posted_by_label text NOT NULL DEFAULT 'self';

INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-client-logos', 'agent-client-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agent client logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-client-logos');

CREATE POLICY "Agents upload own client logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Agents update own client logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'agent-client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Agents delete own client logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agent-client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);