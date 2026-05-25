import { clientOnly } from "@solidjs/start";
import clsx from "clsx";
import { Component, For, JSX, Show } from "solid-js";

interface OTPInputSlotProps {
  index: number;
  color?: "base" | "contrast";
}
interface OTPInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  length?: number;
  color?: "base" | "contrast";
  value: string;
  setValue?(value: string): void;
  onEnter?(event: KeyboardEvent): void;
}

const LazyOTPInput = clientOnly(async () => {
  const { default: OTPField } = await import("@corvu/otp-field");
  const OTPInputSlot: Component<OTPInputSlotProps> = (props) => {
    const context = OTPField.useContext();
    const char = () => context.value()[props.index];
    const isActive = () => context.activeSlots().includes(props.index);
    const showFakeCaret = () => context.value().length === props.index && context.isInserting();

    return (
      <div
        class={clsx(
          "rounded-md flex-1 flex justify-center items-center text-2xl font-semibold",
          (!props.color || props.color === "base") && "bg-gray-200 dark:bg-gray-900",
          props.color === "contrast" && "bg-gray-200 dark:bg-gray-800",
          isActive() && "shadow-inner",
          props.index === 0 && "rounded-l-lg",
          props.index === context.maxLength() - 1 && "rounded-r-lg"
        )}
      >
        <div class="relative">
          {char()}
          <Show when={showFakeCaret()}>
            <span class="animate-caret-blink">|</span>
          </Show>
          <Show when={!showFakeCaret() && char() && isActive() && context.activeSlots().length > 1}>
            <div class="absolute top-0 left-0 h-full w-full bg-blue-400 opacity-20 rounded-sm" />
          </Show>
        </div>
      </div>
    );
  };
  const OTPInput: Component<OTPInputProps> = (props) => {
    const length = () => props.length || 6;
    const slots = () => Array.from({ length: length() }).map((_, index) => index);

    return (
      <OTPField
        class="flex h-12 gap-2"
        maxLength={length()}
        value={props.value}
        onValueChange={(value) => {
          props.setValue?.(value);
        }}
      >
        <OTPField.Input
          onKeyUp={(
            event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }
          ) => {
            if (event.key === "Enter") {
              props.onEnter?.(event);
            }
          }}
        />
        <For each={slots()}>
          {(slot, index) => {
            return (
              <>
                <OTPInputSlot index={slot} color={props.color} />
                <Show when={index() + 1 === length() / 2}>
                  <div class="w-4 flex justify-center items-center">
                    <div class="h-0.5 w-full bg-gray-400 dark:text-gray-500 rounded-full"></div>
                  </div>
                </Show>
              </>
            );
          }}
        </For>
      </OTPField>
    );
  };

  return { default: OTPInput };
});
const OTPInput: Component<OTPInputProps> = (props) => {
  return (
    <LazyOTPInput
      {...props}
      fallback={<div class="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>}
    />
  );
};

export { OTPInput };
