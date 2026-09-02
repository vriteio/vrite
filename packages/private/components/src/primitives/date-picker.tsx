import clsx from "clsx";
import { format, isValid, parseISO } from "date-fns";
import {
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show
} from "solid-js";
import { Button, IconButton } from "./button";
import { Dropdown } from "./dropdown";
import { Input } from "./input";

interface DatePickerProps {
  value?: string;
  class?: string;
  disabled?: boolean;
  placement?: ComponentProps<typeof Dropdown>["placement"];
  placeholder?: string;
  portal?: boolean;
  positioningStrategy?: ComponentProps<typeof Dropdown>["positioningStrategy"];
  showCalendarIcon?: boolean;
  triggerClass?: string;
  setValue?(value: string): void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const formatISODate = (date: Date): string => format(date, "yyyy-MM-dd");
const formatPrimaryDate = (date: Date): string => format(date, "MMM d, yyyy");
const parseISODate = (value?: string): Date => {
  const date = value ? parseISO(value) : new Date();

  return isValid(date) ? date : new Date();
};
const formatDatePickerValue = (value: string): string => {
  return formatPrimaryDate(parseISODate(value));
};
const DatePicker: Component<DatePickerProps> = (props) => {
  const initialDate = parseISODate(props.value);
  const [opened, setOpened] = createSignal(false);
  const [inputValue, setInputValue] = createSignal(
    props.value ? formatDatePickerValue(props.value) : ""
  );
  const [year, setYear] = createSignal(initialDate.getFullYear());
  const [month, setMonth] = createSignal(initialDate.getMonth());
  const monthLabel = createMemo(() => {
    return format(new Date(year(), month()), "MMMM yyyy");
  });
  const days = createMemo(() => {
    const firstDay = new Date(year(), month(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const dayCount = new Date(year(), month() + 1, 0).getDate();
    const gridDayCount = Math.ceil((offset + dayCount) / 7) * 7;

    return Array.from({ length: gridDayCount }, (_, index) => {
      return new Date(year(), month(), index - offset + 1);
    });
  });
  const changeMonth = (change: number) => {
    const date = new Date(year(), month() + change, 1);

    setYear(date.getFullYear());
    setMonth(date.getMonth());
  };
  const resetInputValue = () => {
    setInputValue(props.value ? formatDatePickerValue(props.value) : "");
  };
  const selectDay = (date: Date) => {
    const value = formatISODate(date);

    setInputValue(formatPrimaryDate(date));
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    props.setValue?.(value);
    setOpened(false);
  };
  const commitInputValue = async () => {
    const value = inputValue().trim();

    if (!value) {
      props.setValue?.("");
      return;
    }

    const { parseDate } = await import("chrono-node/en");
    const date = parseDate(value, new Date(), { forwardDate: true });

    if (!date || Number.isNaN(date.getTime())) {
      resetInputValue();
      return;
    }

    setInputValue(formatPrimaryDate(date));
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    props.setValue?.(formatISODate(date));
  };
  const handleOpenedChange = (nextOpened: boolean) => {
    if (opened() && !nextOpened) void commitInputValue();

    setOpened(nextOpened);
  };

  createEffect(() => {
    const value = props.value || "";

    setInputValue(value ? formatDatePickerValue(value) : "");
  });

  return (
    <Dropdown
      class={props.class}
      opened={opened()}
      setOpened={handleOpenedChange}
      disabled={props.disabled}
      placement={props.placement || "bottom-start"}
      portal={props.portal}
      positioningStrategy={props.positioningStrategy}
      cardProps={{ class: ":base-2: p-0" }}
      trigger={() => (
        <Button
          type="button"
          class={clsx(
            ":base-2: flex w-full min-w-0 items-center justify-start",
            props.showCalendarIcon !== false && ":base-2: p-1",
            props.triggerClass
          )}
          data-state={opened() ? "open" : "closed"}
          variant="outlined"
          color="contrast"
          size="small"
          disabled={props.disabled}
        >
          <Show when={props.showCalendarIcon !== false}>
            <span class=":base: i-lucide:calendar h-5 w-5 shrink-0 text-gray-400" />
          </Show>
          <span
            class={clsx(
              ":base: min-w-0 flex-1 truncate pr-1 text-start",
              props.showCalendarIcon !== false && ":base: pl-1",
              !props.value && ":base: text-gray-400"
            )}
          >
            {props.value ? formatDatePickerValue(props.value) : props.placeholder || "Select date"}
          </span>
          <span class=":base: i-lucide:chevrons-up-down ml-auto shrink-0 text-gray-400" />
        </Button>
      )}
    >
      <div class=":base: flex w-full flex-col gap-2 p-2">
        <Input
          ref={(input) => {
            requestAnimationFrame(() => {
              if (!opened()) return;

              input.focus();
              input.select();
            });
          }}
          class=":base-2: w-full min-w-0 bg-gray-50 rounded-md"
          color="contrast"
          variant="outlined"
          size="small"
          value={inputValue()}
          setValue={setInputValue}
          onConfirm={commitInputValue}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => event.stopPropagation()}
          onEnter={(event) => event.preventDefault()}
        />
        <div class=":base: flex items-center justify-between">
          <IconButton
            type="button"
            size="small"
            variant="text"
            text="softer"
            icon="i-lucide:chevron-left"
            aria-label="Previous month"
            class="focus-visible:!outline-none"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => changeMonth(-1)}
          />
          <span class=":base: text-sm font-medium text-gray-700">{monthLabel()}</span>
          <IconButton
            type="button"
            size="small"
            variant="text"
            text="softer"
            icon="i-lucide:chevron-right"
            aria-label="Next month"
            class="focus-visible:!outline-none"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => changeMonth(1)}
          />
        </div>
        <div class=":base: grid grid-cols-7 gap-1">
          <For each={WEEKDAYS}>
            {(weekday) => <div class=":base: text-center text-xs text-gray-500">{weekday}</div>}
          </For>
          <For each={days()}>
            {(day) => {
              const value = () => formatISODate(day);
              const adjacentMonth = () => day.getMonth() !== month();
              const selected = () => props.value === value();
              const today = () => formatISODate(new Date()) === value();

              return (
                <Button
                  type="button"
                  color={selected() ? "primary" : "contrast"}
                  variant={selected() || today() ? "outlined" : "text"}
                  text={adjacentMonth() ? "soft" : undefined}
                  class={clsx(
                    ":base-2: aspect-square p-1 flex justify-center items-center",
                    (selected() || today()) && ":base-2: focus-visible:!outline-none"
                  )}
                  size="xs"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => selectDay(day)}
                >
                  <div class=":base: h-5 w-5 flex justify-center items-center font-mono">
                    {day.getDate()}
                  </div>
                </Button>
              );
            }}
          </For>
        </div>
      </div>
    </Dropdown>
  );
};

export { DatePicker, formatDatePickerValue };
