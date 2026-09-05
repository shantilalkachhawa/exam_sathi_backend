/**
 * Optional cloud OCR for production scale (better Hindi + English mixed text).
 *
 * Enable by setting:
 *   OCR_PROVIDER=google
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Install: npm install @google-cloud/vision
 *
 * Falls back to Tesseract when not configured — no static word maps required.
 */

async function recognizeWithCloudOcr(imagePath, { language = "hi" } = {}) {
  const provider = String(process.env.OCR_PROVIDER || "").toLowerCase();
  if (provider !== "google") return null;

  try {
    const vision = require("@google-cloud/vision");
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.documentTextDetection(imagePath);
    const text = result?.fullTextAnnotation?.text;
    if (!text || !String(text).trim()) return null;
    return {
      text: String(text).trim(),
      source: "google-vision",
      language,
    };
  } catch (err) {
    if (err?.code === "MODULE_NOT_FOUND") {
      console.warn(
        "OCR_PROVIDER=google but @google-cloud/vision is not installed."
      );
      return null;
    }
    console.warn("Cloud OCR failed, using Tesseract:", err.message);
    return null;
  }
}

module.exports = {
  recognizeWithCloudOcr,
};
