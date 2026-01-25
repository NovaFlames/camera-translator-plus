import { Languages } from "lucide-react";

interface TranslationOverlayProps {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  isVisible: boolean;
}

export function TranslationOverlay({
  originalText,
  translatedText,
  sourceLanguage,
  isVisible,
}: TranslationOverlayProps) {
  if (!isVisible || !translatedText) return null;

  return (
    <div className="absolute bottom-24 left-4 right-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-border/50 bg-background/80 p-4 backdrop-blur-xl">
        {/* Source language badge */}
        <div className="mb-3 flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {sourceLanguage}
          </span>
        </div>

        {/* Original text */}
        {originalText && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {originalText}
          </p>
        )}

        {/* Translated text */}
        <p className="text-lg font-medium leading-relaxed text-foreground">
          {translatedText}
        </p>
      </div>
    </div>
  );
}
