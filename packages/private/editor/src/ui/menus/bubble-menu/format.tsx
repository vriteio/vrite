import clsx from "clsx";
import { Component, For, createSignal } from "solid-js";
import { SolidEditor } from "@andesine/tiptap-solid";
import { nanoid } from "nanoid";
import { generateHTML } from "@tiptap/core";
import { Card, IconButton, Shortcut, Tooltip } from "@andesine/components";
import { optimizeContentSlice } from "#editor/lib";

const FormatMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  blur?(): void;
  setMode(mode: string): void;
}> = (props) => {
  const [activeMarks, setActiveMarks] = createSignal<string[]>([]);
  const commentMenuItem = {
    icon: "i-lucide:message-square-text",
    mark: "comment",
    label: "Comment",
    async onClick() {
      if (props.editor.isActive("comment")) {
        props.editor.commands.unsetComment();
      } else {
        const threadFragment = nanoid();
        const slice = optimizeContentSlice(props.editor.state.selection.content());
        const html = generateHTML(
          { type: "doc", content: slice.toJSON().content },
          props.editor.extensionManager.extensions
        );

        props.editor.chain().setComment({ thread: threadFragment }).focus().run();

        try {
          const x = 10;
        } catch (error) {
          props.editor.commands.unsetComment();
        }
      }
    }
  };
  const closeKeyboardItem = {
    icon: "i-lucide:keyboard-off",
    label: "Close keyboard",
    async onClick() {
      props.blur?.();
    }
  };
  const menus = (
    [
      {
        icon: "i-lucide:bold",
        mark: "bold",
        label: "Bold"
      },
      {
        icon: "i-lucide:italic",
        mark: "italic",
        label: "Italic"
      },
      {
        icon: "i-lucide:strikethrough",
        mark: "strike",
        label: "Strike"
      },
      {
        icon: "i-lucide:underline",
        mark: "underline",
        label: "Underline"
      },
      {
        icon: "i-lucide:code",
        mark: "code",
        label: "Code"
      },
      {
        icon: "i-lucide:link-2",
        mark: "link",
        label: "Link",
        onClick() {
          props.setMode("link");
        }
      },
      { icon: "i-lucide:highlighter", mark: "highlight", label: "Highlight" },
      { icon: "i-lucide:subscript", mark: "subscript", label: "Subscript" },
      { icon: "i-lucide:superscript", mark: "superscript", label: "Superscript" }
      //...(activeContentPieceId() && breakpoints.md() ? [commentMenuItem] : []),
      //...(breakpoints.md() ? [] : [closeKeyboardItem])
    ] as Array<{ icon: string; mark?: string; label: string; onClick?(): void }>
  ).filter(({ mark }) => {
    if (!mark || mark === "comment") return true;

    return true;
  });
  const marks = menus.map((menu) => menu.mark);

  props.editor.on("update", () => {
    setActiveMarks(marks.filter((mark) => mark && props.editor.isActive(mark)) as string[]);
  });
  props.editor.on("selectionUpdate", () => {
    setActiveMarks(marks.filter((mark) => mark && props.editor.isActive(mark)) as string[]);
  });

  return (
    <Card
      class={clsx(
        "relative flex p-1 gap-1 rounded-xl overflow-x-auto scrollbar-hidden md:overflow-initial not-prose bg-white items-center",
        props.class
      )}
      shade
    >
      <For
        each={menus}
        fallback={<span class="px-1.5 py-0.5 text-base">No available options</span>}
      >
        {(menu) => {
          const active = (): boolean => {
            return Boolean(menu.mark && activeMarks().includes(menu.mark));
          };

          return (
            <Tooltip
              text={
                <div class="flex flex-col items-center justify-center gap-0.5">
                  <span>{menu.label}</span>
                  <Shortcut
                    class="opacity-50 font-mono text-[80%]"
                    shortcut={`$mod+${menu.label[0]}`}
                  />
                </div>
              }
              side="bottom"
              wrapperClass="snap-start"
            >
              <IconButton
                variant={active() ? "solid" : "text"}
                color={active() ? "primary" : "base"}
                icon={menu.icon}
                size="small"
                iconProps={{ class: "h-4.5 w-4.5" }}
                onClick={(event) => {
                  const chain = props.editor.chain();

                  if (menu.onClick) {
                    menu.onClick();
                  } else if (menu.mark) {
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
          );
        }}
      </For>
      <div class="w-px h-6 rounded-full bg-gray-200" />
      <Tooltip
        text={
          <div class="flex flex-col items-center justify-center gap-0.5">
            <span>More</span>
          </div>
        }
        side="bottom"
        wrapperClass="snap-start"
      >
        <IconButton
          variant="text"
          icon="i-lucide:ellipsis"
          size="small"
          iconProps={{ class: "h-4.5 w-4.5" }}
          onClick={() => {
            const { selection, doc } = props.editor.state;

            let from = 0;
            let to = 0;

            doc.nodesBetween(selection.from, selection.to, (node, pos) => {
              from = from || pos;
              to = pos + node.nodeSize;

              return false;
            });

            props.editor.chain().setBlockSelection({ from, to }).focus().run();
          }}
        />
      </Tooltip>
    </Card>
  );
};

export { FormatMenu };
