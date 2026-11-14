/**
 * Client-Side Image Compression Utility
 * Resizes camera photos and encodes JPEG at 0.7 quality on HTML5 Canvas,
 * reducing 4MB-10MB mobile uploads to < 200KB for transmission across 2G/3G disaster zones.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  reductionPercentage: number;
}

export async function compressImage(
  file: File,
  maxDimension: number = 1280,
  quality: number = 0.72
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while clamping to maxDimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Failed to initialize canvas context"));
        }

        // Draw and apply bicubic-style image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Approximate byte size of base64 dataUrl
        const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
        const compressedBytes = Math.round((base64Length * 3) / 4);

        const reduction = Math.max(
          0,
          Math.round(((file.size - compressedBytes) / file.size) * 100)
        );

        resolve({
          dataUrl,
          originalSizeBytes: file.size,
          compressedSizeBytes: compressedBytes,
          originalSizeFormatted: formatBytes(file.size),
          compressedSizeFormatted: formatBytes(compressedBytes),
          reductionPercentage: reduction,
        });
      };

      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
