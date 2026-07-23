import { PinInput } from "@ark-ui/solid/pin-input";
import clsx from "clsx";
import { Component, Index, JSX, Show } from "solid-js";

interface OTPInputSlotProps {
  index: number;
  length: number;
  color?: "base" | "contrast";
  variant?: "solid" | "outlined";
}
interface OTPInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  length?: number;
  color?: "base" | "contrast";
  variant?: "solid" | "outlined";
  value: string;
  setValue?(value: string): void;
  onEnter?(event: KeyboardEvent): void;
}
const OTPInputColors = {
  base: `:base: bg-gray-200 dark:bg-gray-800 outline-gray-200 dark:outline-gray-800`,
  contrast: `:base: bg-white dark:bg-gray-850 outline-gray-200 dark:outline-gray-700 shadow-gray-200 dark:shadow-gray-900`
};
const OTPInputVariants = {
  solid: `:base: focus:outline-none focus:shadow-inner`,
  outlined: `:base: outline outline-1 shadow-md focus:outline-1 focus:bg-gray-100 dark:focus:bg-gray-950`
};

const OTPInputSlot: Component<OTPInputSlotProps> = (props) => {
  return (
    <div class="flex-1">
      <PinInput.Input
        index={props.index}
        class={clsx(
          ":base: rounded-md h-full w-full flex justify-center items-center text-2xl font-semibold text-center",
          OTPInputColors[props.color || "base"],
          OTPInputVariants[props.variant || "solid"],
          props.index === 0 && "rounded-l-lg",
          props.index === props.length - 1 && "rounded-r-lg"
        )}
      />
    </div>
  );
};
const OTPInput: Component<OTPInputProps> = (props) => {
  const length = () => props.length || 6;
  const slots = () => Array.from({ length: length() }).map((_, index) => index);
  const arrayValue = () => [
    ...props.value.split(""),
    ...Array(length() - props.value.length).fill("")
  ];

  return (
    <PinInput.Root
      class="flex h-12 gap-2"
      value={arrayValue()}
      placeholder=""
      onValueChange={(details) => {
        props.setValue?.(details.valueAsString);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter") {
          props.onEnter?.(event);
        }
      }}
      otp
    >
      <PinInput.Control class="flex h-12 gap-2">
        <Index each={slots()}>
          {(index) => {
            return (
              <>
                <OTPInputSlot
                  index={index()}
                  length={length()}
                  color={props.color}
                  variant={props.variant}
                />
                <Show when={index() + 1 === length() / 2}>
                  <div class="w-4 flex justify-center items-center">
                    <div class="h-0.5 w-full bg-gray-400 dark:text-gray-500 rounded-full"></div>
                  </div>
                </Show>
              </>
            );
          }}
        </Index>
      </PinInput.Control>
      <PinInput.HiddenInput />
    </PinInput.Root>
  );
};
export { OTPInput };
