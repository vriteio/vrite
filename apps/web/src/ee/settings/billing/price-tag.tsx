import clsx from "clsx";
import { Component, Show } from "solid-js";

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

export { PriceTag };
