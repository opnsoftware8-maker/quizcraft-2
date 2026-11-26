import { create, all } from "mathjs";

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

export type MathGridMode = "invisible" | "faint" | "axes";
export type MathCanvasHeight = "compact" | "standard" | "tall";

export interface MathFunctionSpec {
  expr: string;
  xMin?: number;
  xMax?: number;
  color: string;
  dashed?: boolean;
  strokeWidth?: number;
  label?: string;
}

export interface MathCurvePoint {
  x: number;
  y: number;
}

export interface MathCurveSpec {
  points: MathCurvePoint[];
  smooth?: boolean;
  closed?: boolean;
  color: string;
  fill?: string;
  dashed?: boolean;
  strokeWidth?: number;
  arrowEnd?: boolean;
  label?: string;
}

export interface MathLineSpec {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  label?: string;
}

export interface MathShapeSpec {
  type: "circle" | "rect";
  x: number;
  y: number;
  r?: number;
  width?: number;
  height?: number;
  color: string;
  fill?: string;
  dashed?: boolean;
}

export interface MathPointSpec {
  x: number;
  y: number;
  color: string;
  style?: "filled" | "hollow";
  label?: string;
}

export interface MathAnnotationSpec {
  x: number;
  y: number;
  content: string;
  isLatex?: boolean;
  color: string;
  fontSize?: "sm" | "md" | "lg";
  align?: "center" | "left" | "right";
  background?: boolean;
}

export interface MathCanvasData {
  id: string;
  title: string;
  subject?: string;
  gridMode: MathGridMode;
  canvasHeight: MathCanvasHeight;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep?: number;
  yStep?: number;
  xLabel?: string;
  yLabel?: string;
  functions: MathFunctionSpec[];
  curves: MathCurveSpec[];
  lines: MathLineSpec[];
  shapes: MathShapeSpec[];
  points: MathPointSpec[];
  annotations: MathAnnotationSpec[];
  summary?: string;
}

const EMOJI_STRIP_REGEX =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|[\u{1F1E6}-\u{1F1FF}]|[\u2600-\u27BF]\uFE0F?|\d\uFE0F?\u20E3|\uFE0F/gu;

function cleanText(val: unknown, fallback = ""): string {
  if (typeof val !== "string") return fallback;
  return val.replace(EMOJI_STRIP_REGEX, "").trim() || fallback;
}

function cleanColor(val: unknown, fallback = "#1F1E1D"): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(?:0?\.\d+|1|0))?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  const named: Record<string, string> = {
    black: "#1F1E1D",
    ink: "#1F1E1D",
    gray: "#6B6A65",
    grey: "#6B6A65",
    blue: "#0284C7",
    azure: "#0284C7",
    red: "#DC2626",
    crimson: "#DC2626",
    green: "#059669",
    emerald: "#059669",
    amber: "#D97706",
    orange: "#D97706",
    yellow: "#CA8A04",
    purple: "#7C3AED",
    violet: "#7C3AED",
    teal: "#0D9488",
  };
  return named[trimmed.toLowerCase()] || fallback;
}

