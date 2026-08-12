import clsx from "clsx";
import { type Component, For, createSignal, onCleanup, useContext } from "solid-js";
import { type Editor } from "@tiptap/core";
import { Card, IconButton, Shortcut, Tooltip } from "@andesine/components";
import { BlockMenuContext } from "#editor/ui/menus/block-menu";

type BubbleMenuMode = "format" | "link";

interface FormatMenuItemGroup {
  left: number;
  width: number;
  items: number;
}

const FormatMenu: Component<{
  class?: string;
  editor: Editor;
  setMode(mode: BubbleMenuMode): void;
}> = (props) => {
  const { openMenu } = useContext(BlockMenuContext)!;
  const [activeMarks, setActiveMarks] = createSignal<string[]>([]);
  const menuItems: Array<{
    icon: string;
    mark?: string;
    label: string;
    shortcut?: string;
    onClick?(): void;
  }> = [
    { icon: "i-lucide:bold", mark: "bold", label: "Bold", shortcut: "$mod+B" },
    { icon: "i-lucide:italic", mark: "italic", label: "Italic", shortcut: "$mod+I" },
    {
      icon: "i-lucide:strikethrough",
      mark: "strike",
      label: "Strikethrough",
      shortcut: "$mod+Shift+X"
    },
    { icon: "i-lucide:code", mark: "code", label: "Code", shortcut: "$mod+E" },
    {
      icon: "i-lucide:link-2",
      mark: "link",
      label: "Link",
      shortcut: "$mod+K",
      onClick() {
        props.setMode("link");
      }
    },
    {
      icon: "i-lucide:highlighter",
      mark: "highlight",
      label: "Highlight",
      shortcut: "$mod+Shift+H"
    },
    { icon: "i-lucide:subscript", mark: "subscript", label: "Subscript" },
    { icon: "i-lucide:superscript", mark: "superscript", label: "Superscript" }
  ];
  const markNames = menuItems.map((menu) => menu.mark).filter(Boolean) as string[];
  const updateActiveMarks = (): void => {
    setActiveMarks(markNames.filter((mark) => props.editor.isActive(mark)));
  };
  const activeGroups = () => {
    const active = activeMarks();
    const gap = 0.25;
    const padding = 0.25;
    const menuOptionWidth = 1.625;
    const activeGroups: FormatMenuItemGroup[] = [];

    let left = padding;
    let currentGroup: FormatMenuItemGroup | null = null;

    menuItems.forEach((item) => {
      const isActive = item.mark ? active.includes(item.mark) : false;

      if (isActive) {
        if (currentGroup) {
          currentGroup.width += menuOptionWidth + gap;
          currentGroup.items += 1;
        } else {
          currentGroup = { left, width: menuOptionWidth, items: 1 };
        }
      } else if (currentGroup) {
        activeGroups.push(currentGroup);
        currentGroup = null;
      }

      left += menuOptionWidth + gap;
    });

    if (currentGroup) {
      activeGroups.push(currentGroup);
    }

    return activeGroups;
  };

  props.editor.on("update", updateActiveMarks);
  props.editor.on("selectionUpdate", updateActiveMarks);
  updateActiveMarks();
  onCleanup(() => {
    props.editor.off("update", updateActiveMarks);
    props.editor.off("selectionUpdate", updateActiveMarks);
  });

  return (
    <Card
      data-menu="format"
      class={clsx(
        "z-10 relative flex w-full max-w-full p-1 gap-1 rounded-none overflow-x-auto scrollbar-hidden not-prose bg-gray-50 items-center md:w-auto md:max-w-none md:rounded-xl md:overflow-initial",
        props.class
      )}
      shade
    >
      <For each={activeGroups()}>
        {(group) => (
          <div
            class="absolute top-1 bottom-1 -z-1 rounded-lg bg-gradient-to-tr opacity-10 pointer-events-none"
            style={{ left: `${group.left}rem`, width: `${group.width}rem` }}
          />
        )}
      </For>
      <For each={menuItems}>
        {(menu) => {
          const active = (): boolean => {
            return Boolean(menu.mark && activeMarks().includes(menu.mark));
          };

          return (
            <div class="snap-start shrink-0">
              <Tooltip
                content={
                  <div class="flex flex-col items-center justify-center gap-0.5">
                    <span>{menu.label}</span>
                    {menu.shortcut && (
                      <Shortcut class="opacity-50 font-mono text-[80%]" shortcut={menu.shortcut} />
                    )}
                  </div>
                }
                side="bottom"
              >
                <IconButton
                  class={clsx(active() && "group/menu-item @hover:bg-gradient-to-tr")}
                  iconProps={{
                    class: clsx(
                      active() &&
                        "bg-gradient-to-tr media-mouse:group-hover/menu-item:from-white media-mouse:group-hover/menu-item:to-white"
                    )
                  }}
                  icon={menu.icon}
                  variant="text"
                  size="xs"
                  onClick={(event) => {
                    if (menu.onClick) {
                      menu.onClick();
                    } else if (menu.mark) {
                      const chain = props.editor.chain();

                      if (menu.mark !== "code") {
                        chain.unsetCode();
                      }

                      chain.toggleMark(menu.mark).focus().run();
                    }

                    event.preventDefault();
                    event.stopPropagation();
                  }}
                />
              </Tooltip>
            </div>
          );
        }}
      </For>
      <Tooltip content="Close keyboard" side="bottom" wrapperClass="snap-start shrink-0 md:hidden">
        <IconButton
          variant="text"
          icon="i-lucide:keyboard-off"
          size="xs"
          aria-label="Close keyboard"
          onClick={(event) => {
            props.editor.chain().blur().setMeta("bubbleMenu", "hide").run();
            event.preventDefault();
            event.stopPropagation();
          }}
        />
      </Tooltip>
      <div class="w-px h-6 shrink-0 rounded-full bg-gray-200" />
      <Tooltip
        content={
          <div class="flex flex-col items-center justify-center gap-0.5">
            <span>More</span>
          </div>
        }
        side="bottom"
        wrapperClass="snap-start shrink-0"
      >
        <IconButton
          variant="text"
          icon="i-lucide:ellipsis"
          size="xs"
          onClick={(event) => {
            const reference = event.currentTarget;
            const { selection, doc } = props.editor.state;
            let from = 0;
            let to = 0;

            event.preventDefault();
            event.stopPropagation();
            doc.nodesBetween(selection.from, selection.to, (node, pos) => {
              from = from || pos;
              to = pos + node.nodeSize;

              return false;
            });
            openMenu(reference);
            props.editor.view.dispatch(props.editor.state.tr.setMeta("bubbleMenu", "hide"));
            props.editor.chain().setBlockSelection({ from, to }).focus().run();
          }}
        />
      </Tooltip>
    </Card>
  );
};

export { FormatMenu };
export type { BubbleMenuMode };
