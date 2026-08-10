import clsx from "clsx";
import {
  type Component,
  createSignal,
  type JSX,
  createContext,
  type ParentComponent,
  useContext,
  type Accessor,
  type Setter,
  createEffect,
  on,
  onCleanup
} from "solid-js";
import { Tooltip as BaseTooltip } from "@ark-ui/solid/tooltip";
import { Portal } from "solid-js/web";
import { createMediaQuery } from "@solid-primitives/media";
import { nanoid } from "nanoid";

interface TooltipProps {
  children: JSX.Element;
  content: JSX.Element;
  class?: string;
  side?: "top" | "bottom" | "left" | "right";
  enabled?: boolean;
  fixed?: boolean;
  wrapperClass?: string;
  wrapperStyle?: JSX.CSSProperties;
  open?: boolean;
  openDelay?: number;
  closeDelay?: number;
  offset?: { mainAxis?: number; crossAxis?: number };
}

const OPEN_DELAY = 500;
const CLOSE_DELAY = 250;
const TRANSITION_DURATION = 100;
const TooltipContext = createContext<{
  activeTooltip: Accessor<string>;
  visibleTooltip: Accessor<string>;
  setActiveTooltip: Setter<string>;
} | null>(null);
const Tooltip: Component<TooltipProps> = (props) => {
  const { activeTooltip, visibleTooltip, setActiveTooltip } = useContext(TooltipContext)!;
  const md = createMediaQuery("(min-width: 768px)");
  const enabled = (): boolean => {
    return typeof props.enabled === "boolean" ? props.enabled : true;
  };
  const placement = () => props.side || "bottom";
  const tooltipID = nanoid();

  onCleanup(() => {
    setActiveTooltip((activeTooltip) => (activeTooltip === tooltipID ? "" : activeTooltip));
  });

  return (
    <BaseTooltip.Root
      openDelay={props.openDelay ?? OPEN_DELAY}
      closeDelay={props.closeDelay ?? CLOSE_DELAY}
      open={props.open !== undefined ? props.open : activeTooltip() === tooltipID}
      onOpenChange={({ open }) => {
        if (props.open !== undefined) return;
        setActiveTooltip((activeTooltip) => {
          if (open) {
            return tooltipID;
          } else {
            return activeTooltip === tooltipID ? "" : activeTooltip;
          }
        });
      }}
      positioning={{
        strategy: props.fixed ? "fixed" : "absolute",
        offset: { mainAxis: props.offset?.mainAxis ?? 6, crossAxis: props.offset?.crossAxis ?? 0 },
        placement: placement()
      }}
      disabled={!md() || !enabled()}
      lazyMount
      unmountOnExit
    >
      <BaseTooltip.Trigger
        asChild={(triggerProps) => (
          <div
            {...triggerProps({
              class: clsx(
                `:base: relative flex flex-col items-center justify-center`,
                props.wrapperClass
              ),
              style: props.wrapperStyle
            })}
          >
            {props.children}
          </div>
        )}
      />
      <Portal>
        <BaseTooltip.Positioner class="flex justify-center items-center">
          <BaseTooltip.Content
            class={clsx(
              `:base: relative flex text-xs whitespace-nowrap py-1 px-1.5 leading-none rounded-md bg-gray-800 text-gray-50 z-60 pointer-events-none ring-1 ring-gray-900 shadow-inner shadow-gray-900`,
              `:base: data-[state='open']:(scale-100 opacity-100) data-[state='closed']:(scale-90 opacity-0)`,
              !visibleTooltip() && `:base: transition`,
              props.class
            )}
            style={{
              ...(!visibleTooltip() && {
                "transition-duration": `${TRANSITION_DURATION}ms`
              })
            }}
          >
            {props.content}
            <div class="absolute h-full w-full top-0 left-0 shadow-md shadow-gray-900 shadow-opacity-20 -z-1 rounded-md" />
          </BaseTooltip.Content>
        </BaseTooltip.Positioner>
      </Portal>
    </BaseTooltip.Root>
  );
};
const TooltipProvider: ParentComponent = (props) => {
  const [activeTooltip, setActiveTooltip] = createSignal("");
  const [visibleTooltip, setVisibleTooltip] = createSignal("");

  let timeoutHandle: number | undefined;

  createEffect(
    on(activeTooltip, (newActiveTooltip, previousActiveTooltip) => {
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }

      if (newActiveTooltip && !previousActiveTooltip) {
        timeoutHandle = window.setTimeout(() => {
          setVisibleTooltip(newActiveTooltip);
        }, TRANSITION_DURATION);
      } else {
        setVisibleTooltip(newActiveTooltip);
      }
    })
  );
  return (
    <TooltipContext.Provider
      value={{
        activeTooltip,
        visibleTooltip,
        setActiveTooltip
      }}
    >
      {props.children}
    </TooltipContext.Provider>
  );
};
const useTooltipContext = () => useContext(TooltipContext)!;

export { Tooltip, TooltipProvider, useTooltipContext };
