import { useState, useCallback, useRef } from "react";
import { CameraView } from "@/components/CameraView";
import { TranslationOverlay } from "@/components/TranslationOverlay";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2, Scan, ImagePlus, Camera } from "lucide-react";

const Index = () => {
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { translate, isProcessing, result } = useTranslation();
  const lastImageRef = useRef<string | null>(null);

  const handleCapture = useCallback(
    (imageBase64: string) => {
      lastImageRef.current = imageBase64;
      translate(imageBase64, sourceLanguage, targetLanguage);
    },
    [translate, sourceLanguage, targetLanguage]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedImage(dataUrl);
        const base64 = dataUrl.split(",")[1];
        lastImageRef.current = base64;
        translate(base64, sourceLanguage, targetLanguage);
      };
      reader.readAsDataURL(file);
    },
    [translate, sourceLanguage, targetLanguage]
  );

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSourceChange = useCallback(
    (value: string) => {
      setSourceLanguage(value);
      if (lastImageRef.current) {
        translate(lastImageRef.current, value, targetLanguage);
      }
    },
    [translate, targetLanguage]
  );

  const handleTargetChange = useCallback(
    (value: string) => {
      setTargetLanguage(value);
      if (lastImageRef.current) {
        translate(lastImageRef.current, sourceLanguage, value);
      }
    },
    [translate, sourceLanguage]
  );

  return (
    <main className="bg-background">
    <div className="relative flex h-[100dvh] flex-col bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera or Upload view */}
      <div className="flex-1">
        {mode === "camera" ? (
          <CameraView
            onCapture={handleCapture}
            isProcessing={isProcessing}
            onPermissionStateChange={(granted) => setCameraDenied(granted === false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30 p-4">
            {uploadedImage ? (
              <div className="relative h-full w-full">
                <img
                  src={uploadedImage}
                  alt="Uploaded for translation"
                  className="h-full w-full object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm">Translating...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={triggerFileUpload}
                className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 p-12 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="rounded-full bg-primary/10 p-6">
                  <ImagePlus className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">Upload an Image</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap to select an image to translate
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
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
          {!cameraDenied && (
            <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 backdrop-blur-sm">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Translating...</span>
                </>
              ) : mode === "camera" ? (
                <>
                  <Scan className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Point at text</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Upload image</span>
                </>
              )}
            </div>
          )}

          {/* Mode toggle + upload button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMode("camera");
                setUploadedImage(null);
              }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                mode === "camera"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground backdrop-blur-sm hover:bg-muted"
              }`}
            >
              <Camera className="h-4 w-4" />
              Camera
            </button>
            <button
              onClick={() => {
                setMode("upload");
                if (mode === "upload" && !uploadedImage) {
                  triggerFileUpload();
                }
              }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                mode === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground backdrop-blur-sm hover:bg-muted"
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              Upload
            </button>
          </div>

          {/* Re-upload button when image is shown */}
          {mode === "upload" && uploadedImage && (
            <button
              onClick={triggerFileUpload}
              className="rounded-full bg-muted/50 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-muted"
            >
              Upload another image
            </button>
          )}

          {/* Language selector */}
          <LanguageSelector
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceChange={handleSourceChange}
            onTargetChange={handleTargetChange}
          />
        </div>
      </div>

      {/* App title */}
      <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-background via-background/80 to-transparent pb-8 pt-4">
        <h1 className="text-center text-lg font-semibold text-foreground">
          Translate text from camera images
        </h1>
      </div>
    </div>
    <section className="mx-auto max-w-2xl px-6 py-12 text-foreground">
      <h2 className="text-2xl font-semibold">A camera translator that works in real time</h2>
      <p className="mt-4 text-muted-foreground">
        Point your camera at a sign, menu or document and Camera Translator reads the text and
        translates it instantly. You can also upload a photo to translate all the text in it.
        Dark and tilted photos are brightened and straightened automatically for better reading.
      </p>
      <h3 className="mt-8 text-lg font-semibold">Supported languages</h3>
      <p className="mt-2 text-muted-foreground">
        English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic,
        Hindi and Russian — with automatic detection of the source language.
      </p>
    </section>
    </main>
  );
};

export default Index;
