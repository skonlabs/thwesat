// Personalized job matching via OpenAI embeddings.
// - Embeds the seeker's profile (skills, headline, bio, experience, CV text)
// - Backfills embeddings for active jobs that are missing or stale
// - Returns the top N jobs ranked by cosine similarity (via match_jobs_for_user RPC)
//
// Re-embedding is hash-gated so repeated calls are cheap. Job backfill is capped
// per invocation so a cold start can't blow the OpenAI budget.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims, cheap
const JOB_BACKFILL_LIMIT = 50;
const RESULT_LIMIT_DEFAULT = 50;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return new TextDecoder().decode(hexEncode(new Uint8Array(buf)));
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI embeddings failed [${r.status}]: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

function buildProfileText(p: any, cv: any): string {
  const parts: string[] = [];
  if (p?.headline) parts.push(`Headline: ${p.headline}`);
  if (p?.bio) parts.push(`Bio: ${p.bio}`);
  if (p?.experience) parts.push(`Experience: ${p.experience}`);
  if (p?.location) parts.push(`Location: ${p.location}`);
  if (Array.isArray(p?.skills) && p.skills.length) parts.push(`Skills: ${p.skills.join(", ")}`);
  if (Array.isArray(p?.languages) && p.languages.length) parts.push(`Languages: ${p.languages.join(", ")}`);
  if (Array.isArray(p?.preferred_work_types) && p.preferred_work_types.length) {
    parts.push(`Preferred work types: ${p.preferred_work_types.join(", ")}`);
  }
  const cvText = cv?.parsed_text || "";
  if (cvText) parts.push(`CV:\n${String(cvText).slice(0, 6000)}`);
  return parts.join("\n").trim();
}

function buildJobText(j: any): string {
  const parts: string[] = [];
  if (j.title) parts.push(`Title: ${j.title}`);
  if (j.company) parts.push(`Company: ${j.company}`);
  if (j.location) parts.push(`Location: ${j.location}`);
  if (j.role_type || j.job_type) parts.push(`Type: ${[j.role_type, j.job_type].filter(Boolean).join(" / ")}`);
  if (Array.isArray(j.categories) && j.categories.length) parts.push(`Categories: ${j.categories.join(", ")}`);
  if (Array.isArray(j.skills) && j.skills.length) parts.push(`Skills: ${j.skills.join(", ")}`);
  if (j.description) parts.push(`Description: ${String(j.description).slice(0, 4000)}`);
  if (j.requirements) parts.push(`Requirements: ${String(j.requirements).slice(0, 2000)}`);
  return parts.join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "openai_key_missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    const limit = Math.min(Math.max(body?.limit ?? RESULT_LIMIT_DEFAULT, 1), 100);

    // Service client bypasses RLS for embedding writes / job scans.
    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Profile embedding (hash-gated).
    const [{ data: profile }, { data: cv }] = await Promise.all([
      admin.from("profiles")
        .select("id, headline, bio, experience, location, skills, languages, preferred_work_types, embedding_input_hash")
        .eq("id", user.id).maybeSingle(),
      admin.from("cv_documents")
        .select("parsed_text")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("parsed_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(1).maybeSingle(),
    ]);

    if (!profile) {
      return new Response(JSON.stringify({ matches: [], reason: "no_profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileText = buildProfileText(profile, cv);
    if (!profileText || profileText.length < 20) {
      return new Response(JSON.stringify({ matches: [], reason: "profile_too_sparse" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileHash = await sha256(profileText);
    if (profileHash !== profile.embedding_input_hash) {
      const [vec] = await embedBatch([profileText], openaiKey);
      // pgvector accepts the vector as a JSON-style string '[...]'
      await admin.from("profiles").update({
        embedding: `[${vec.join(",")}]` as unknown as any,
        embedding_input_hash: profileHash,
        embedding_updated_at: new Date().toISOString(),
      }).eq("id", user.id);
    }

    // 2) Backfill missing/stale job embeddings (capped per call).
    const { data: jobsToEmbed } = await admin
      .from("jobs")
      .select("id, title, company, location, role_type, job_type, categories, skills, description, requirements, embedding_input_hash, embedding")
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .or("embedding.is.null,embedding_input_hash.is.null")
      .limit(JOB_BACKFILL_LIMIT);

    if (jobsToEmbed && jobsToEmbed.length > 0) {
      // Build text + hash for each
      const prepared = await Promise.all(
        jobsToEmbed.map(async (j: any) => {
          const text = buildJobText(j);
          const hash = await sha256(text);
          return { id: j.id, text, hash, currentHash: j.embedding_input_hash };
        }),
      );
      const stale = prepared.filter((p) => p.text && p.hash !== p.currentHash);

      // Embed in chunks of 20 to keep the request small.
      for (let i = 0; i < stale.length; i += 20) {
        const chunk = stale.slice(i, i + 20);
        const vecs = await embedBatch(chunk.map((c) => c.text), openaiKey);
        await Promise.all(
          chunk.map((c, idx) =>
            admin.from("jobs").update({
              embedding: `[${vecs[idx].join(",")}]` as unknown as any,
              embedding_input_hash: c.hash,
              embedding_updated_at: new Date().toISOString(),
            }).eq("id", c.id)
          ),
        );
      }
    }

    // 3) Rank.
    const { data: matches, error: rpcErr } = await admin.rpc("match_jobs_for_user", {
      _user_id: user.id, _limit: limit,
    });
    if (rpcErr) throw rpcErr;

    return new Response(
      JSON.stringify({ matches: matches || [], embedded_jobs: jobsToEmbed?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("match-jobs error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
