// Brightens dark frames and boosts contrast to help text recognition.
export function enhanceCanvas(source: CanvasImageSource, width: number, height: number): string {
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  // Measure average brightness on a small sample
  const sample = document.createElement("canvas");
  sample.width = 64;
  sample.height = 64;
  const sctx = sample.getContext("2d")!;
  sctx.drawImage(source, 0, 0, 64, 64);
  const px = sctx.getImageData(0, 0, 64, 64).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  const avg = sum / (px.length / 4);

  const brightness = avg < 110 ? Math.min(2.2, 130 / Math.max(avg, 20)) : 1;
  const contrast = avg < 110 ? 1.35 : 1.15;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(0.9)`;
  ctx.drawImage(source, 0, 0, w, h);
  return out.toDataURL("image/jpeg", 0.9).split(",")[1];
}

export function enhanceBase64(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(enhanceCanvas(img, img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}
