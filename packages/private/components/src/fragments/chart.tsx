import clsx from "clsx";
import { Component, createSignal, createMemo, For, Show, JSX, onMount, onCleanup } from "solid-js";
import { scaleLinear } from "d3-scale";
import { line, area, curveCatmullRom } from "d3-shape";
import { max } from "d3-array";
import { nanoid } from "nanoid";

interface LineChartDataPoint {
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
  lineColor?: string;
  useThemeGradient?: boolean;
}

const PAD = { top: 12, right: 16, bottom: 30, left: 44 };
const MAX_X_TICKS = 10;
const Y_TICK_COUNT = 4;
const curve = curveCatmullRom.alpha(0.5);

const defaultFormatY = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
};
const LineChart: Component<LineChartProps> = (props) => {
  const areaGradientId = nanoid(8);
  const lineGradientId = nanoid(8);
  const svgH = () => props.height ?? 176;
  const lineColor = () => props.lineColor ?? "var(--color-primary)";
  const formatY = () => props.formatY ?? defaultFormatY;
  const tooltipPlacement = () => props.tooltipPlacement ?? "point";

  let containerEl!: HTMLDivElement;
  const [svgWidth, setSvgWidth] = createSignal(500);
  const [hoverIdx, setHoverIdx] = createSignal<number | null>(null);
  const plotW = () => svgWidth() - PAD.left - PAD.right;
  const plotH = () => svgH() - PAD.top - PAD.bottom;
  const xScale = createMemo(() => {
    return scaleLinear()
      .domain([0, Math.max(props.data.length - 1, 1)])
      .range([PAD.left, PAD.left + plotW()]);
  });
  const yScale = createMemo(() => {
    return scaleLinear()
      .domain([0, max(props.data, (d) => d.y) || 1])
      .range([PAD.top + plotH(), PAD.top])
      .nice(Y_TICK_COUNT);
  });
  const yTicks = createMemo(() => yScale().ticks(Y_TICK_COUNT));
  const linePath = createMemo(() => {
    return (
      line<LineChartDataPoint>()
        .x((_, i) => xScale()(i))
        .y((d) => yScale()(d.y))
        .curve(curve)(props.data) ?? ""
    );
  });
  const areaPath = createMemo(() => {
    return (
      area<LineChartDataPoint>()
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
    return dp ? { dp, px: xScale()(idx!), py: yScale()(dp.y) } : null;
  });

  const defaultTooltipContent = (point: LineChartDataPoint): JSX.Element => (
    <div class="flex flex-col items-center gap-0.5">
      <span class="text-[10px] opacity-70">{point.x}</span>
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
        style="display:block;overflow:visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3" />
            <stop offset="100%" stop-color="var(--color-secondary)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--color-secondary)" stop-opacity="1" />
          </linearGradient>
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
        <path d={areaPath()} fill={`url(#${areaGradientId})`} />
        <path
          d={linePath()}
          fill="none"
          stroke={props.useThemeGradient ? `url(#${lineGradientId})` : lineColor()}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
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
            stroke="rgba(156,163,175,0.4)"
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
                  transform: "translate(-50%, calc(-100% - 10px))"
                }
          }
        >
          <div
            class={clsx(
              "relative flex whitespace-nowrap rounded-md bg-gray-800 px-1.5 py-1 text-xs leading-none text-gray-50 ring-1 ring-gray-900 shadow-inner shadow-gray-900 shadow-opacity-20 dark:bg-gray-50 dark:text-gray-800 dark:ring-gray-200 dark:shadow-gray-200",
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
