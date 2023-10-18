import clsx from "clsx";
import { Component, For, createEffect, createSignal } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import {
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatStrikethrough,
  mdiCodeTags,
  mdiLinkVariant,
  mdiFormatColorHighlight,
  mdiFormatSubscript,
  mdiFormatSuperscript,
  mdiKeyboardCloseOutline,
  mdiCommentOutline
} from "@mdi/js";
import { nanoid } from "nanoid";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { App, useAuthenticatedUserData, useClient } from "#context";
import { breakpoints } from "#lib/utils";

const FormatMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  contentPieceId?: string;
  blur?(): void;
  setMode(mode: string): void;
}> = (props) => {
  const [activeMarks, setActiveMarks] = createSignal<string[]>([]);
  const { workspaceSettings = () => null } = useAuthenticatedUserData() || {};
  const client = useClient();
  const commentMenuItem = {
    icon: mdiCommentOutline,
    mark: "comment",
    label: "Comment",
    async onClick() {
      if (props.editor.isActive("comment")) {
        props.editor.commands.unsetComment();
      } else {
        const threadFragment = nanoid();

        props.editor.chain().setComment({ thread: threadFragment }).focus().run();

        try {
          await client.comments.createThread.mutate({
            contentPieceId: props.contentPieceId || "",
            fragment: threadFragment
          });
        } catch (error) {
          props.editor.commands.unsetComment();
        }
      }
    }
  };
  const closeKeyboardItem = {
    icon: mdiKeyboardCloseOutline,
    label: "Close keyboard",
    async onClick() {
      props.editor.commands.blur?.();
    }
  };
  const menus = (
    [
      {
        icon: mdiFormatBold,
        mark: "bold",
        label: "Bold"
      },
      {
        icon: mdiFormatItalic,
        mark: "italic",
        label: "Italic"
      },
      {
        icon: mdiFormatStrikethrough,
        mark: "strike",
        label: "Strike"
      },
      {
        icon: mdiCodeTags,
        mark: "code",
        label: "Code"
      },
      {
        icon: mdiLinkVariant,
        mark: "link",
        label: "Link",
        onClick() {
          props.setMode("link");
        }
      },
      { icon: mdiFormatColorHighlight, mark: "highlight", label: "Highlight" },
      { icon: mdiFormatSubscript, mark: "subscript", label: "Subscript" },
      { icon: mdiFormatSuperscript, mark: "superscript", label: "Superscript" },
      ...(props.contentPieceId && breakpoints.md() ? [commentMenuItem] : []),
      ...(breakpoints.md() ? [] : [closeKeyboardItem])
    ] as Array<{ icon: string; mark?: string; label: string; onClick?(): void }>
  ).filter(({ mark }) => {
    if (!mark || mark === "comment") return true;

    if (!workspaceSettings()) {
      return true;
    }

    return workspaceSettings()!.marks.includes(mark as App.WorkspaceSettings["marks"][number]);
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
        "relative flex p-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
        props.class
      )}
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
            <Tooltip text={menu.label} side="bottom" wrapperClass="snap-start">
              <IconButton
                path={menu.icon}
                text={active() ? "primary" : "soft"}
                variant={active() ? "solid" : "text"}
                color={active() ? "primary" : "base"}
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
    </Card>
  );
};

export { FormatMenu };
