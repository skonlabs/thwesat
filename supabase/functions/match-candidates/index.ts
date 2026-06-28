// Candidate matching for a specific job — OpenAI embeddings + pgvector ranker.
// Requires the caller to (a) own the job and (b) have an active "matching" add-on purchase.
//
// Strategy:
//  1) Ensure the job has an up-to-date embedding (compute & store if missing).
//  2) Backfill missing seeker (profile) embeddings, capped per invocation.
//  3) Call `match_candidates_for_job` RPC which returns top N seekers by cosine
//     similarity, excluding already-rejected ones for this job.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "text-embedding-3-small";
const PROFILE_BACKFILL_LIMIT = 50;
const RESULT_LIMIT_DEFAULT = 30;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return encodeHex(new Uint8Array(buf));
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as { job_id?: string; limit?: number };
    const jobId = body.job_id;
    const limit = Math.min(Math.max(body.limit ?? RESULT_LIMIT_DEFAULT, 1), 100);
    if (!jobId) {
      return new Response(JSON.stringify({ error: "missing_job_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-user daily rate limit to cap OpenAI embedding spend.
    const { data: rl, error: rlErr } = await userClient.rpc("ai_rate_limit_check_and_increment", {
      _action: "candidate_match",
      _cap: 30,
    });
    if (rlErr) {
      console.error("[match-candidates] rate-limit rpc error", rlErr);
    } else if (rl && (rl as any).allowed === false) {
      return new Response(JSON.stringify({ error: "rate_limited", retry_after: (rl as any).reset_at }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Ownership check.
    const { data: job, error: jobErr } = await admin
      .from("jobs")
      .select("id, employer_id, title, company, location, role_type, job_type, categories, skills, description, requirements, embedding, embedding_input_hash")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr) throw jobErr;
    if (!job) {
      return new Response(JSON.stringify({ error: "job_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.employer_id !== user.id) {
      return new Response(JSON.stringify({ error: "not_owner" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Matching Pack entitlement check.
    const nowIso = new Date().toISOString();
    const { data: packs } = await admin
      .from("feature_unlocks")
      .select("id, expires_at, is_active")
      .eq("user_id", user.id)
      .eq("feature_key", "matching")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .limit(1);
    if (!packs || packs.length === 0) {
      return new Response(JSON.stringify({ error: "no_matching_pack" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Ensure job embedding is current.
    const jobText = buildJobText(job);
    if (!jobText || jobText.length < 20) {
      return new Response(JSON.stringify({ matches: [], reason: "job_too_sparse" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jobHash = await sha256(jobText);
    if (!job.embedding || job.embedding_input_hash !== jobHash) {
      const [vec] = await embedBatch([jobText], openaiKey);
      await admin.from("jobs").update({
        embedding: `[${vec.join(",")}]` as unknown as any,
        embedding_input_hash: jobHash,
        embedding_updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    // 4) Backfill missing seeker profile embeddings (capped).
    const { data: profilesNeed } = await admin
      .from("profiles")
      .select("id, headline, bio, experience, location, skills, languages, preferred_work_types, embedding, embedding_input_hash, primary_role")
      .or("embedding.is.null,embedding_input_hash.is.null")
      .eq("primary_role", "jobseeker")
      .limit(PROFILE_BACKFILL_LIMIT);

    if (profilesNeed && profilesNeed.length > 0) {
      // Fetch primary CV for each (best-effort, bulk).
      const ids = profilesNeed.map((p: any) => p.id);
      const { data: cvs } = await admin
        .from("user_documents")
        .select("user_id, parsed_text, is_primary, parsed_at")
        .in("user_id", ids);
      const cvByUser = new Map<string, any>();
      (cvs || []).forEach((cv: any) => {
        const prev = cvByUser.get(cv.user_id);
        if (!prev || cv.is_primary) cvByUser.set(cv.user_id, cv);
      });

      const prepared = await Promise.all(profilesNeed.map(async (p: any) => {
        const text = buildProfileText(p, cvByUser.get(p.id));
        const hash = text ? await sha256(text) : "";
        return { id: p.id, text, hash, currentHash: p.embedding_input_hash };
      }));
      const stale = prepared.filter((p) => p.text && p.text.length >= 20 && p.hash !== p.currentHash);
      for (let i = 0; i < stale.length; i += 20) {
        const chunk = stale.slice(i, i + 20);
        const vecs = await embedBatch(chunk.map((c) => c.text), openaiKey);
        await Promise.all(chunk.map((c, idx) =>
          admin.from("jobseeker_profiles").update({
            embedding: `[${vecs[idx].join(",")}]` as unknown as any,
            embedding_input_hash: c.hash,
            embedding_updated_at: new Date().toISOString(),
          }).eq("user_id", c.id),
        ));
      }
    }

    // 5) Rank. We RPC as the caller so RLS / auth.uid() inside the function works.
    const { data: matches, error: rpcErr } = await userClient.rpc("match_candidates_for_job", {
      _job_id: jobId, _limit: limit,
    });
    if (rpcErr) throw rpcErr;

    // 6) Cache results for finance/analytics (best-effort, not blocking).
    if (Array.isArray(matches) && matches.length > 0) {
      const rows = matches.map((m: any) => ({
        job_id: jobId, seeker_user_id: m.seeker_user_id, score: m.similarity,
      }));
      await admin.from("job_candidate_matches").upsert(rows, { onConflict: "job_id,seeker_user_id" });
    }

    return new Response(
      JSON.stringify({ matches: matches || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("match-candidates error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
