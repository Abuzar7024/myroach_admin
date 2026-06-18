const MAX_DATA_URL_CHARS = 280_000;
const MAX_SIDE_PX = 800;

/** Compress image for Firestore (free tier) — returns a data: URL under ~280KB. */
export async function compressImageForFirestore(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.45) {
    quality -= 0.07;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error("Image still too large — use a smaller photo or fewer images per product");
  }

  return dataUrl;
}
