import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

function extractDocxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const docXml = files["word/document.xml"];
  if (!docXml) return "";
  const xml = strFromU8(docXml);
  // Convert paragraph/break boundaries to newlines, then strip tags
  const withBreaks = xml
    .replace(/<w:p[ >][^]*?<\/w:p>/g, (m) => m + "\n")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t");
  const text = withBreaks.replace(/<[^>]+>/g, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

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

    const lower = file_path.toLowerCase();
    const isPdf = lower.endsWith(".pdf");
    const isDocx = lower.endsWith(".docx");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isPdf && !isDocx) {
      return new Response(
        JSON.stringify({ error: "Only PDF or DOCX CVs are supported." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let docxText = "";
    if (isDocx) {
      try {
        docxText = extractDocxText(uint8Array);
      } catch (e) {
        console.error("DOCX extract failed:", e);
        return new Response(
          JSON.stringify({ error: "Failed to read DOCX file. Please upload as PDF instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!docxText.trim()) {
        return new Response(
          JSON.stringify({ error: "DOCX appears to be empty. Please upload as PDF instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = `You are an expert CV/resume parser. Extract ALL structured information from the document thoroughly. Return ONLY valid JSON with this exact structure:
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
- Extract EVERY work experience entry as a separate object in "experiences" array
- Include internships, freelance work, part-time jobs — every position mentioned
- Extract ALL education entries, including certifications and training programs
- Extract ALL skills — technical, soft skills, tools, frameworks, languages, methodologies
- Extract the CV's professional summary / profile / objective into the "summary" field when present
- The "other" field is a catch-all for everything else (certifications, awards, languages, volunteer work, etc.)
- If text is in Myanmar/Burmese, translate everything to English
- If a field is not found, use empty string or empty array
- Return ONLY the JSON, no markdown, no code fences, no explanation`;

    const filename = file_path.split("/").pop() || "cv";

    const userContent: any = isPdf
      ? [
          { type: "text", text: "Parse this CV/resume document and extract the structured information as JSON." },
          { type: "file", file: { filename, file_data: `data:application/pdf;base64,${base64Content}` } },
        ]
      : `Parse this CV/resume text and extract the structured information as JSON.\n\n--- CV TEXT START ---\n${docxText.slice(0, 60000)}\n--- CV TEXT END ---`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isPdf ? "gpt-4o" : "gpt-4o-mini",
        max_tokens: 8192,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI parsing failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

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
        .eq("user_id", userId)
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
