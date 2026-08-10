import clsx from "clsx";
import { type Component, type ComponentProps, type JSX } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { Menu } from "@ark-ui/solid/menu";
import { Card } from "../card";
import { Fragment } from "../fragment";

interface DropdownDesktopMenuProps {
  cardProps?: Partial<ComponentProps<typeof Card>>;
  children: JSX.Element;
  opened: boolean;
  portal?: boolean;
}

const DropdownDesktopMenu: Component<DropdownDesktopMenuProps> = (props) => (
  <Dynamic component={props.portal === false ? Fragment : Portal}>
    <Menu.Positioner class="select-none">
      <Menu.Content
        asChild={(contentProps) => (
          <Card
            {...contentProps()}
            {...(props.cardProps || {})}
            style={{
              ...(props.cardProps?.style || {}),
              "transform-origin": "var(--transform-origin)"
            }}
            shade
            class={clsx(
              ":base-2: z-50 flex min-w-32 transform flex-col select-none rounded-[0.625rem] p-1 pointer-events-auto shadow-black shadow-opacity-15 transition duration-200",
              props.opened
                ? ":base-2: visible translate-y-0 opacity-100"
                : ":base-2: invisible opacity-0 !shadow-none",
              props.cardProps?.class
            )}
          >
            <div class="min-w-fit flex-1 overflow-auto scrollbar-sm">{props.children}</div>
          </Card>
        )}
      />
    </Menu.Positioner>
  </Dynamic>
);

export { DropdownDesktopMenu };
