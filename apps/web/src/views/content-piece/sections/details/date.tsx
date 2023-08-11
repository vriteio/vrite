import { mdiCalendarOutline, mdiCalendarRemoveOutline, mdiCalendarPlusOutline } from "@mdi/js";
import { Component, Show } from "solid-js";
import dayjs from "dayjs";
import { Tooltip, IconButton, Input } from "#components/primitives";

interface DatePickerProps {
  date: string;
  editable?: boolean;
  setDate(date?: string | null): void;
}
interface DateInputProps {
  date?: string | null;
  editable?: boolean;
  setDate(date: string | null): void;
}

const DatePicker: Component<DatePickerProps> = (props) => {
  return (
    <Input
      type="date"
      value={dayjs(props.date).format("YYYY-MM-DD")}
      class="form-input"
      color={"base"}
      disabled={props.editable === false}
      onChange={(event) => {
        const { value } = event.currentTarget;

        if (!value) {
          props.setDate(undefined);

          return;
        }

        const parsedValue = dayjs(value, "YYYY-MM-DD");

        props.setDate(
          dayjs(props.date)
            .set("year", parsedValue.get("year"))
            .set("month", parsedValue.get("month"))
            .set("date", parsedValue.get("date"))
            .toISOString()
        );
      }}
    />
  );
};
const DateInput: Component<DateInputProps> = (props) => {
  return (
    <div class="flex items-center justify-start">
      <Tooltip
        text={props.date ? "Remove date" : "Add date"}
        side="right"
        enabled={props.editable !== false}
      >
        <IconButton
          path={(() => {
            if (props.editable === false) return mdiCalendarOutline;
            if (props.date) return mdiCalendarRemoveOutline;

            return mdiCalendarPlusOutline;
          })()}
          variant="text"
          onClick={() => {
            props.setDate(props.date ? null : new Date().toISOString());
          }}
          disabled={props.editable === false}
          badge={props.editable === false}
          hover={props.editable !== false}
        />
      </Tooltip>
      <Show
        when={props.date}
        fallback={
          <IconButton
            path={mdiCalendarRemoveOutline}
            label="No date"
            color={"base"}
            text="soft"
            onClick={() => {
              props.setDate(props.date ? null : new Date().toISOString());
            }}
            disabled={props.editable === false}
            badge={props.editable === false}
            hover={props.editable !== false}
          />
        }
      >
        <DatePicker date={props.date!} setDate={props.setDate} editable={props.editable} />
      </Show>
    </div>
  );
};

export { DateInput };
