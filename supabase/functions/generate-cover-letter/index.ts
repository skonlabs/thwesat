import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobTitle, company, jobDescription, yourName, yourExperience, tone } = await req.json();

    if (!jobTitle && !company) {
      return new Response(JSON.stringify({ error: "Job title or company is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Write a professional cover letter for the following job application. Output ONLY the cover letter text, no JSON, no markdown fences.

Job Title: ${jobTitle || "Not specified"}
Company: ${company || "Not specified"}
Job Description / Requirements: ${jobDescription || "Not provided"}
Applicant Name: ${yourName || "Not provided"}
Applicant Experience: ${yourExperience || "Not provided"}
Desired Tone: ${tone || "professional"}

IMPORTANT RULES:
- If any input is in Burmese/Myanmar language, translate it to professional English
- Match the requested tone: professional, friendly, confident, or enthusiastic
- Keep it concise (3-4 paragraphs max)
- Include a proper greeting and sign-off
- Highlight relevant experience naturally
- Make it specific to the job and company — avoid generic filler
- Use action verbs and concrete language
- If job description is provided, reference specific requirements
- End with the applicant's name (use the provided name, or "Your Name" if not provided)
- Do NOT include placeholder brackets like [Your Name] — use actual values`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: "You are an expert career coach who writes compelling, tailored cover letters. Write naturally and avoid clichés. Output only the cover letter text.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const text = aiData.content?.[0]?.text || "";

    return new Response(JSON.stringify({ data: { letter: text.trim() } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-cover-letter error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
