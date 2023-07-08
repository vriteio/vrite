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
  mdiCheck,
  mdiDelete,
  mdiTableColumnRemove,
  mdiTableRowRemove,
  mdiTableMergeCells,
  mdiTableSplitCell,
  mdiTableRemove,
  mdiCommentOutline,
  mdiTableHeadersEyeOff
} from "@mdi/js";
import { CellSelection } from "@tiptap/pm/tables";
import { Component, createEffect, createSignal, For, Match, on, Show, Switch } from "solid-js";
import { nanoid } from "nanoid";
import clsx from "clsx";
import { createRef, Ref } from "#lib/utils";
import { Card, IconButton, Input, Tooltip } from "#components/primitives";
import { App, useAuthenticatedContext, useClientContext } from "#context";

interface BubbleMenuProps {
  editor: SolidEditor;
  opened: boolean;
  contentPieceId?: string;
  class?: string;
  ref?: Ref<HTMLElement>[1];
}

const BubbleMenu: Component<BubbleMenuProps> = (props) => {
  const [activeMarks, setActiveMarks] = createSignal<string[]>([]);
  const { workspaceSettings = () => null } = useAuthenticatedContext() || {};
  const { client } = useClientContext();
  const [mode, setMode] = createSignal<"format" | "link" | "table">("format");
  const [link, setLink] = createSignal("");
  const [linkInputRef, setLinkInputRef] = createRef<HTMLInputElement | null>(null);
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
  const menus = [
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
        setMode("link");
      }
    },
    { icon: mdiFormatColorHighlight, mark: "highlight", label: "Highlight" },
    { icon: mdiFormatSubscript, mark: "subscript", label: "Subscript" },
    { icon: mdiFormatSuperscript, mark: "superscript", label: "Superscript" },
    ...(props.contentPieceId ? [commentMenuItem] : [])
  ].filter(({ mark }) => {
    if (mark === "comment") return true;

    if (!workspaceSettings()) {
      return true;
    }

    return workspaceSettings()!.marks.includes(mark as App.WorkspaceSettings["marks"][number]);
  });
  const tableMenus = [
    {
      icon: mdiTableHeadersEyeOff,
      label: "Toggle header cell off",
      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = selection.$anchorCell.node(1);
          const rowNode = selection.$anchorCell.node(2);

          if (tableNode.child(0) === rowNode) {
            return false;
          }

          return selection.$anchorCell.nodeAfter?.type.name === "tableHeader";
        }

        return false;
      },
      onClick() {
        props.editor.chain().toggleHeaderCell().focus().run();
      }
    },
    {
      icon: mdiTableMergeCells,
      label: "Merge cells",
      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          return selection.$anchorCell.pos !== selection.$headCell.pos;
        }

        return false;
      },
      onClick() {
        props.editor.chain().mergeCells().run();
      }
    },
    {
      icon: mdiTableSplitCell,
      label: "Split cell",
      show() {
        const { selection } = props.editor.state;

        if (
          selection instanceof CellSelection &&
          selection.$anchorCell.pos === selection.$headCell.pos
        ) {
          return (
            selection.$anchorCell.nodeAfter?.attrs.colspan > 1 ||
            selection.$anchorCell.nodeAfter?.attrs.rowspan > 1
          );
        }

        return false;
      },
      onClick() {
        props.editor.chain().splitCell().run();
      }
    },
    {
      icon: mdiTableColumnRemove,
      label: "Delete column(s)",
      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = selection.$anchorCell.node(1);

          let isSingleColumn = false;

          tableNode.content.forEach((rowNode) => {
            isSingleColumn = rowNode.childCount === 1;
          });

          return !isSingleColumn;
        }

        return true;
      },
      onClick() {
        props.editor.chain().deleteColumn().focus().run();
      }
    },
    {
      icon: mdiTableRowRemove,
      label: "Delete row(s)",

      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = selection.$anchorCell.node(1);

          if (tableNode.content.childCount === 1) {
            return false;
          }
        }

        return true;
      },
      onClick() {
        props.editor.chain().deleteRow().focus().run();
      }
    },
    {
      icon: mdiTableRemove,
      label: "Delete table",

      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = selection.$anchorCell.node(1);

          if (tableNode.childCount === 1) return true;

          let isSingleColumn = false;

          tableNode.content.forEach((rowNode) => {
            isSingleColumn = rowNode.childCount === 1;
          });

          return isSingleColumn;
        }

        return false;
      },
      onClick() {
        props.editor.chain().deleteTable().focus().run();
      }
    }
  ];
  const marks = menus.map((menu) => menu.mark);
  const saveLink = (): void => {
    props.editor.chain().unsetCode().setLink({ href: link() }).focus().run();
    setMode("format");
  };

  props.editor.on("update", () => {
    setActiveMarks(marks.filter((mark) => props.editor.isActive(mark)));
  });
  props.editor.on("selectionUpdate", () => {
    setActiveMarks(marks.filter((mark) => props.editor.isActive(mark)));

    if (props.editor.state.selection instanceof CellSelection) {
      setMode("table");
    } else if (!props.editor.state.selection.empty) {
      setMode("format");
    }
  });
  createEffect(
    on(mode, (mode) => {
      if (mode === "link") {
        setLink(props.editor.getAttributes("link").href || "");
        setTimeout(() => {
          const linkInput = linkInputRef();

          linkInput?.focus();
        }, 300);
      } else {
        setLink("");
      }
    })
  );
  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (!opened) {
          setLink("");
          setTimeout(() => {
            setMode("format");
          }, 300);
        }
      }
    )
  );

  return (
    <Card class={clsx("relative flex p-0", props.class)} ref={props.ref}>
      <Switch>
        <Match when={mode() === "table"}>
          {" "}
          <For
            each={tableMenus}
            fallback={<span class="px-1.5 py-0.5 text-base">No available options</span>}
          >
            {(menuItem) => {
              return (
                <Show when={!menuItem.show || menuItem.show()}>
                  <Tooltip text={menuItem.label} side="bottom" wrapperClass="snap-start">
                    <IconButton
                      path={menuItem.icon}
                      text="soft"
                      variant="text"
                      color="base"
                      onClick={menuItem.onClick}
                    />
                  </Tooltip>
                </Show>
              );
            }}
          </For>
        </Match>
        <Match when={mode() === "format"}>
          <div class="flex">
            <For
              each={menus}
              fallback={<span class="px-1.5 py-0.5 text-base">No available options</span>}
            >
              {(menu) => (
                <Tooltip text={menu.label} side="bottom" wrapperClass="snap-start">
                  <IconButton
                    path={menu.icon}
                    text={activeMarks().includes(menu.mark) ? "primary" : "soft"}
                    variant={activeMarks().includes(menu.mark) ? "solid" : "text"}
                    color={activeMarks().includes(menu.mark) ? "primary" : "base"}
                    onClick={() => {
                      const chain = props.editor.chain();

                      if (menu.onClick) {
                        menu.onClick();
                      } else {
                        if (menu.mark !== "code") {
                          chain.unsetCode();
                        }

                        chain.toggleMark(menu.mark).focus().run();
                      }
                    }}
                  />
                </Tooltip>
              )}
            </For>
          </div>
        </Match>
        <Match when={mode() === "link"}>
          <Input
            ref={setLinkInputRef}
            value={link()}
            setValue={(value) => {
              setLink(value);
            }}
            onEnter={saveLink}
            class="py-0 my-0 bg-transparent"
          />
          <IconButton path={mdiCheck} text="soft" variant="text" onClick={saveLink} />
          <IconButton
            path={mdiDelete}
            text="soft"
            variant="text"
            onClick={() => {
              props.editor.chain().unsetLink().focus().run();
              setMode("format");
            }}
          />
        </Match>
      </Switch>
    </Card>
  );
};

export { BubbleMenu };
