import clsx from "clsx";
import { type ComponentProps, splitProps, type ParentComponent } from "solid-js";
import { Card } from "./card";
import { Overlay } from "./overlay";
import { Dynamic } from "solid-js/web";
import { Fragment } from "./fragment";

interface DialogProps extends Omit<ComponentProps<typeof Overlay>, "children"> {
  cardClass?: string;
  backdrop?: boolean;
  size?: "small" | "medium" | "large" | "xlarge";
}

const dialogWidths: Record<NonNullable<DialogProps["size"]>, string> = {
  small: ":base-2: w-sm",
  medium: ":base-2: w-md",
  large: ":base-2: w-lg",
  xlarge: ":base-2: w-xl"
};
const Dialog: ParentComponent<DialogProps> = (props) => {
  const [localProps, overlayProps] = splitProps(props, ["cardClass", "children", "size"]);
  const backdropCardProps: ComponentProps<typeof Card> = {
    color: "contrast",
    class: ":base-2: p-1.5"
  };

  return (
    <Overlay
      {...overlayProps}
      shadeClass={clsx(props.backdrop === false && ":base-2: bg-none", overlayProps.shadeClass)}
    >
      <Dynamic
        component={props.backdrop === false ? Fragment : Card}
        {...(props.backdrop === false ? {} : backdropCardProps)}
      >
        <Card
          class={clsx(
            ":base-2: flex max-w-[calc(100vw-2rem)] flex-col rounded-xl gap-3 p-3 md:p-4",
            dialogWidths[localProps.size || "medium"],
            localProps.cardClass
          )}
          shade
        >
          {localProps.children}
        </Card>
      </Dynamic>
    </Overlay>
  );
};

export { Dialog };
export type { DialogProps };
