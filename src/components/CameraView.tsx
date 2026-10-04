import { useRef, useEffect, useCallback, useState } from "react";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { enhanceCanvas } from "@/lib/enhanceImage";

interface CameraViewProps {
  onCapture: (imageData: string) => void;
  isProcessing: boolean;
  onPermissionStateChange?: (granted: boolean | null) => void;
}

export function CameraView({ onCapture, isProcessing, onPermissionStateChange }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
      onPermissionStateChange?.(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      onPermissionStateChange?.(false);
    }
  }, [facingMode, onPermissionStateChange]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    if (!video.videoWidth) return;
    onCapture(enhanceCanvas(video, video.videoWidth, video.videoHeight));
  }, [onCapture, isProcessing]);

  // Auto-capture every 2 seconds
  useEffect(() => {
    if (hasPermission && !isProcessing) {
      const interval = setInterval(captureFrame, 2000);
      return () => clearInterval(interval);
    }
  }, [hasPermission, isProcessing, captureFrame]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (hasPermission === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="rounded-full bg-muted p-6">
          <CameraOff className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Camera Access Required</h2>
          <p className="mt-2 text-muted-foreground">
            Please allow camera access to use real-time translation
          </p>
        </div>
        <button
          onClick={startCamera}
          className="mt-4 flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          <Camera className="h-5 w-5" />
          Enable Camera
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera switch button */}
      <button
        onClick={toggleCamera}
        className="absolute right-4 top-4 rounded-full bg-background/70 p-3 backdrop-blur-md transition-all hover:bg-background/90"
        aria-label="Switch camera"
      >
        <RefreshCw className="h-5 w-5 text-foreground" />
      </button>

      {/* Scanning indicator */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 animate-pulse rounded-2xl border-2 border-primary/50" />
        </div>
      )}

      {/* Viewfinder corners */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-64 w-64">
          <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-primary" />
          <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-primary" />
          <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary" />
        </div>
      </div>
    </div>
  );
}
