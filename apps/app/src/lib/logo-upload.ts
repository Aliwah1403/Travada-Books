/**
 * Logo preparation, shared by onboarding step 3 and Settings → General.
 *
 * Lets people upload far larger files than we store. The old rules rejected
 * anything over 2 MB or 1024×1024 px outright, which turned away most logos
 * exported straight from a design tool (typically 2000–4000px). Instead, raster
 * images are downscaled in the browser before upload, so a 4000px, 8 MB export
 * becomes a sharp ~1200px file that comfortably fits the `org-assets` bucket's
 * server-side limit — which stays at 2 MB, so no migration was needed.
 *
 * Why 1200px is plenty: the invoice and statement PDFs draw the logo at
 * 140×48 pt with `fit="contain"`, about 580px wide even at 300 DPI print
 * resolution. Anything larger is bytes carried into every PDF for nothing.
 *
 * WebP is converted to PNG rather than stored. @react-pdf/image decodes only
 * JPEG, PNG and SVG — it has no WebP branch — so a stored WebP logo rendered
 * fine in the app and then silently broke every invoice and statement PDF.
 * PNG keeps any transparency; JPEGs stay JPEG, since they have none to keep.
 *
 * SVG passes through untouched: it is vector, react-pdf renders it, and a
 * canvas round-trip would rasterise it for no gain.
 */

/** What someone may pick. Generous, because we shrink it before upload. */
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/** `org-assets` bucket's file_size_limit. SVG isn't resized, so it must fit as-is. */
const BUCKET_LIMIT_BYTES = 2 * 1024 * 1024;

/**
 * Longest edge to try, in order. A detailed PNG can still exceed the bucket
 * limit at 1200px, so there is one smaller fallback before giving up.
 */
const TARGET_EDGES = [1200, 800];

const RASTER_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/** For the file input's `accept` attribute. */
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export type PreparedLogo =
  | { ok: true; file: File }
  | { ok: false; error: string };

export async function prepareLogoFile(input: File): Promise<PreparedLogo> {
  if (input.type === "image/svg+xml") {
    if (input.size > BUCKET_LIMIT_BYTES) {
      return { ok: false, error: "SVG logos must be under 2 MB." };
    }
    return { ok: true, file: input };
  }

  if (!RASTER_TYPES.includes(input.type)) {
    return { ok: false, error: "Use a PNG, JPEG, WebP or SVG image." };
  }
  if (input.size > MAX_INPUT_BYTES) {
    return { ok: false, error: "Logos must be under 10 MB." };
  }

  let bitmap: ImageBitmap;
  try {
    // Applies EXIF orientation by default, so phone photos come out upright.
    bitmap = await createImageBitmap(input);
  } catch {
    return {
      ok: false,
      error: "That image couldn't be read. Try exporting it again as a PNG.",
    };
  }

  try {
    const isJpeg = input.type === "image/jpeg" || input.type === "image/jpg";
    const outType = isJpeg ? "image/jpeg" : "image/png";
    const longest = Math.max(bitmap.width, bitmap.height);

    // Already small, already a PDF-safe format, already under the bucket
    // limit: upload the original rather than re-encoding it.
    if (
      longest <= TARGET_EDGES[0] &&
      input.type !== "image/webp" &&
      input.size <= BUCKET_LIMIT_BYTES
    ) {
      return { ok: true, file: input };
    }

    for (const edge of TARGET_EDGES) {
      const scale = Math.min(1, edge / longest);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const blob = await encode(bitmap, width, height, outType);
      if (blob && blob.size <= BUCKET_LIMIT_BYTES) {
        const ext = isJpeg ? "jpg" : "png";
        return { ok: true, file: new File([blob], `logo.${ext}`, { type: outType }) };
      }
    }

    return {
      ok: false,
      error: "That logo is still too large after resizing. Try a simpler image.",
    };
  } finally {
    bitmap.close();
  }
}

/**
 * Downscales in halving steps before the final draw. A single large reduction
 * (say 4000px to 1200px) samples too few source pixels and leaves logo edges
 * jagged; halving first keeps them clean.
 */
async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: string,
): Promise<Blob | null> {
  let source: CanvasImageSource = bitmap;
  let sw = bitmap.width;
  let sh = bitmap.height;

  while (sw / 2 >= width && sh / 2 >= height) {
    const step = document.createElement("canvas");
    step.width = Math.round(sw / 2);
    step.height = Math.round(sh / 2);
    const ctx = step.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    sw = step.width;
    sh = step.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);

  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
}
