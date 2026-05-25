import { Component, createMemo } from "solid-js";
import { LineChart } from "@andesine/components";

interface UsageChartProps {
  daily: { day: number; count: number }[];
  currentDay: number;
  limit: number;
  daysInMonth: number;
  year: number;
  month: number;
}

const formatXLabel = (year: number, month: number, day: number): string =>
  new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit"
  });

const UsageChart: Component<UsageChartProps> = (props) => {
  const chartData = createMemo(() =>
    props.daily
      .filter((d) => d.day <= props.currentDay)
      .map((d) => ({
        x: formatXLabel(props.year, props.month, d.day),
        y: d.count
      }))
  );

  return (
    <LineChart
      data={chartData()}
      useThemeGradient
      tooltipPlacement="top-right"
      tooltipClass="rounded-xl border border-white/10 bg-gray-950/88 px-2.5 py-2 text-white shadow-lg shadow-black/25 dark:border-white/10 dark:bg-gray-950/88 dark:text-white dark:ring-0"
      tooltipContent={(point) => (
        <div class="flex flex-col gap-1 px-0.5">
          <span class="text-[10px] uppercase tracking-[0.12em] text-white/60">{point.x}</span>
          <span class="text-sm font-semibold text-white">{point.y.toLocaleString()} calls</span>
        </div>
      )}
    />
  );
};

export { UsageChart };
