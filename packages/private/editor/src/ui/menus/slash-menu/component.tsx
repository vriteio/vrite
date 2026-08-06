import { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import {
  type Component,
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { type Editor, type Range } from "@tiptap/core";
import clsx from "clsx";
import {
  Button,
  Card,
  createRef,
  Fragment,
  type Ref,
  ScrollShadow,
  Shortcut,
  Tooltip,
  useTooltipContext
} from "@andesine/components";
import { Dynamic } from "solid-js/web";

interface SlashMenuItem {
  icon: string;
  label: string;
  group: string;
  markdown?: string;
  shortcut?: string;
  ref: Ref<HTMLElement | null>;
  command(params: { editor: Editor; range: Range }): boolean | Promise<boolean>;
}
interface SlashMenuState {
  readonly items: SlashMenuItem[];
  readonly range: { from: number; to: number };
  readonly query: string;
  readonly editor: Editor;
  readonly clientRect: SuggestionProps<SlashMenuItem>["clientRect"];
  readonly decorationNode: SuggestionProps<SlashMenuItem>["decorationNode"];
  readonly text: string;
  readonly visible: boolean;
  command(item: SlashMenuItem): void;
  close(): void;
  setOnKeyDown(callback: (props: SuggestionKeyDownProps) => boolean): void;
}
interface SlashMenuProps {
  state: SlashMenuState;
}

const SECTION_HEADING_HEIGHT = 24;
const ITEM_HEIGHT = 28;
const MENU_PADDING_TOP = 4;
const SlashMenu: Component<SlashMenuProps> = (props) => {
  const { setActiveTooltip } = useTooltipContext();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [blockHoverSelect, setBlockHoverSelect] = createSignal(false);
  const selectItem = (index: number): void => {
    const item = props.state.items[index];

    if (item) {
      props.state.command(item);
    }
  };
  const getItemPosition = (items: SlashMenuItem[], index: number): number => {
    let position = MENU_PADDING_TOP;

    for (let i = 0; i < index; i++) {
      position += ITEM_HEIGHT;

      if (i === 0 || items[i].group !== items[i - 1].group) {
        position += SECTION_HEADING_HEIGHT;
      }
    }

    return position;
  };
  const scrollToSelectedItem = (): void => {
    const item = props.state.items[selectedIndex()];

    if (item) {
      const scrollableContainer = scrollableContainerRef();

      if (scrollableContainer) {
        const itemIndex = selectedIndex();
        const itemTop = getItemPosition(props.state.items, itemIndex);
        const newTop = itemTop - scrollableContainer.clientHeight / 2 + ITEM_HEIGHT / 2;
        const height = scrollableContainer.clientHeight;
        const top = scrollableContainer.scrollTop;
        const distance = Math.abs(top - newTop);

        scrollableContainer.scrollTo({
          behavior: distance > height / 2 ? "smooth" : "auto",
          top: newTop
        });
      }
    }
  };
  const upHandler = (): void => {
    const itemCount = props.state.items.length;

    if (itemCount === 0) return;

    setSelectedIndex((selectedIndex() + itemCount - 1) % itemCount);
    scrollToSelectedItem();
  };
  const downHandler = (): void => {
    const itemCount = props.state.items.length;

    if (itemCount === 0) return;

    setSelectedIndex((selectedIndex() + 1) % itemCount);
    scrollToSelectedItem();
  };
  const enterHandler = (): void => {
    selectItem(selectedIndex());
  };
  const onKeyDown = ({ event }: SuggestionKeyDownProps): boolean => {
    setBlockHoverSelect(true);
    if (event.key === "ArrowUp") {
      upHandler();

      return true;
    }

    if (event.key === "ArrowDown") {
      downHandler();

      return true;
    }

    if (event.key === "Enter") {
      enterHandler();

      return true;
    }

    return false;
  };

  onMount(() => {
    props.state.setOnKeyDown(onKeyDown);
  });
  createEffect(() => {
    if (!props.state.visible) {
      setActiveTooltip("");
    }
  });
  onCleanup(() => {
    setActiveTooltip("");
  });
  createEffect(
    on(
      () => props.state.items,
      () => {
        setSelectedIndex(0);
      }
    )
  );

  return (
    <Card
      class={clsx(
        "md:w-64 m-0 overflow-hidden transition duration-200 transform origin-top-left p-2 pt-1 relative bg-white"
      )}
      data-menu
      shade
    >
      <ScrollShadow
        scrollableContainerRef={scrollableContainerRef}
        offset={{ top: "0.25rem", bottom: "0.5rem" }}
      />
      <div
        class={clsx("w-full h-full overflow-auto max-h-96 scrollbar-sm")}
        ref={setScrollableContainerRef}
      >
        <For
          each={props.state.items}
          fallback={
            <Button
              variant="text"
              text="soft"
              size="small"
              class="justify-start text-start w-[calc(100%-0.5rem)]"
              disabled
            >
              No results
            </Button>
          }
        >
          {(menuItem, index) => (
            <>
              <Show when={menuItem.group !== props.state.items[index() - 1]?.group}>
                <div class="px-2 font-medium text-gray-400 text-xs h-6 flex items-center justify-start">
                  {menuItem.group}
                </div>
              </Show>
              <Dynamic
                component={menuItem.shortcut ? Tooltip : Fragment}
                {...(menuItem.shortcut && {
                  wrapperClass: props.state.items.length > 11 ? "w-[calc(100%-0.25rem)]" : "w-full",
                  enabled: !blockHoverSelect(),
                  content: <Shortcut shortcut={menuItem.shortcut || ""} />,
                  fixed: true,
                  side: "right"
                })}
              >
                <Button
                  ref={menuItem.ref[1]}
                  hover="none"
                  size="small"
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;

                    event.preventDefault();
                    event.stopPropagation();
                    selectItem(index());
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (event.detail === 0) {
                      selectItem(index());
                    }
                  }}
                  onPointerMove={() => {
                    setBlockHoverSelect(false);
                  }}
                  onPointerEnter={() => {
                    if (!blockHoverSelect()) {
                      setSelectedIndex(index());
                    }
                  }}
                  variant="text"
                  class={clsx(
                    "justify-start flex items-center pl-1 pr-0.5 py-0.5",
                    menuItem.shortcut || props.state.items.length <= 10
                      ? "w-full"
                      : "w-[calc(100%-0.25rem)]",
                    selectedIndex() === index()
                      ? "bg-gradient-to-r from-gray-500/10 to-transparent"
                      : ""
                  )}
                >
                  <div class="flex justify-center items-center h-6 w-6">
                    <div
                      class={clsx(
                        "h-5 w-5",
                        selectedIndex() === index() ? "bg-gray-500" : "bg-gray-400",
                        menuItem.icon
                      )}
                    />
                  </div>
                  <div class="flex flex-col pl-1 flex-1 text-left">
                    <span>{menuItem.label}</span>
                  </div>
                  <span class="font-mono text-gray-400 text-xs pr-2">{menuItem.markdown}</span>
                </Button>
              </Dynamic>
            </>
          )}
        </For>
      </div>
    </Card>
  );
};

export { SlashMenu };
export type { SlashMenuState, SlashMenuItem };
