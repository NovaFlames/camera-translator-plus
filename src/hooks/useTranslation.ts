import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enhanceBase64 } from "@/lib/enhanceImage";

interface TranslationResult {
  detectedText: string;
  translatedText: string;
  sourceLanguage: string;
}

export function useTranslation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (imageBase64: string, sourceLanguage: string, targetLanguage: string) => {
      if (isProcessing) return;

      setIsProcessing(true);
      setError(null);

      try {
        const enhanced = await enhanceBase64(imageBase64);
        const { data, error: fnError } = await supabase.functions.invoke("translate-image", {
          body: {
            imageBase64: enhanced,
            sourceLanguage: sourceLanguage === "auto" ? null : sourceLanguage,
            targetLanguage,
          },
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.translatedText) {
          setResult(data);
        }
      } catch (err) {
        console.error("Translation error:", err);
        setError(err instanceof Error ? err.message : "Translation failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing]
  );

  return {
    translate,
    isProcessing,
    result,
    error,
    clearResult: () => setResult(null),
  };
}
