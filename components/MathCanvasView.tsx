"use client";

import React, { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import {
  curveCatmullRom,
  curveCatmullRomClosed,
  curveLinear,
  curveLinearClosed,
  line,
} from "d3-shape";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Grid3x3, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  MathCanvasData,
  MathCurvePoint,
  MathGridMode,
  SampledPoint,
  sampleMathFunction,
} from "@/lib/math-canvas";
import { MathLatexLabel } from "@/components/MathLatexLabel";
import { useLanguage } from "@/lib/language-context";

interface MathCanvasViewProps {
  canvas: MathCanvasData;
  mode: "card" | "fullscreen";
  onExpand?: () => void;
}

const LOGICAL_WIDTH = 720;

const LATEX_COMMAND_REGEX =
  /\\(?:frac|dfrac|tfrac|sqrt|vec|overrightarrow|begin|end|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|infty|sum|prod|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|sigma|omega|pi|Delta|Sigma|Omega|bmatrix|pmatrix|vmatrix|left|right|overline|underline|hat|bar|text)\b/;

function buildTickValues(min: number, max: number, step: number): number[] {
  if (step <= 0 || max <= min) return [];
  const ticks: number[] = [];
  const first = Math.ceil(min / step) * step;
  const maxIterations = 80;
  for (let i = 0; i < maxIterations; i++) {
    const val = Number((first + i * step).toFixed(6));
    if (val > max + 1e-6) break;
    if (val >= min - 1e-6) {
      ticks.push(Math.abs(val) < 1e-9 ? 0 : val);
    }
  }
  return ticks;
}

function formatTickNumber(val: number): string {
  if (Math.abs(val) < 1e-9) return "0";
  const rounded = Number(val.toFixed(3));
  return String(rounded);
}

