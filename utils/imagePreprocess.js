const sharp = require("sharp");

/**
 * @param {string} input
 * @param {string} output
 * @param {{ soft?: boolean }} [opts] soft=true = Hindi-friendly (no threshold / no harsh sharpen)
 */
async function preprocessImage(input, output, opts = {}) {
  const soft = Boolean(opts.soft);

  let pipeline = sharp(input).grayscale().normalize({
    lower: soft ? 5 : 1,
    upper: soft ? 95 : 99,
  });

  // Hard sharpen + threshold breaks Devanagari matras (मध्यप्रदेश → मध्यप्रिेि)
  if (!soft) {
    pipeline = pipeline.sharpen().threshold(170);
  } else {
    // Mild clarity only — preserve conjuncts / matras
    pipeline = pipeline.modulate({ brightness: 1.02 }).linear(1.15, -8);
  }

  await pipeline
    .resize({
      width: soft ? 3200 : 2500,
      withoutEnlargement: false,
      kernel: soft ? sharp.kernel.lanczos3 : sharp.kernel.lanczos3,
    })
    .png()
    .toFile(output);

  return output;
}

module.exports = {
  preprocessImage,
};
