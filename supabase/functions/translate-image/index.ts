import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_LANGUAGES = new Set([
  "en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru",
  "as", "bn", "gu", "kn", "ml", "mr", "or", "pa", "ta", "te", "ur",
]);

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", zh: "Chinese", ja: "Japanese",
  ko: "Korean", ar: "Arabic", hi: "Hindi", ru: "Russian",
  as: "Assamese", bn: "Bengali", gu: "Gujarati", kn: "Kannada",
  ml: "Malayalam", mr: "Marathi", or: "Odia", pa: "Punjabi",
  ta: "Tamil", te: "Telugu", ur: "Urdu",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function gatewayErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }

    if (typeof body !== "object" || body === null) {
      return jsonResponse({ error: "A JSON object is required." }, 400);
    }

    const { imageBase64, sourceLanguage, targetLanguage } = body as {
      imageBase64?: unknown;
      sourceLanguage?: unknown;
      targetLanguage?: unknown;
    };

    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length === 0 ||
      imageBase64.length > 15_000_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
    ) {
      return jsonResponse({ error: "A valid image is required (maximum 10 MB)." }, 400);
    }

    if (sourceLanguage !== null && sourceLanguage !== undefined &&
        (typeof sourceLanguage !== "string" || !ALLOWED_LANGUAGES.has(sourceLanguage))) {
      return jsonResponse({ error: "Choose a supported source language or automatic detection." }, 400);
    }

    if (typeof targetLanguage !== "string" || !ALLOWED_LANGUAGES.has(targetLanguage)) {
      return jsonResponse({ error: "Choose a supported target language." }, 400);
    }

    const safeSource = typeof sourceLanguage === "string" ? LANGUAGE_NAMES[sourceLanguage] : null;
    const safeTarget = LANGUAGE_NAMES[targetLanguage];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "Translation service is not configured." }, 500);
    }

    const systemPrompt = `You are a professional multilingual OCR and translation engine. Read text visible in the provided image and translate it faithfully.

Images may be dark, noisy, blurry, rotated, upside-down, skewed, or photographed from a steep angle. Mentally correct the orientation and perspective, read carefully, and preserve the visible text's reading order and line breaks. Do not invent words, signs, logos, or surrounding content. If some characters are unreadable, omit only those characters rather than guessing.

Detect the original language${safeSource ? ` (expected to be ${safeSource})` : " from the image"}. Translate all readable text into ${safeTarget}. Preserve names, numbers, prices, punctuation, and meaning. The translatedText must be a natural translation in ${safeTarget}, not a repeated copy of detectedText unless the text itself should remain unchanged.

Return only one valid JSON object with exactly these string fields:
{
  "detectedText": "all readable original text, preserving line breaks",
  "translatedText": "faithful translation into ${safeTarget}",
  "sourceLanguage": "the detected original language name"
}

If no readable text is present, use empty strings for detectedText and translatedText and "none" for sourceLanguage. Do not include markdown or any extra keys.`;

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
      const errorText = await response.text();
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = null;
      }
      const fallback = response.status === 429
        ? "Translation service is rate limited. Please try again later."
        : response.status === 402
        ? "AI translation credits are unavailable."
        : response.status === 403
        ? "The translation request was denied."
        : response.status >= 500
        ? "Translation service is temporarily unavailable."
        : `Translation request failed (${response.status}).`;
      return jsonResponse({ error: gatewayErrorMessage(errorBody, fallback) }, response.status);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const content = typeof message?.content === "string" ? message.content.trim() : "";

    if (message?.refusal || !content) {
      return jsonResponse({ error: "The translation model could not process this image." }, 502);
    }

    let result: unknown;
    try {
      const cleanContent = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      result = JSON.parse(cleanContent);
    } catch {
      return jsonResponse({ error: "The translation model returned an unreadable result. Please try again." }, 502);
    }

    if (
      typeof result !== "object" || result === null ||
      typeof (result as { detectedText?: unknown }).detectedText !== "string" ||
      typeof (result as { translatedText?: unknown }).translatedText !== "string" ||
      typeof (result as { sourceLanguage?: unknown }).sourceLanguage !== "string"
    ) {
      return jsonResponse({ error: "The translation model returned an incomplete result. Please try again." }, 502);
    }

    return jsonResponse(result as Record<string, unknown>);
  } catch {
    return jsonResponse({ error: "Translation failed unexpectedly. Please try again." }, 500);
  }
});
