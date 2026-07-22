// heic-convert ships no TypeScript types. Minimal ambient declaration for the
// subset of the API this project uses (single-image HEIC/HEIF -> JPEG/PNG).
declare module "heic-convert" {
  type ConvertOptions = {
    buffer: Uint8Array | ArrayBuffer | Buffer
    format: "JPEG" | "PNG"
    quality?: number
  }

  function convert(options: ConvertOptions): Promise<ArrayBuffer>

  export default convert
}
