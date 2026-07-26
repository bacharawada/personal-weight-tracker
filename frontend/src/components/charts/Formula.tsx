import katex from "katex";
import "katex/dist/katex.min.css";

interface FormulaProps {
  /** LaTeX source string. */
  tex: string;
  /** Render as a centred display-mode block instead of inline. */
  block?: boolean;
}

/** Renders a LaTeX formula via KaTeX. Input is app-authored, never user data. */
export function Formula({ tex, block = false }: FormulaProps) {
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode: block,
  });
  return block ? (
    <div
      // `break-inside-avoid`: a display formula must never be split down the
      // middle by the column break in a multi-column explainer panel.
      className="my-2 overflow-x-auto break-inside-avoid"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