export function MathCanvasView({
  canvas,
  mode,
  onExpand,
}: MathCanvasViewProps) {
  const { language } = useLanguage();
  const [showGuideOverride, setShowGuideOverride] = useState<boolean | null>(
    null
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(
    null
  );

  // If canvas started invisible, toggling grid reveals faint X-Y guide lines;
  // if canvas started with axes or faint grid, toggling hides/shows guide grid lines.
  const effectiveGridMode: MathGridMode = useMemo(() => {
    if (showGuideOverride === null) return canvas.gridMode;
    if (canvas.gridMode === "invisible") {
      return showGuideOverride ? "faint" : "invisible";
    }
    if (canvas.gridMode === "faint") {
      return showGuideOverride ? "faint" : "invisible";
    }
    return showGuideOverride ? "axes" : "invisible";
  }, [canvas.gridMode, showGuideOverride]);

  const isGuideVisible = effectiveGridMode !== "invisible";

  const logicalHeight =
    canvas.canvasHeight === "compact"
      ? 360
      : canvas.canvasHeight === "tall"
        ? 540
        : 440;

  const pad = useMemo(() => {
    if (effectiveGridMode === "axes") {
      return { top: 28, right: 34, bottom: 32, left: 38 };
    }
    return { top: 24, right: 24, bottom: 24, left: 24 };
  }, [effectiveGridMode]);

  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([canvas.xMin, canvas.xMax])
        .range([pad.left, LOGICAL_WIDTH - pad.right]),
    [canvas.xMin, canvas.xMax, pad.left, pad.right]
  );

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([canvas.yMin, canvas.yMax])
        .range([logicalHeight - pad.bottom, pad.top]),
    [canvas.yMin, canvas.yMax, logicalHeight, pad.bottom, pad.top]
  );

  const xTicks = useMemo(
    () => buildTickValues(canvas.xMin, canvas.xMax, canvas.xStep || 1),
    [canvas.xMin, canvas.xMax, canvas.xStep]
  );

  const yTicks = useMemo(
    () => buildTickValues(canvas.yMin, canvas.yMax, canvas.yStep || 1),
    [canvas.yMin, canvas.yMax, canvas.yStep]
  );

  const sampledFunctionPaths = useMemo(() => {
    const pathGen = line<SampledPoint>()
      .defined((d) => d.valid)
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(curveCatmullRom.alpha(0.5));

    return canvas.functions.map((fn) => {
      const pts = sampleMathFunction(
        fn,
        canvas.xMin,
        canvas.xMax,
        canvas.yMin,
        canvas.yMax
      );
      const d = pathGen(pts) || "";
      // Find a clean anchor point near the visible middle/end for optional label
      const validPts = pts.filter(
        (p) =>
          p.valid &&
          p.y >= canvas.yMin &&
          p.y <= canvas.yMax &&
          p.x >= canvas.xMin &&
          p.x <= canvas.xMax
      );
      const labelPt =
        validPts.length > 0
          ? validPts[Math.floor(validPts.length * 0.72)]
          : null;
      return { fn, d, labelPt };
    });
  }, [canvas.functions, canvas.xMin, canvas.xMax, canvas.yMin, canvas.yMax, xScale, yScale]);

  const curvePaths = useMemo(() => {
    return canvas.curves.map((curveSpec) => {
      const curveType = curveSpec.closed
        ? curveSpec.smooth !== false
          ? curveCatmullRomClosed.alpha(0.5)
          : curveLinearClosed
        : curveSpec.smooth !== false
          ? curveCatmullRom.alpha(0.5)
          : curveLinear;

      const gen = line<MathCurvePoint>()
        .x((pt) => xScale(pt.x))
        .y((pt) => yScale(pt.y))
        .curve(curveType);

      const d = gen(curveSpec.points) || "";
      const midPt =
        curveSpec.points[Math.floor(curveSpec.points.length / 2)] || null;
      return { curveSpec, d, midPt };
    });
  }, [canvas.curves, xScale, yScale]);

  const markerColors = useMemo(() => {
    const set = new Set<string>(["#1F1E1D", "#6B6A65"]);
    canvas.lines.forEach((l) => set.add(l.color));
    canvas.curves.forEach((c) => set.add(c.color));
    return Array.from(set);
  }, [canvas.lines, canvas.curves]);

  const colorToMarkerId = useMemo(() => {
    const map = new Map<string, string>();
    markerColors.forEach((color, idx) => {
      map.set(color, `arrow-${mode}-${canvas.id}-${idx}`);
    });
    return map;
  }, [markerColors, mode, canvas.id]);

  // Axis screen coordinates (if 0 is inside range, draw at 0; else clamp to edge)
  const originX = useMemo(() => {
    if (canvas.xMin <= 0 && canvas.xMax >= 0) return xScale(0);
    return xScale(canvas.xMin);
  }, [canvas.xMin, canvas.xMax, xScale]);

  const originY = useMemo(() => {
    if (canvas.yMin <= 0 && canvas.yMax >= 0) return yScale(0);
    return yScale(canvas.yMin);
  }, [canvas.yMin, canvas.yMax, yScale]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const relY = ((e.clientY - rect.top) / rect.height) * logicalHeight;
    const mathX = xScale.invert(relX);
    const mathY = yScale.invert(relY);
    if (
      mathX >= canvas.xMin - 1 &&
      mathX <= canvas.xMax + 1 &&
      mathY >= canvas.yMin - 1 &&
      mathY <= canvas.yMax + 1
    ) {
      setHoverCoord({ x: mathX, y: mathY });
    } else {
      setHoverCoord(null);
    }
  };

  const clipId = `plot-clip-${mode}-${canvas.id}`;
  const isCard = mode === "card";

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.75}
      maxScale={5}
      centerOnInit
      wheel={isCard ? { disabled: true } : { step: 0.14 }}
      panning={
        isCard
          ? { disabled: zoomScale <= 1.02, velocityDisabled: true }
          : { disabled: false }
      }
      pinch={{ disabled: false }}
      doubleClick={{ mode: "reset" }}
      onTransform={(_, state) => setZoomScale(state.scale)}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div
          className={`relative w-full bg-white select-none ${
            isCard ? "overflow-hidden" : "flex-1 min-h-0 flex items-center justify-center overflow-hidden"
          }`}
        >
          {/* Floating Translucent Controls at Top-Right */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-xl bg-white/85 backdrop-blur-md border border-[#E5E3DC] p-1 shadow-sm">
            <button
              type="button"
              onClick={() =>
                setShowGuideOverride((prev) =>
                  prev === null ? !isGuideVisible : !prev
                )
              }
              className={`min-w-[34px] min-h-[34px] sm:min-w-[30px] sm:min-h-[30px] px-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isGuideVisible
                  ? "bg-[#EFECE4] text-[#1F1E1D]"
                  : "text-[#6B6A65] hover:bg-[#FAF9F5] hover:text-[#1F1E1D]"
              }`}
              aria-label={
                language === "en" ? "Toggle X-Y grid" : "แสดง/ซ่อนเส้นพิกัด X-Y"
              }
              title={
                language === "en" ? "Toggle X-Y grid" : "แสดง/ซ่อนเส้นพิกัด X-Y"
              }
            >
              <Grid3x3 className="w-3.5 h-3.5 shrink-0" />
              {!isCard && (
                <span className="hidden sm:inline">
                  {language === "en" ? "Grid" : "เส้นพิกัด"}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => zoomOut(0.25)}
              className="min-w-[34px] min-h-[34px] sm:min-w-[30px] sm:min-h-[30px] rounded-lg text-[#6B6A65] hover:bg-[#FAF9F5] hover:text-[#1F1E1D] inline-flex items-center justify-center transition-colors cursor-pointer"
              aria-label={language === "en" ? "Zoom out" : "ซูมออก"}
              title={language === "en" ? "Zoom out" : "ซูมออก"}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => resetTransform()}
              className="min-h-[34px] sm:min-h-[30px] px-1.5 rounded-lg text-[11px] font-medium text-[#6B6A65] hover:bg-[#FAF9F5] hover:text-[#1F1E1D] tabular-nums inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
              aria-label={language === "en" ? "Reset zoom" : "รีเซ็ตการซูม"}
              title={language === "en" ? "Reset zoom" : "รีเซ็ตการซูม"}
            >
              {zoomScale !== 1 ? (
                <span>{Math.round(zoomScale * 100)}%</span>
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
            </button>

            <button
              type="button"
              onClick={() => zoomIn(0.25)}
              className="min-w-[34px] min-h-[34px] sm:min-w-[30px] sm:min-h-[30px] rounded-lg text-[#6B6A65] hover:bg-[#FAF9F5] hover:text-[#1F1E1D] inline-flex items-center justify-center transition-colors cursor-pointer"
              aria-label={language === "en" ? "Zoom in" : "ซูมเข้า"}
              title={language === "en" ? "Zoom in" : "ซูมเข้า"}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {isCard && onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="min-w-[34px] min-h-[34px] sm:min-w-[30px] sm:min-h-[30px] rounded-lg text-[#1F1E1D] hover:bg-[#EFECE4] inline-flex items-center justify-center transition-colors cursor-pointer border-l border-[#E5E3DC] pl-1"
                aria-label={
                  language === "en" ? "Open fullscreen" : "ขยายเต็มจอ"
                }
                title={language === "en" ? "Fullscreen" : "ขยายเต็มจอ"}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subtle Live Coordinate Readout (Bottom-Left) */}
          {hoverCoord && (
            <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-lg bg-white/85 backdrop-blur-sm border border-[#E5E3DC] px-2 py-0.5 text-[11px] text-[#6B6A65] tabular-nums">
              ({formatTickNumber(hoverCoord.x)}, {formatTickNumber(hoverCoord.y)})
            </div>
          )}

          {/* Zoomable & Pannable Stage */}
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: isCard ? "auto" : "100%",
              maxHeight: isCard ? "420px" : "100%",
            }}
            contentStyle={{
              width: "100%",
              height: isCard ? "auto" : "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverCoord(null)}
              className="relative w-full max-w-full bg-white"
              style={{
                aspectRatio: `${LOGICAL_WIDTH} / ${logicalHeight}`,
                maxHeight: isCard ? "420px" : "100%",
                width: isCard ? "100%" : "min(100%, 1080px)",
              }}
            >
              {/* Layer 1: Crisp Vector SVG (Grid, Axes, Curves, Lines, Vectors, Shapes, Points) */}
              <svg
                viewBox={`0 0 ${LOGICAL_WIDTH} ${logicalHeight}`}
                className="w-full h-full block"
              >
                <defs>
                  <clipPath id={clipId}>
                    <rect
                      x={pad.left}
                      y={pad.top}
                      width={LOGICAL_WIDTH - pad.left - pad.right}
                      height={logicalHeight - pad.top - pad.bottom}
                    />
                  </clipPath>
                  {markerColors.map((color) => {
                    const id = colorToMarkerId.get(color)!;
                    return (
                      <marker
                        key={id}
                        id={id}
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6.5"
                        markerHeight="6.5"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={color} />
                      </marker>
                    );
                  })}
                </defs>

                {/* Blank Paper Surface */}
                <rect
                  x={0}
                  y={0}
                  width={LOGICAL_WIDTH}
                  height={logicalHeight}
                  fill="#FFFFFF"
                />

                {/* Grid Lines (Only when gridMode !== 'invisible') */}
                {effectiveGridMode !== "invisible" && (
                  <g>
                    {xTicks.map((tx) => {
                      const px = xScale(tx);
                      return (
                        <line
                          key={`gx-${tx}`}
                          x1={px}
                          y1={pad.top}
                          x2={px}
                          y2={logicalHeight - pad.bottom}
                          stroke={
                            effectiveGridMode === "faint" ? "#EAE7DF" : "#EFECE4"
                          }
                          strokeWidth={1}
                          strokeDasharray={
                            effectiveGridMode === "faint" ? "3 3" : undefined
                          }
                        />
                      );
                    })}
                    {yTicks.map((ty) => {
                      const py = yScale(ty);
                      return (
                        <line
                          key={`gy-${ty}`}
                          x1={pad.left}
                          y1={py}
                          x2={LOGICAL_WIDTH - pad.right}
                          y2={py}
                          stroke={
                            effectiveGridMode === "faint" ? "#EAE7DF" : "#EFECE4"
                          }
                          strokeWidth={1}
                          strokeDasharray={
                            effectiveGridMode === "faint" ? "3 3" : undefined
                          }
                        />
                      );
                    })}
                  </g>
                )}

                {/* Faint Edge Numbers when invisible grid was toggled visible */}
                {effectiveGridMode === "faint" && (
                  <g fill="#8C8A84" fontSize="9.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {xTicks.map((tx, idx) =>
                      idx % 2 === 0 ? (
                        <text
                          key={`flx-${tx}`}
                          x={xScale(tx)}
                          y={logicalHeight - pad.bottom + 12}
                          textAnchor="middle"
                        >
                          {formatTickNumber(tx)}
                        </text>
                      ) : null
                    )}
                    {yTicks.map((ty, idx) =>
                      idx % 2 === 0 ? (
                        <text
                          key={`fly-${ty}`}
                          x={pad.left - 5}
                          y={yScale(ty) + 3}
                          textAnchor="end"
                        >
                          {formatTickNumber(ty)}
                        </text>
                      ) : null
                    )}
                  </g>
                )}

                {/* Full Axes & Ticks */}
                {effectiveGridMode === "axes" && (
                  <g>
                    {/* X Axis */}
                    <line
                      x1={pad.left}
                      y1={originY}
                      x2={LOGICAL_WIDTH - pad.right + 8}
                      y2={originY}
                      stroke="#6B6A65"
                      strokeWidth={1.5}
                      markerEnd={`url(#${colorToMarkerId.get("#6B6A65")})`}
                    />
                    {/* Y Axis */}
                    <line
                      x1={originX}
                      y1={logicalHeight - pad.bottom}
                      x2={originX}
                      y2={pad.top - 8}
                      stroke="#6B6A65"
                      strokeWidth={1.5}
                      markerEnd={`url(#${colorToMarkerId.get("#6B6A65")})`}
                    />

                    {/* X Tick Labels */}
                    {xTicks.map((tx) => {
                      if (Math.abs(tx) < 1e-9 && canvas.xMin <= 0 && canvas.xMax >= 0) {
                        return null;
                      }
                      const px = xScale(tx);
                      const labelY = Math.min(
                        logicalHeight - pad.bottom + 14,
                        originY + 14
                      );
                      return (
                        <g key={`tx-${tx}`}>
                          <line
                            x1={px}
                            y1={originY - 3}
                            x2={px}
                            y2={originY + 3}
                            stroke="#6B6A65"
                            strokeWidth={1}
                          />
                          <text
                            x={px}
                            y={labelY}
                            textAnchor="middle"
                            fontSize="10.5"
                            fill="#6B6A65"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatTickNumber(tx)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Y Tick Labels */}
                    {yTicks.map((ty) => {
                      if (Math.abs(ty) < 1e-9 && canvas.yMin <= 0 && canvas.yMax >= 0) {
                        return null;
                      }
                      const py = yScale(ty);
                      const labelX = Math.max(pad.left - 6, originX - 7);
                      return (
                        <g key={`ty-${ty}`}>
                          <line
                            x1={originX - 3}
                            y1={py}
                            x2={originX + 3}
                            y2={py}
                            stroke="#6B6A65"
                            strokeWidth={1}
                          />
                          <text
                            x={labelX}
                            y={py + 3.5}
                            textAnchor="end"
                            fontSize="10.5"
                            fill="#6B6A65"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatTickNumber(ty)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Origin 0 */}
                    {canvas.xMin <= 0 &&
                      canvas.xMax >= 0 &&
                      canvas.yMin <= 0 &&
                      canvas.yMax >= 0 && (
                        <text
                          x={originX - 6}
                          y={originY + 13}
                          textAnchor="end"
                          fontSize="10.5"
                          fill="#6B6A65"
                        >
                          0
                        </text>
                      )}

                    {/* Axis Name Labels */}
                    {canvas.xLabel && (
                      <text
                        x={LOGICAL_WIDTH - pad.right + 12}
                        y={originY + 4}
                        textAnchor="start"
                        fontSize="11.5"
                        fontWeight="600"
                        fill="#1F1E1D"
                      >
                        {canvas.xLabel}
                      </text>
                    )}
                    {canvas.yLabel && (
                      <text
                        x={originX}
                        y={pad.top - 13}
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight="600"
                        fill="#1F1E1D"
                      >
                        {canvas.yLabel}
                      </text>
                    )}
                  </g>
                )}

                {/* Clipped Mathematical Geometry Layer */}
                <g clipPath={`url(#${clipId})`}>
                  {/* Shapes (Rectangles & Circles/Ellipses) */}
                  {canvas.shapes.map((s, idx) => {
                    if (s.type === "circle" && s.r) {
                      const cx = xScale(s.x);
                      const cy = yScale(s.y);
                      const rx = Math.abs(xScale(s.x + s.r) - cx);
                      const ry = Math.abs(yScale(s.y + s.r) - cy);
                      return (
                        <ellipse
                          key={`shape-${idx}`}
                          cx={cx}
                          cy={cy}
                          rx={rx}
                          ry={ry}
                          fill={s.fill || "none"}
                          stroke={s.color}
                          strokeWidth={2}
                          strokeDasharray={s.dashed ? "5 4" : undefined}
                        />
                      );
                    }
                    if (s.type === "rect" && s.width && s.height) {
                      const x1 = xScale(s.x);
                      const x2 = xScale(s.x + s.width);
                      const y1 = yScale(s.y + s.height);
                      const y2 = yScale(s.y);
                      return (
                        <rect
                          key={`shape-${idx}`}
                          x={Math.min(x1, x2)}
                          y={Math.min(y1, y2)}
                          width={Math.abs(x2 - x1)}
                          height={Math.abs(y2 - y1)}
                          fill={s.fill || "none"}
                          stroke={s.color}
                          strokeWidth={2}
                          strokeDasharray={s.dashed ? "5 4" : undefined}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Sampled Math.js Function Curves */}
                  {sampledFunctionPaths.map(({ fn, d }, idx) =>
                    d ? (
                      <path
                        key={`fn-${idx}`}
                        d={d}
                        fill="none"
                        stroke={fn.color}
                        strokeWidth={fn.strokeWidth || 2.4}
                        strokeDasharray={fn.dashed ? "6 4" : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null
                  )}

                  {/* Point-to-Point Splines / Polygons / Curves */}
                  {curvePaths.map(({ curveSpec, d }, idx) => {
                    if (!d) return null;
                    const markerId = colorToMarkerId.get(curveSpec.color);
                    return (
                      <path
                        key={`curve-${idx}`}
                        d={d}
                        fill={curveSpec.fill || "none"}
                        stroke={curveSpec.color}
                        strokeWidth={curveSpec.strokeWidth || 2.2}
                        strokeDasharray={curveSpec.dashed ? "6 4" : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        markerEnd={
                          curveSpec.arrowEnd && markerId
                            ? `url(#${markerId})`
                            : undefined
                        }
                      />
                    );
                  })}

                  {/* Lines & Vectors */}
                  {canvas.lines.map((ln, idx) => {
                    const markerId = colorToMarkerId.get(ln.color);
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={xScale(ln.x1)}
                        y1={yScale(ln.y1)}
                        x2={xScale(ln.x2)}
                        y2={yScale(ln.y2)}
                        stroke={ln.color}
                        strokeWidth={ln.strokeWidth || 2}
                        strokeDasharray={ln.dashed ? "6 4" : undefined}
                        strokeLinecap="round"
                        markerStart={
                          ln.arrowStart && markerId
                            ? `url(#${markerId})`
                            : undefined
                        }
                        markerEnd={
                          ln.arrowEnd && markerId
                            ? `url(#${markerId})`
                            : undefined
                        }
                      />
                    );
                  })}

                  {/* Plotted Points */}
                  {canvas.points.map((pt, idx) => (
                    <circle
                      key={`pt-${idx}`}
                      cx={xScale(pt.x)}
                      cy={yScale(pt.y)}
                      r={4.2}
                      fill={pt.style === "hollow" ? "#FFFFFF" : pt.color}
                      stroke={pt.color}
                      strokeWidth={2}
                    />
                  ))}
                </g>

                {/* Crisp Inline Labels for Lines, Functions, Curves, and Points */}
                <g pointerEvents="none">
                  {canvas.lines.map((ln, idx) =>
                    ln.label ? (
                      <text
                        key={`line-lbl-${idx}`}
                        x={(xScale(ln.x1) + xScale(ln.x2)) / 2}
                        y={(yScale(ln.y1) + yScale(ln.y2)) / 2 - 7}
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight="600"
                        fill={ln.color}
                        stroke="#FFFFFF"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                      >
                        {ln.label}
                      </text>
                    ) : null
                  )}
                  {sampledFunctionPaths.map(({ fn, labelPt }, idx) =>
                    fn.label && labelPt ? (
                      <text
                        key={`fn-lbl-${idx}`}
                        x={xScale(labelPt.x)}
                        y={yScale(labelPt.y) - 9}
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight="600"
                        fill={fn.color}
                        stroke="#FFFFFF"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                      >
                        {fn.label}
                      </text>
                    ) : null
                  )}
                  {curvePaths.map(({ curveSpec, midPt }, idx) =>
                    curveSpec.label && midPt ? (
                      <text
                        key={`curve-lbl-${idx}`}
                        x={xScale(midPt.x)}
                        y={yScale(midPt.y) - 9}
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight="600"
                        fill={curveSpec.color}
                        stroke="#FFFFFF"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                      >
                        {curveSpec.label}
                      </text>
                    ) : null
                  )}
                  {canvas.points.map((pt, idx) =>
                    pt.label ? (
                      <text
                        key={`pt-lbl-${idx}`}
                        x={xScale(pt.x) + 8}
                        y={yScale(pt.y) - 6}
                        textAnchor="start"
                        fontSize="11.5"
                        fontWeight="600"
                        fill={pt.color}
                        stroke="#FFFFFF"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                      >
                        {pt.label}
                      </text>
                    ) : null
                  )}
                </g>
              </svg>

              {/* Layer 2: Percentage-Anchored KaTeX Math, Fractions, Matrices, Text Overlay */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {canvas.annotations.map((ann, idx) => {
                  const px = xScale(ann.x);
                  const py = yScale(ann.y);
                  const leftPct = (px / LOGICAL_WIDTH) * 100;
                  const topPct = (py / logicalHeight) * 100;

                  const translateX =
                    ann.align === "left"
                      ? "0%"
                      : ann.align === "right"
                        ? "-100%"
                        : "-50%";

                  const sizeClass =
                    ann.fontSize === "lg"
                      ? "text-[15px] sm:text-[17px]"
                      : ann.fontSize === "sm"
                        ? "text-[11px] sm:text-[12px]"
                        : "text-[13px] sm:text-[14px]";

                  const shouldUseLatex =
                    Boolean(ann.isLatex) ||
                    LATEX_COMMAND_REGEX.test(ann.content);

                  return (
                    <div
                      key={`ann-${idx}`}
                      className={`absolute leading-tight whitespace-nowrap ${sizeClass} ${
                        ann.background !== false
                          ? "bg-white/90 px-1.5 py-0.5 rounded-md"
                          : ""
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        transform: `translate(${translateX}, -50%)`,
                        color: ann.color,
                      }}
                    >
                      <MathLatexLabel
                        content={ann.content}
                        isLatex={shouldUseLatex}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  );
}
