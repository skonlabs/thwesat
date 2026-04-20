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
    const { content, sourceLang = "auto", targetLang = "my" } = await req.json();

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chunks = splitIntoChunks(content, 4000);
    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      translatedChunks.push(await translateText(chunk, sourceLang, targetLang));
    }

    return new Response(
      JSON.stringify({ translatedContent: translatedChunks.join("\n"), targetLang }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function splitIntoChunks(text: string, maxLength: number): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateText(text: string, sl: string, tl: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Translate error: ${response.status}`);
  const data = await response.json();
  let translated = "";
  if (Array.isArray(data) && Array.isArray(data[0])) {
    for (const segment of data[0]) {
      if (segment && segment[0]) translated += segment[0];
    }
  }
  return translated;
}
