import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const file_path: string | undefined = body?.file_path;
    const bodyUserId: string | undefined = body?.user_id;
    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve user: either from JWT (client call) or from body when called
    // server-side with the service-role key (DB trigger via pg_net).
    let userId: string | null = null;
    const bearer = authHeader.replace("Bearer ", "").trim();
    if (bearer === supabaseServiceKey) {
      if (!bodyUserId) {
        return new Response(JSON.stringify({ error: "user_id required for service call" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = bodyUserId;
    } else {
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error: authError } = await anonClient.auth.getUser(bearer);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    // Verify file belongs to user
    if (!file_path.startsWith(userId + "/")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cv-documents")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Content = btoa(binary);

    const isPdf = file_path.endsWith(".pdf");
    const mediaType = isPdf
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Call Anthropic API
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert CV/resume parser. Extract ALL structured information from the uploaded document thoroughly. Return ONLY valid JSON with this exact structure:
{
  "name": "Full name of the candidate",
  "title": "Current or most recent job title / professional headline",
  "experiences": [
    {
      "company": "Company or organization name",
      "role": "Job title / position",
      "duration": "Date range, e.g. Jan 2020 - Dec 2022",
      "description": "Key responsibilities and achievements"
    }
  ],
  "education": [
    { "degree": "Degree or certification name", "institution": "School/university name", "year": "Graduation year or date range" }
  ],
  "skills": ["skill1", "skill2"],
  "summary": "Professional summary, profile, or career objective statement from the CV",
  "other": "Any other information from the CV not captured above — certifications, awards, volunteer work, languages spoken, references, hobbies, projects, publications, links, etc. Include everything so nothing is lost."
}

Rules:
- Extract EVERY work experience entry as a separate object in "experiences" array — include company, role, duration, and description for each
- Include internships, freelance work, part-time jobs — every position mentioned
- Extract ALL education entries, including certifications and training programs
- Extract ALL skills — technical, soft skills, tools, frameworks, languages, methodologies
- Extract the CV's professional summary / profile / objective into the "summary" field when present
- The "other" field is a catch-all: put everything else here — certifications, awards, languages, volunteer work, projects, publications, portfolio links, references, hobbies, interests, etc. Do NOT duplicate the summary in "other" if it already belongs in "summary".
- If text is in Myanmar/Burmese, translate everything to English
- If a field is not found, use empty string or empty array
- Return ONLY the JSON, no markdown, no code fences, no explanation`;

    // Build content array based on file type
    const contentParts: any[] = [
      { type: "text", text: "Parse this CV/resume document and extract the structured information." },
    ];

    if (isPdf) {
      contentParts.push({
        type: "document",
        source: { type: "base64", media_type: mediaType, data: base64Content },
      });
    } else {
      // For DOCX, send as base64 file
      contentParts.push({
        type: "document",
        source: { type: "base64", media_type: mediaType, data: base64Content },
      });
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: contentParts }],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Anthropic API error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI parsing failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.content?.[0]?.text || "";

    // Parse JSON from response
    let parsed;
    try {
      let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Extract JSON object if there's surrounding text
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse CV data", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a single searchable text blob from the structured fields so the
    // job-matching pipeline can score jobs against the actual resume content.
    const parts: string[] = [];
    if (parsed?.name) parts.push(String(parsed.name));
    if (parsed?.title) parts.push(String(parsed.title));
    if (parsed?.summary) parts.push(String(parsed.summary));
    if (Array.isArray(parsed?.skills)) parts.push(parsed.skills.join(", "));
    if (Array.isArray(parsed?.experiences)) {
      for (const exp of parsed.experiences) {
        parts.push([exp?.role, exp?.company, exp?.duration, exp?.description].filter(Boolean).join(" — "));
      }
    }
    if (Array.isArray(parsed?.education)) {
      for (const edu of parsed.education) {
        parts.push([edu?.degree, edu?.institution, edu?.year].filter(Boolean).join(" — "));
      }
    }
    if (parsed?.other) parts.push(String(parsed.other));
    const parsedText = parts.filter(Boolean).join("\n").slice(0, 50000);

    // Persist parsed result back to the cv_documents row for this file so it
    // can drive personalized job matching without re-parsing on every load.
    try {
      await supabase
        .from("cv_documents")
        .update({
          parsed_text: parsedText,
          parsed_data: parsed,
          parsed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .like("file_url", `%${file_path}%`);
    } catch (persistErr) {
      console.error("parse-cv: failed to persist parsed text", persistErr);
    }

    return new Response(JSON.stringify({ data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-cv error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
