import { useState, useCallback } from "react";
import { CameraView } from "@/components/CameraView";
import { TranslationOverlay } from "@/components/TranslationOverlay";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2, Scan } from "lucide-react";

const Index = () => {
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const { translate, isProcessing, result } = useTranslation();

  const handleCapture = useCallback(
    (imageBase64: string) => {
      translate(imageBase64, sourceLanguage, targetLanguage);
    },
    [translate, sourceLanguage, targetLanguage]
  );

  return (
    <div className="relative flex h-[100dvh] flex-col bg-background">
      {/* Camera viewfinder */}
      <div className="flex-1">
        <CameraView onCapture={handleCapture} isProcessing={isProcessing} />
      </div>

      {/* Translation result overlay */}
      <TranslationOverlay
        originalText={result?.detectedText || ""}
        translatedText={result?.translatedText || ""}
        sourceLanguage={result?.sourceLanguage || ""}
        isVisible={!!result}
      />

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent pb-8 pt-16">
        <div className="flex flex-col items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 backdrop-blur-sm">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Translating...</span>
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Point at text</span>
              </>
            )}
          </div>

          {/* Language selector */}
          <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceChange={setSourceLanguage}
            onTargetChange={setTargetLanguage}
          />
        </div>
      </div>

      {/* App title */}
      <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-background via-background/80 to-transparent pb-8 pt-4">
        <h1 className="text-center text-lg font-semibold text-foreground">
          Camera Translator
        </h1>
      </div>
    </div>
  );
};

export default Index;
