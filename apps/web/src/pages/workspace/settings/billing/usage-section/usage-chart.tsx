import { LineChart } from "@andesine/components";
import { format } from "date-fns";
import { type Component, createMemo } from "solid-js";

interface UsageChartProps {
  currentDay: number;
  daily: Array<{ day: number; count: number }>;
  daysInMonth: number;
  limit: number;
  month: number;
  year: number;
}

const UsageChart: Component<UsageChartProps> = (props) => {
  const chartData = createMemo(() => {
    const dailyCounts = new Map(props.daily.map(({ count, day }) => [day, count]));
    const lastAvailableDay = Math.min(
      props.daysInMonth,
      props.daily.reduce((latestDay, { day }) => Math.max(latestDay, day), 0)
    );
    const chartEndDay = Math.min(
      props.daysInMonth,
      lastAvailableDay + (props.daily.length === 1 ? 1 : 0)
    );

    return Array.from({ length: props.daysInMonth }, (_, index) => {
      const day = index + 1;

      return {
        defined: day <= chartEndDay,
        x: format(new Date(props.year, props.month - 1, day), "MMM d"),
        y: dailyCounts.get(day) ?? 0
      };
    });
  });

  return (
    <LineChart
      data={chartData()}
      integerYTicks
      tooltipPlacement="point"
      tooltipClass="py-1.5 px-2 bg-gray-800 text-gray-50 ring-1 ring-gray-900 shadow-inner shadow-gray-900 rounded-lg"
      tooltipContent={(point) => (
        <div class="flex flex-col gap-0.5">
          <span class="opacity-50 leading-none">{point.x}</span>
          <span class="text-sm font-medium leading-none">{point.y.toLocaleString()} calls</span>
        </div>
      )}
    />
  );
};

export { UsageChart };