function toFiniteNumber(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function computeNiceStep(span: number): number {
  if (span <= 0) return 1;
  const rough = span / 8;
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const fraction = rough / pow10;
  if (fraction <= 1.2) return 1 * pow10;
  if (fraction <= 2.5) return 2 * pow10;
  if (fraction <= 5.5) return 5 * pow10;
  return 10 * pow10;
}

export function normalizeMathCanvasToolArgs(
  rawArgs: unknown,
  idSeed: string
): MathCanvasData | null {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const args = rawArgs as Record<string, unknown>;

  const title = cleanText(args.title, "แบบจำลองกราฟและพิกัด");
  const subject = cleanText(args.subject);
  const summary = cleanText(args.summary);

  const rawGridMode = typeof args.gridMode === "string" ? args.gridMode.toLowerCase() : "";
  const gridMode: MathGridMode =
    rawGridMode === "invisible" || rawGridMode === "faint" || rawGridMode === "axes"
      ? rawGridMode
      : "axes";

  const rawHeight = typeof args.canvasHeight === "string" ? args.canvasHeight.toLowerCase() : "";
  const canvasHeight: MathCanvasHeight =
    rawHeight === "compact" || rawHeight === "tall" ? rawHeight : "standard";

  let xMin = toFiniteNumber(args.xMin) ?? -10;
  let xMax = toFiniteNumber(args.xMax) ?? 10;
  let yMin = toFiniteNumber(args.yMin) ?? -10;
  let yMax = toFiniteNumber(args.yMax) ?? 10;

  if (xMax <= xMin) {
    xMax = xMin + 10;
  }
  if (yMax <= yMin) {
    yMax = yMin + 10;
  }

  const rawXStep = toFiniteNumber(args.xStep);
  const rawYStep = toFiniteNumber(args.yStep);
  const xStep =
    rawXStep && rawXStep > 0 && (xMax - xMin) / rawXStep <= 60
      ? rawXStep
      : computeNiceStep(xMax - xMin);
  const yStep =
    rawYStep && rawYStep > 0 && (yMax - yMin) / rawYStep <= 60
      ? rawYStep
      : computeNiceStep(yMax - yMin);

  const functions: MathFunctionSpec[] = [];
  if (Array.isArray(args.functions)) {
    for (const f of args.functions.slice(0, 12)) {
      if (!f || typeof f !== "object") continue;
      const obj = f as Record<string, unknown>;
      const expr = cleanText(obj.expr);
      if (!expr) continue;
      const fxMin = toFiniteNumber(obj.xMin) ?? undefined;
      const fxMax = toFiniteNumber(obj.xMax) ?? undefined;
      functions.push({
        expr,
        ...(fxMin !== undefined ? { xMin: fxMin } : {}),
        ...(fxMax !== undefined ? { xMax: fxMax } : {}),
        color: cleanColor(obj.color, "#0284C7"),
        dashed: Boolean(obj.dashed),
        strokeWidth: toFiniteNumber(obj.strokeWidth) ?? 2.4,
        label: cleanText(obj.label) || undefined,
      });
    }
  }

  const curves: MathCurveSpec[] = [];
  if (Array.isArray(args.curves)) {
    for (const c of args.curves.slice(0, 20)) {
      if (!c || typeof c !== "object") continue;
      const obj = c as Record<string, unknown>;
      if (!Array.isArray(obj.points)) continue;
      const pts: MathCurvePoint[] = [];
      for (const pt of obj.points.slice(0, 200)) {
        if (!pt || typeof pt !== "object") continue;
        const p = pt as Record<string, unknown>;
        const x = toFiniteNumber(p.x);
        const y = toFiniteNumber(p.y);
        if (x !== null && y !== null) pts.push({ x, y });
      }
      if (pts.length < 2) continue;
      curves.push({
        points: pts,
        smooth: obj.smooth !== false,
        closed: Boolean(obj.closed),
        color: cleanColor(obj.color, "#0284C7"),
        fill: obj.fill ? cleanColor(obj.fill, "rgba(2, 132, 199, 0.12)") : undefined,
        dashed: Boolean(obj.dashed),
        strokeWidth: toFiniteNumber(obj.strokeWidth) ?? 2.2,
        arrowEnd: Boolean(obj.arrowEnd),
        label: cleanText(obj.label) || undefined,
      });
    }
  }

  const lines: MathLineSpec[] = [];
  if (Array.isArray(args.lines)) {
    for (const l of args.lines.slice(0, 40)) {
      if (!l || typeof l !== "object") continue;
      const obj = l as Record<string, unknown>;
      const x1 = toFiniteNumber(obj.x1);
      const y1 = toFiniteNumber(obj.y1);
      const x2 = toFiniteNumber(obj.x2);
      const y2 = toFiniteNumber(obj.y2);
      if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
      lines.push({
        x1,
        y1,
        x2,
        y2,
        color: cleanColor(obj.color, "#1F1E1D"),
        strokeWidth: toFiniteNumber(obj.strokeWidth) ?? 2,
        dashed: Boolean(obj.dashed),
        arrowStart: Boolean(obj.arrowStart),
        arrowEnd: Boolean(obj.arrowEnd),
        label: cleanText(obj.label) || undefined,
      });
    }
  }

  const shapes: MathShapeSpec[] = [];
  if (Array.isArray(args.shapes)) {
    for (const s of args.shapes.slice(0, 25)) {
      if (!s || typeof s !== "object") continue;
      const obj = s as Record<string, unknown>;
      const type = obj.type === "rect" ? "rect" : obj.type === "circle" ? "circle" : null;
      const x = toFiniteNumber(obj.x);
      const y = toFiniteNumber(obj.y);
      if (!type || x === null || y === null) continue;
      if (type === "circle") {
        const r = toFiniteNumber(obj.r);
        if (!r || r <= 0) continue;
        shapes.push({
          type: "circle",
          x,
          y,
          r,
          color: cleanColor(obj.color, "#0284C7"),
          fill: obj.fill ? cleanColor(obj.fill, "rgba(2, 132, 199, 0.1)") : undefined,
          dashed: Boolean(obj.dashed),
        });
      } else {
        const width = toFiniteNumber(obj.width);
        const height = toFiniteNumber(obj.height);
        if (!width || !height || width <= 0 || height <= 0) continue;
        shapes.push({
          type: "rect",
          x,
          y,
          width,
          height,
          color: cleanColor(obj.color, "#0284C7"),
          fill: obj.fill ? cleanColor(obj.fill, "rgba(2, 132, 199, 0.1)") : undefined,
          dashed: Boolean(obj.dashed),
        });
      }
    }
  }

  const points: MathPointSpec[] = [];
  if (Array.isArray(args.points)) {
    for (const pt of args.points.slice(0, 40)) {
      if (!pt || typeof pt !== "object") continue;
      const obj = pt as Record<string, unknown>;
      const x = toFiniteNumber(obj.x);
      const y = toFiniteNumber(obj.y);
      if (x === null || y === null) continue;
      points.push({
        x,
        y,
        color: cleanColor(obj.color, "#DC2626"),
        style: obj.style === "hollow" ? "hollow" : "filled",
        label: cleanText(obj.label) || undefined,
      });
    }
  }

  const annotations: MathAnnotationSpec[] = [];
  if (Array.isArray(args.annotations)) {
    for (const a of args.annotations.slice(0, 60)) {
      if (!a || typeof a !== "object") continue;
      const obj = a as Record<string, unknown>;
      const x = toFiniteNumber(obj.x);
      const y = toFiniteNumber(obj.y);
      const content = cleanText(obj.content);
      if (x === null || y === null || !content) continue;
      const align =
        obj.align === "left" || obj.align === "right" ? obj.align : "center";
      const fontSize =
        obj.fontSize === "sm" || obj.fontSize === "lg" ? obj.fontSize : "md";
      annotations.push({
        x,
        y,
        content,
        isLatex: Boolean(obj.isLatex),
        color: cleanColor(obj.color, "#1F1E1D"),
        fontSize,
        align,
        background: obj.background !== false,
      });
    }
  }

  const totalItems =
    functions.length +
    curves.length +
    lines.length +
    shapes.length +
    points.length +
    annotations.length;

  if (totalItems === 0) {
    return null;
  }

  return {
    id: `canvas-${idSeed}`,
    title,
    ...(subject ? { subject } : {}),
    gridMode,
    canvasHeight,
    xMin,
    xMax,
    yMin,
    yMax,
    xStep,
    yStep,
    ...(cleanText(args.xLabel) ? { xLabel: cleanText(args.xLabel) } : {}),
    ...(cleanText(args.yLabel) ? { yLabel: cleanText(args.yLabel) } : {}),
    functions,
    curves,
    lines,
    shapes,
    points,
    annotations,
    ...(summary ? { summary } : {}),
  };
}

export function sanitizeMathCanvases(raw: unknown): MathCanvasData[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid: MathCanvasData[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const normalized = normalizeMathCanvasToolArgs(
      obj,
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.replace(/^canvas-/, "")
        : `restored-${i}`
    );
    if (normalized) {
      if (typeof obj.id === "string" && obj.id.trim()) {
        normalized.id = obj.id;
      }
      valid.push(normalized);
    }
  }
  return valid.length > 0 ? valid : undefined;
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

  let normalizedExpr = fn.expr
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
