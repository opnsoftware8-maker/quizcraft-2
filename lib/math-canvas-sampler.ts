import { create, all } from "mathjs";
import type { MathFunctionSpec } from "@/lib/math-canvas";

const math = create(all, {});
try {
  math.import(
    {
      import: () => {
        throw new Error("Disabled");
      },
      createUnit: () => {
        throw new Error("Disabled");
      },
    },
    { override: true }
  );
} catch {
  // ignore
}

export interface SampledPoint {
  x: number;
  y: number;
  valid: boolean;
}

export function sampleMathFunction(
  fn: MathFunctionSpec,
  canvasXMin: number,
  canvasXMax: number,
  canvasYMin: number,
  canvasYMax: number,
  sampleCount = 240
): SampledPoint[] {
  const start = fn.xMin !== undefined ? Math.max(canvasXMin, fn.xMin) : canvasXMin;
  const end = fn.xMax !== undefined ? Math.min(canvasXMax, fn.xMax) : canvasXMax;
  if (end <= start) return [];

  const normalizedExpr = fn.expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/^y\s*=\s*/i, "")
    .replace(/^f\(x\)\s*=\s*/i, "")
    .trim();

  if (!normalizedExpr) return [];

  let compiled: { evaluate: (scope: Record<string, unknown>) => unknown };
  try {
    compiled = math.compile(normalizedExpr);
  } catch {
    return [];
  }

  const ySpan = Math.max(1e-6, canvasYMax - canvasYMin);
  const yPad = ySpan * 0.45;
  const pts: SampledPoint[] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const x = start + ((end - start) * i) / sampleCount;
    try {
      const rawVal = compiled.evaluate({ x });
      const y = typeof rawVal === "number" ? rawVal : Number(rawVal);
      if (!Number.isFinite(y)) {
        pts.push({ x, y: 0, valid: false });
        continue;
      }

      // Break asymptotes (e.g. 1/x, tan(x)) if jumping sharply across canvas
      const prev = pts[pts.length - 1];
      if (prev && prev.valid && Math.abs(y - prev.y) > ySpan * 1.6) {
        pts.push({ x, y: 0, valid: false });
        continue;
      }

      const clampedY = Math.max(canvasYMin - yPad, Math.min(canvasYMax + yPad, y));
      pts.push({ x, y: clampedY, valid: true });
    } catch {
      pts.push({ x, y: 0, valid: false });
    }
  }

  return pts;
}
