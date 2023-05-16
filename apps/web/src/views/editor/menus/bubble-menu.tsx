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
  mdiDelete
} from "@mdi/js";
import { Component, createEffect, createSignal, For, Match, on, Switch } from "solid-js";
import { createRef } from "#lib/utils";
import { Card, IconButton, Input, Tooltip } from "#components/primitives";
import { App, useAuthenticatedContext } from "#context";

interface BubbleMenuProps {
  editor: SolidEditor;
  opened: boolean;
}

const BubbleMenu: Component<BubbleMenuProps> = (props) => {
  const [activeMarks, setActiveMarks] = createSignal<string[]>([]);
  const { workspaceSettings } = useAuthenticatedContext();
  const [mode, setMode] = createSignal<"format" | "link">("format");
  const [link, setLink] = createSignal("");
  const [linkInputRef, setLinkInputRef] = createRef<HTMLInputElement | null>(null);
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
    { icon: mdiFormatSuperscript, mark: "superscript", label: "Superscript" }
  ].filter(({ mark }) => {
    if (!workspaceSettings()) {
      return true;
    }

    return workspaceSettings()!.marks.includes(mark as App.WorkspaceSettings["marks"][number]);
  });
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
          setMode("format");
          setLink("");
        }
      }
    )
  );

  return (
    <Card class="relative flex p-0">
      <Switch>
        <Match when={mode() === "format"}>
          <div class="flex">
            <For
              each={menus}
              fallback={<span class="px-1.5 py-0.5 text-base">No available options</span>}
            >
              {(menu) => (
                <Tooltip text={menu.label} side="top" wrapperClass="snap-start">
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
