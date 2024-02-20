import { mdiClockOutline } from "@mdi/js";
import clsx from "clsx";
import { Show, type ParentComponent, Component, JSX } from "solid-js";
import { Button, Icon } from "#components/primitives";

interface PriceTagProps {
  perSeat?: boolean;
  price: number;
  text?: "soft" | "base";
  class?: string;
}

const PriceTag: Component<PriceTagProps> = (props) => {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  });

  return (
    <span
      class={clsx(
        ":base: text-base",
        props.text === "soft" && "text-gray-500 dark:text-gray-400",
        props.class
      )}
    >
      {currencyFormatter.format(props.price)}
      <Show when={props.perSeat}>
        <span class="opacity-50 mx-0.5">/</span>seat
      </Show>
      <span class="opacity-50 mx-0.5">/</span>
      mo.
    </span>
  );
};
const PricingCard: ParentComponent<{
  title: string;
  price: string | PriceTagProps;
  containerClass?: string;
  glow?: boolean;
  gradient?: boolean;
  icon: string;
  action: string;
  link: string;
  features: Array<JSX.Element>;
}> = (props) => {
  return (
    <a
      class={clsx("block relative group h-full", props.containerClass)}
      target="_blank"
      href={props.link}
    >
      {props.glow && (
        <div class="bg-gradient-to-tr absolute !-top-1 !-left-1 !h-[calc(100%+0.5rem)] !w-[calc(100%+0.5rem)] -z-1 blur-lg"></div>
      )}
      <div
        class={clsx(
          "rounded-3xl overflow-hidden p-4 md:p-8 flex flex-col h-full",
          props.gradient ? "bg-gradient-to-tr text-white" : "bg-gray-100 dark:bg-gray-900"
        )}
      >
        <div class="flex items-start justify-center flex-col gap-2 flex-1">
          <div class="h-20 w-full flex justify-start items-center">
            <div class="relative">
              <Icon path={props.icon} class="h-20 w-20 fill-[url(#gradient)]" />
              <div class="absolute h-full w-full top-0 left-0 bg-gradient-to-tr opacity-30 dark:opacity-50 md:opacity-0 md:dark:opacity-0 transition-opacity md:group-hover:opacity-30 md:group-hover:dark:opacity-50 blur-xl"></div>
            </div>
          </div>
          <div class="flex flex-col justify-center items-start">
            <h3 class="text-lg md:text-xl underline-dashed group-hover:underline">{props.title}</h3>
            <Show
              when={typeof props.price === "object"}
              fallback={
                <span class="text-2xl md:text-3xl !font-bold">{props.price as string}</span>
              }
            >
              <PriceTag
                {...(props.price as PriceTagProps)}
                class="text-2xl md:text-3xl !font-bold"
              />
            </Show>
          </div>
          <div class="flex flex-col gap-2 text-xl md:text-2xl text-gray-500 dark:text-gray-400 flex-1 items-start justify-center">
            {props.children}
            <ul class="flex-1 list-disc pl-6 py-2">
              {props.features.map((feature) => (
                <li>{feature}</li>
              ))}
            </ul>
            <Button class="m-0" color="primary">
              {props.action}
            </Button>
          </div>
        </div>
      </div>
    </a>
  );
};

export { PricingCard };
