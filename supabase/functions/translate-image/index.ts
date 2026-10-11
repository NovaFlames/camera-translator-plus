import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, sourceLanguage, targetLanguage } = await req.json();

    // Validate language inputs against an allowlist so request fields cannot
    // alter the system prompt with arbitrary text.
    const ALLOWED_LANGUAGES = new Set([
      "en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru",
    ]);
    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", zh: "Chinese", ja: "Japanese",
      ko: "Korean", ar: "Arabic", hi: "Hindi", ru: "Russian",
    };
    const safeSource =
      typeof sourceLanguage === "string" && ALLOWED_LANGUAGES.has(sourceLanguage)
        ? LANGUAGE_NAMES[sourceLanguage]
        : null;
    const safeTarget =
      typeof targetLanguage === "string" && ALLOWED_LANGUAGES.has(targetLanguage)
        ? LANGUAGE_NAMES[targetLanguage]
        : "English";

    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert OCR and translation system. Images may be dark, noisy, blurry, rotated, upside-down, skewed, or shot at steep perspective angles. Mentally deskew and straighten the text, read carefully character by character, use surrounding context to resolve ambiguous letters, and preserve reading order and line breaks. Ignore text you truly cannot read rather than guessing wildly.
Your task is to:
1. Extract ALL visible text from the image
2. Translate the text from ${safeSource || "any language (auto-detect)"} to ${safeTarget}
3. Return ONLY a JSON object with this exact structure:
{
  "detectedText": "the original text you found",
  "translatedText": "the translated text",
  "sourceLanguage": "detected source language"
}

If no text is found, return:
{
  "detectedText": "",
  "translatedText": "",
  "sourceLanguage": "none"
}

Return ONLY the JSON, no markdown, no explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: `Extract and translate all text in this image to ${safeTarget}.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let result;
    try {
      // Clean the response in case it has markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch {
      result = {
        detectedText: content,
        translatedText: content,
        sourceLanguage: "unknown",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
