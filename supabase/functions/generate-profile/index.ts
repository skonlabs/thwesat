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

    // Verify user
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

    const { name, title, summary, experiences, educations, skills, otherInfo, platform } = await req.json();

    if (!platform) {
      return new Response(JSON.stringify({ error: "Platform is required" }), {
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

    // Build context about the user
    const experienceBlock = (experiences || [])
      .filter((ex: any) => ex.role || ex.company || ex.description)
      .map((ex: any) => `- Role: ${ex.role || "N/A"}, Company: ${ex.company || "N/A"}, Duration: ${ex.duration || "N/A"}, Description: ${ex.description || "N/A"}`)
      .join("\n");

    const educationBlock = (educations || [])
      .filter((ed: any) => ed.degree || ed.institution)
      .map((ed: any) => `- ${ed.degree || "N/A"} at ${ed.institution || "N/A"} (${ed.year || "N/A"})`)
      .join("\n");

    const skillsList = (skills || []).join(", ");

    const userPrompt = `Generate a professional ${platform} profile for the following person. The output must be in English, polished, and optimized specifically for ${platform}.

Name: ${name || "Not provided"}
Job Title / Specialty: ${title || "Not provided"}
Professional Summary (from CV): ${summary || "Not provided"}
Work Experience:
${experienceBlock || "Not provided"}
Education:
${educationBlock || "Not provided"}
Skills: ${skillsList || "Not provided"}
Other Information: ${otherInfo || "Not provided"}

IMPORTANT RULES:
- If the input is in Burmese/Myanmar language, translate everything to professional English
- Tailor the tone, keywords, and structure specifically for ${platform}
- For Upwork: focus on client-facing language, deliverables, hourly/project readiness
- For Fiverr: focus on gig-oriented language, what you can deliver, quick turnaround
- For LinkedIn: focus on professional networking tone, achievements, industry keywords
- For Toptal: focus on elite-level expertise, technical depth, problem-solving
- Make the summary compelling and specific (not generic)
- Use action verbs and quantify achievements where possible
- Keep the headline concise but impactful

Return ONLY valid JSON with this exact structure:
{
  "headline": "A compelling one-line headline for ${platform}",
  "summary": "A 3-5 sentence professional summary optimized for ${platform}",
  "sections": [
    { "title": "Professional Summary", "content": "Detailed professional summary paragraph" },
    { "title": "Work Experience", "content": "Formatted work experience with bullet points using • character" },
    { "title": "Education", "content": "Formatted education entries" },
    { "title": "Additional Information", "content": "Any other relevant info like certifications, awards, languages" }
  ],
  "skills": ["skill1", "skill2", ...]
}

Only include sections that have meaningful content. Do not include empty sections.
Return ONLY the JSON object, no markdown fences, no extra text.`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "You are an expert career coach and professional profile writer. You specialize in creating optimized profiles for freelancing platforms and professional networks. Always output valid JSON only.",
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
    let text = aiData.content?.[0]?.text || "";
    
    // Strip markdown fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const parsed = JSON.parse(text);

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-profile error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
