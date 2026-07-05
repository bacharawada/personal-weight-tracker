/**
 * Client-side PNG export.
 *
 * Serialises a rendered `<svg>` chart, rasterises it onto a canvas at 2× scale
 * and triggers a download. Replaces the old server-side (kaleido) PNG endpoint.
 */

export interface ExportPngOptions {
  width: number;
  height: number;
  filename: string;
  /** Solid background painted behind the chart (SVG is transparent). */
  background: string;
  scale?: number;
}

/** Serialise an SVG element to a standalone data URL. */
function svgToDataUrl(svg: SVGSVGElement, width: number, height: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

/** Render the SVG to a PNG and prompt the browser to download it. */
export async function exportSvgToPng(
  svg: SVGSVGElement,
  options: ExportPngOptions,
): Promise<void> {
  const { width, height, filename, background, scale = 2 } = options;
  const url = svgToDataUrl(svg, width, height);

  const image = new Image();
  image.width = width;
  image.height = height;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to rasterise chart SVG"));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Failed to encode PNG");

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}
