/**
 * One-off generator for the PWA PNG icon set, rasterized from
 * `public/favicon.svg`.
 *
 * Not part of the build pipeline — run manually whenever the source
 * logo changes:
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Requires the `sharp` devDependency, which is intentionally NOT kept
 * in package.json after the icons are generated (see the PWA feature
 * notes) — reinstall it temporarily (`npm i -D sharp`) to regenerate.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

// `favicon.svg` is a layered piece of art: a solid bolt path plus a masked
// group of blurred glow ellipses behind it (feGaussianBlur/feFlood filters).
// librsvg (used by sharp/libvips) does not render those filter primitives
// correctly — the glow layer comes out as opaque black bars instead of a
// soft blur. App icons don't need the glow anyway (a flat mark reproduces
// better at 16-48px), so pull out just the first `<path>` — the solid bolt
// — and rasterize that on its own.
const rawSvg = readFileSync(resolve(publicDir, "favicon.svg"), "utf-8");
const pathMatch = rawSvg.match(/<path fill="(#[0-9a-fA-F]{6})" d="([^"]+)"/);
if (!pathMatch) {
  throw new Error("Could not find the bolt <path> in favicon.svg");
}
const [, fill, d] = pathMatch;
const svgBuffer = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 46"><path fill="${fill}" d="${d}"/></svg>`,
);

/**
 * Render the logo onto a square canvas.
 *
 * @param {number} size - Output width/height in pixels.
 * @param {string} outFile - Destination filename inside `public/`.
 * @param {object} opts
 * @param {number} opts.padding - Fraction of the canvas left empty on each side.
 * @param {{r: number, g: number, b: number, alpha: number}} opts.background - Canvas fill.
 */
async function renderIcon(size, outFile, { padding, background }) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(svgBuffer)
    // The source path's bounding box (48x46) isn't perfectly square, so
    // "contain" must letterbox slightly — sharp's default pad colour is
    // opaque black, so it has to be overridden to transparent explicitly.
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .toBuffer();
  const offset = Math.round((size - inner) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toFile(resolve(publicDir, outFile));

  console.log(`wrote ${outFile} (${size}x${size})`);
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
// Matches the manifest's background_color / light-theme --background.
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

await Promise.all([
  // "any" purpose — displayed on whatever background the OS/launcher uses.
  renderIcon(192, "pwa-192x192.png", { padding: 0.06, background: TRANSPARENT }),
  renderIcon(512, "pwa-512x512.png", { padding: 0.06, background: TRANSPARENT }),
  // "maskable" — OS crops to a shape (circle, squircle, ...), so the logo
  // must sit within the safe zone (~80% inner circle) on an opaque backdrop.
  renderIcon(192, "pwa-maskable-192x192.png", { padding: 0.18, background: WHITE }),
  renderIcon(512, "pwa-maskable-512x512.png", { padding: 0.18, background: WHITE }),
  // iOS home screen icon — no transparency support, opaque backdrop required.
  renderIcon(180, "apple-touch-icon.png", { padding: 0.14, background: WHITE }),
]);
