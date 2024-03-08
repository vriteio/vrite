import { SolidEditor } from "@vrite/tiptap-solid";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { Component, createEffect, createSignal, For, on, onMount, Show } from "solid-js";
import { Range } from "@tiptap/core";
import clsx from "clsx";
import { scrollIntoView } from "seamless-scroll-polyfill";
import { Ref, breakpoints } from "#lib/utils";
import { Button, Card, IconButton } from "#components/primitives";
import { App } from "#context";

interface SlashMenuItem {
  icon: string;
  label: string;
  group: string;
  block?: App.WorkspaceSettings["blocks"][number];
  embed?: App.WorkspaceSettings["embeds"][number];
  ref: Ref<HTMLElement | null>;
  command(params: { editor: SolidEditor; range: Range }): void;
}
interface SlashMenuState extends SuggestionProps<SlashMenuItem> {
  onKeyDown?(props: SuggestionKeyDownProps): boolean;
  setOnKeyDown(callback: (props: SuggestionKeyDownProps) => boolean): void;
}
interface SlashMenuProps {
  state: SlashMenuState;
}

const BlockMenu: Component<{ items: SlashMenuItem[]; editor: SolidEditor; close(): void }> = (
  props
) => {
  const selectItem = (index: number): void => {
    const item = props.items[index];

    if (item) {
      item.command({ editor: props.editor, range: props.editor.state.selection });
      props.close();
    }
  };

  return (
    <>
      <For
        each={props.items}
        fallback={
          <Button
            variant="text"
            text="soft"
            class="justify-start text-start w-[calc(100%-0.5rem)]"
            disabled
          >
            No results
          </Button>
        }
      >
        {(menuItem, index) => {
          return (
            <>
              <Show when={menuItem.group !== props.items[index() - 1]?.group}>
                <div class="px-2 font-semibold">{menuItem.group}</div>
              </Show>
              <IconButton
                path={menuItem.icon}
                label={menuItem.label}
                ref={menuItem.ref[1]}
                onClick={() => selectItem(index())}
                variant="text"
                class="justify-start w-[calc(100%-0.5rem)]"
              />
            </>
          );
        }}
      </For>
    </>
  );
};
const SlashMenu: Component<SlashMenuProps> = (props) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [blockHoverSelect, setBlockHoverSelect] = createSignal(false);
  const selectItem = (index: number): void => {
    const item = props.state.items[index];

    if (item) {
      props.state.command(item);
    }
  };
  const scrollToSelectedItem = (): void => {
    const item = props.state.items[selectedIndex()];

    if (item) {
      const [elementRef] = item.ref;
      const element = elementRef();

      if (element) {
        scrollIntoView(element, { behavior: "smooth", block: "center" }, { duration: 300 });
      }
    }
  };
  const upHandler = (): void => {
    setSelectedIndex((selectedIndex() + props.state.items.length - 1) % props.state.items.length);
    scrollToSelectedItem();
  };
  const downHandler = (): void => {
    setSelectedIndex((selectedIndex() + 1) % props.state.items.length);
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
    return Promise.resolve().then(() => {
      if (!props.state.onKeyDown) {
        props.state.setOnKeyDown(onKeyDown);
      }
    });
  });
  createEffect(
    on(
      () => props.state,
      () => {
        setSelectedIndex(0);
      }
    )
  );

  return (
    <Show when={breakpoints.md()}>
      <Card
        class={clsx(
          "shadow-2xl md:shadow-none rounded-none border-x-0 md:border-x-2 md:rounded-2xl -translate-x-2 md:translate-x-0 w-screen md:w-56 m-0 max-h-72 overflow-hidden transition duration-200 transform origin-top-left p-1"
        )}
      >
        <div
          class={clsx(
            // "w-full h-full overflow-auto md:max-h-64 scrollbar-sm"
            "w-full h-full overflow-auto max-h-64 scrollbar-sm"
          )}
        >
          <For
            each={props.state.items}
            fallback={
              <Button
                variant="text"
                text="soft"
                class="justify-start text-start w-[calc(100%-0.5rem)]"
                disabled
              >
                No results
              </Button>
            }
          >
            {(menuItem, index) => {
              return (
                <>
                  <Show when={menuItem.group !== props.state.items[index() - 1]?.group}>
                    <div class="px-2 font-semibold">{menuItem.group}</div>
                  </Show>
                  <IconButton
                    path={menuItem.icon}
                    label={menuItem.label}
                    ref={menuItem.ref[1]}
                    hover={false}
                    onClick={() => selectItem(index())}
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
                      "justify-start w-[calc(100%-0.5rem)]",
                      selectedIndex() === index() && "bg-gray-300 dark:bg-gray-700"
                    )}
                  />
                </>
              );
            }}
          </For>
        </div>
      </Card>
    </Show>
  );
};

export { SlashMenu, BlockMenu };
export type { SlashMenuState, SlashMenuItem };
