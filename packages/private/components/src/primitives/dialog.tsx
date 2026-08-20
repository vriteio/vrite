import clsx from "clsx";
import { type ComponentProps, splitProps, type ParentComponent } from "solid-js";
import { Card } from "./card";
import { Overlay } from "./overlay";

interface DialogProps extends Omit<ComponentProps<typeof Overlay>, "children"> {
  cardClass?: string;
  size?: "small" | "medium" | "large";
}

const dialogWidths: Record<NonNullable<DialogProps["size"]>, string> = {
  small: "w-sm",
  medium: "w-md",
  large: "w-lg"
};
const Dialog: ParentComponent<DialogProps> = (props) => {
  const [localProps, overlayProps] = splitProps(props, ["cardClass", "children", "size"]);

  return (
    <Overlay {...overlayProps}>
      <Card color="contrast" class="p-1.5">
        <Card
          class={clsx(
            "flex max-w-[calc(100vw-2rem)] flex-col rounded-xl gap-3 p-3 md:p-4",
            dialogWidths[localProps.size || "medium"],
            localProps.cardClass
          )}
          shade
        >
          {localProps.children}
        </Card>
      </Card>
    </Overlay>
  );
};

export { Dialog };
export type { DialogProps };
