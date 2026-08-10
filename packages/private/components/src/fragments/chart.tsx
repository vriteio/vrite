import clsx from "clsx";
import {
  type Component,
  createSignal,
  createMemo,
  For,
  Show,
  type JSX,
  onMount,
  onCleanup
} from "solid-js";
import { scaleLinear } from "d3-scale";
import { line, area, curveCatmullRom } from "d3-shape";
import { max } from "d3-array";
import { nanoid } from "nanoid";

interface LineChartDataPoint {
  defined?: boolean;
  x: string;
  y: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  formatY?: (v: number) => string;
  height?: number;
  class?: string;
  tooltipContent?: (point: LineChartDataPoint) => JSX.Element;
  tooltipClass?: string;
  tooltipPlacement?: "point" | "top-right";
  integerYTicks?: boolean;
  lineColor?: string;
}

const PAD = { top: 12, right: 12, bottom: 16, left: 32 };
const MAX_X_TICKS = 10;
const Y_TICK_COUNT = 4;
const MIN_Y_TICK_COUNT = 4;
const curve = curveCatmullRom.alpha(0.5);

const defaultFormatY = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
};
const LineChart: Component<LineChartProps> = (props) => {
  const areaGradientID = nanoid(8);
  const areaNoisePatternID = nanoid(8);
  const areaMaskID = nanoid(8);
  const lineGradientID = nanoid(8);
  const svgH = () => props.height ?? 176;
  const lineColor = () => props.lineColor ?? "var(--color-primary)";
  const formatY = () => props.formatY ?? defaultFormatY;
  const tooltipPlacement = () => props.tooltipPlacement ?? "point";

  let containerEl!: HTMLDivElement;
  const [svgWidth, setSvgWidth] = createSignal(0);
  const [hoverIdx, setHoverIdx] = createSignal<number | null>(null);
  const plotW = () => svgWidth() - PAD.left - PAD.right;
  const plotH = () => svgH() - PAD.top - PAD.bottom;
  const xScale = createMemo(() => {
    return scaleLinear()
      .domain([0, Math.max(props.data.length - 1, 1)])
      .range([PAD.left, PAD.left + plotW()]);
  });
  const yScale = createMemo(() => {
    const maxY =
      max(props.data, (d) => (d.defined === false ? undefined : d.y)) || MIN_Y_TICK_COUNT - 1;

    return (
      scaleLinear()
        // Add 10% headroom to the top of the chart so that the line doesn't touch the top of the chart
        .domain([0, maxY * 1.1])
        .range([PAD.top + plotH(), PAD.top])
        .nice(Y_TICK_COUNT)
    );
  });
  const yTicks = createMemo(() => {
    const ticks = yScale().ticks(Y_TICK_COUNT);

    return props.integerYTicks ? ticks.filter(Number.isInteger) : ticks;
  });
  const linePath = createMemo(() => {
    return (
      line<LineChartDataPoint>()
        .defined((d) => d.defined !== false)
        .x((_, i) => xScale()(i))
        .y((d) => yScale()(d.y))
        .curve(curve)(props.data) ?? ""
    );
  });
  const areaPath = createMemo(() => {
    return (
      area<LineChartDataPoint>()
        .defined((d) => d.defined !== false)
        .x((_, i) => xScale()(i))
        .y0(PAD.top + plotH())
        .y1((d) => yScale()(d.y))
        .curve(curve)(props.data) ?? ""
    );
  });
  const xTickIndices = createMemo(() => {
    const n = props.data.length;
    const step = Math.max(1, Math.ceil(n / MAX_X_TICKS));
    return n === 0
      ? []
      : props.data.map((_, i) => i).filter((i) => i === 0 || i % step === 0 || i === n - 1);
  });

  const handleMouseMove = (e: MouseEvent) => {
    const n = props.data.length;
    if (!n) return;
    const raw =
      ((e.clientX - (e.currentTarget as SVGSVGElement).getBoundingClientRect().left - PAD.left) /
        plotW()) *
      (n - 1);
    setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(raw))));
  };

  const hoverPoint = createMemo(() => {
    const idx = hoverIdx();
    const dp = idx !== null ? props.data[idx] : null;
    return dp && dp.defined !== false ? { dp, px: xScale()(idx!), py: yScale()(dp.y) } : null;
  });

  const defaultTooltipContent = (point: LineChartDataPoint): JSX.Element => (
    <div class="flex flex-col items-center gap-0.5">
      <span class="text-[0.625rem] opacity-70">{point.x}</span>
      <span class="font-bold text-xs" style={{ color: lineColor() }}>
        {point.y.toLocaleString()}
      </span>
    </div>
  );

  onMount(() => {
    const resizeObserver = new ResizeObserver(([entry]) => setSvgWidth(entry.contentRect.width));

    setSvgWidth(containerEl.getBoundingClientRect().width);
    resizeObserver.observe(containerEl);
    onCleanup(() => {
      resizeObserver?.disconnect();
    });
  });

  return (
    <div
      ref={containerEl}
      class={props.class ?? "w-full"}
      style={{ position: "relative", height: `${svgH()}px` }}
    >
      <svg
        width={svgWidth()}
        height={svgH()}
        style={{
          display: "block",
          overflow: "visible",
          visibility: svgWidth() > 0 ? "visible" : "hidden"
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={areaGradientID} x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="var(--color-secondary)" />
            <stop offset="35%" stop-color="var(--color-primary)" />
            <stop offset="100%" stop-color="var(--color-secondary)" />
          </linearGradient>
          <linearGradient id={lineGradientID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--color-secondary)" />
            <stop offset="50%" stop-color="var(--color-primary)" />
            <stop offset="100%" stop-color="var(--color-secondary)" />
          </linearGradient>
          <pattern id={areaNoisePatternID} width="96" height="96" patternUnits="userSpaceOnUse">
            <image href="/assets/noise.png" width="96" height="96" />
          </pattern>
          <linearGradient id={`${areaMaskID}-gradient`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0.75" />
            <stop offset="100%" stop-color="white" stop-opacity="0.05" />
          </linearGradient>
          <mask
            id={areaMaskID}
            x="0"
            y="0"
            width="1"
            height="1"
            maskContentUnits="objectBoundingBox"
          >
            <rect width="1" height="1" fill={`url(#${areaMaskID}-gradient)`} />
          </mask>
        </defs>
        <For each={yTicks()}>
          {(tick) => (
            <>
              <line
                x1={PAD.left}
                y1={yScale()(tick)}
                x2={svgWidth() - PAD.right}
                y2={yScale()(tick)}
                stroke="rgba(156,163,175,0.15)"
                stroke-width="1"
              />
              <text
                x={PAD.left - 6}
                y={yScale()(tick)}
                text-anchor="end"
                dominant-baseline="middle"
                font-size="10"
                fill="rgba(156,163,175,0.85)"
              >
                {formatY()(tick)}
              </text>
            </>
          )}
        </For>
        <g mask={`url(#${areaMaskID})`}>
          <path d={areaPath()} fill={`url(#${areaGradientID})`} />
          <path
            d={areaPath()}
            fill={`url(#${areaNoisePatternID})`}
            pointer-events="none"
            style={{ "mix-blend-mode": "overlay" }}
          />
        </g>
        <path
          d={linePath()}
          fill="none"
          stroke={`url(#${lineGradientID})`}
          stroke-width="1"
          stroke-linecap="round"
        />
        <For each={xTickIndices()}>
          {(xTickIndex) => (
            <text
              x={xScale()(xTickIndex)}
              y={svgH() - PAD.bottom + 14}
              text-anchor="middle"
              font-size="10"
              fill="rgba(156,163,175,0.85)"
            >
              {props.data[xTickIndex].x}
            </text>
          )}
        </For>
        <Show when={hoverPoint()}>
          <line
            x1={hoverPoint()!.px}
            y1={PAD.top}
            x2={hoverPoint()!.px}
            y2={PAD.top + plotH()}
            stroke="rgba(255,255,255,1)"
            stroke-width="1"
            stroke-dasharray="3 3"
          />
          <circle
            cx={hoverPoint()!.px}
            cy={hoverPoint()!.py}
            r="4.5"
            fill={lineColor()}
            stroke="white"
            stroke-width="2"
          />
        </Show>
      </svg>
      <Show when={hoverPoint()}>
        <div
          class="pointer-events-none absolute z-50"
          style={
            tooltipPlacement() === "top-right"
              ? {
                  right: "0.75rem",
                  top: "0.75rem"
                }
              : {
                  left: `${hoverPoint()!.px}px`,
                  top: `${hoverPoint()!.py}px`,
                  transform: "translate(-50%, calc(-100% - 0.625rem))"
                }
          }
        >
          <div
            class={clsx(
              "relative flex whitespace-nowrap rounded-md bg-gray-800 px-1.5 py-1 text-xs leading-none text-gray-50 ring-1 ring-gray-900 shadow-inner shadow-gray-900 shadow-opacity-20",
              props.tooltipClass
            )}
          >
            {(props.tooltipContent ?? defaultTooltipContent)(hoverPoint()!.dp)}
          </div>
        </div>
      </Show>
    </div>
  );
};

export { LineChart };
export type { LineChartDataPoint, LineChartProps };
