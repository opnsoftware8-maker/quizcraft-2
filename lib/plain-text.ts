function latexToReadableUnicode(expr: string): string {
  let out = expr.trim();

  // Convert nested/simple \frac{a}{b} or \dfrac{a}{b} -> a/b (up to 3 passes)
  for (let pass = 0; pass < 3; pass++) {
    const next = out.replace(
      /\\(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g,
      (_, num: string, den: string) => {
        const cleanNum = num.trim();
        const cleanDen = den.trim();
        const n = /\s/.test(cleanNum) ? `(${cleanNum})` : cleanNum;
        const d = /\s/.test(cleanDen) ? `(${cleanDen})` : cleanDen;
        return `${n}/${d}`;
      }
    );
    if (next === out) break;
    out = next;
  }

  out = out
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\vec\{([^{}]+)\}/g, "$1")
    .replace(/\\overline\{([^{}]+)\}/g, "$1")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\\times\b/g, "×")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±")
    .replace(/\\leq?\b/g, "≤")
    .replace(/\\geq?\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\pi\b/g, "π")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\alpha\b/g, "α")
    .replace(/\\beta\b/g, "β")
    .replace(/\\Delta\b/g, "Δ")
    .replace(/\\rightarrow\b|\\to\b/g, "→")
    .replace(/\\left|\\right/g, "")
    .replace(/\\begin\{[a-zA-Z*]+\}/g, "[ ")
    .replace(/\\end\{[a-zA-Z*]+\}/g, " ]")
    .replace(/\\\\/g, " ; ")
    .replace(/\s*&\s*/g, " ")
    .replace(/\{([^{}]+)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return out;
}

/**
 * Converts Markdown + LaTeX into clean, natural plain text without raw #, **, ---, or $$ symbols
 * when the user copies a chat message.
 */
export function markdownToCleanPlainText(raw: string): string {
  if (!raw) return "";

  let text = raw.replace(/\r\n/g, "\n");

  // 1. Convert display and inline LaTeX math into readable plain math
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner: string) =>
    latexToReadableUnicode(inner)
  );
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) =>
    latexToReadableUnicode(inner)
  );
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) =>
    latexToReadableUnicode(inner)
  );
  text = text.replace(
    /(?<!\\)\$([^\s$](?:[^$\n]*[^\s$])?)\$/g,
    (_, inner: string) => latexToReadableUnicode(inner)
  );

  // 2. Clean line-level Markdown syntax outside code blocks
  const lines = text.split("\n");
  const cleanedLines: string[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      cleanedLines.push(line);
      continue;
    }

    // Remove horizontal rules (---, ***, ___)
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      continue;
    }

    // Strip heading markers (#, ##, ###)
    let next = line.replace(/^\s*#{1,6}\s*/, "");

    // Strip blockquote > prefix
    next = next.replace(/^\s*>\s?/, "");

    // Convert markdown bullet points (* or -) to clean dot bullet
    next = next.replace(/^(\s*)[*-]\s+/, "$1• ");

    // Strip bold/italic/inline-code wrappers cleanly
    next = next
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1");

    cleanedLines.push(next);
  }

  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
