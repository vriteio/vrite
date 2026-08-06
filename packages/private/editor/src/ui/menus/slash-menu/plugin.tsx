import { SlashMenu, type SlashMenuItem, type SlashMenuState } from "./component";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import tippy, { type Instance } from "tippy.js";
import { type Accessor, runWithOwner, getOwner, createSignal } from "solid-js";
import { PluginKey } from "@tiptap/pm/state";
import { type Editor } from "@tiptap/core";
import { render } from "solid-js/web";
import { EDITOR_MENU_Z_INDEX } from "#editor/ui/constants";

const stringToRegex = (str: string): RegExp => {
  return new RegExp(str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"), "i");
};
const slashMenuPluginKey = new PluginKey("slashMenu");
const createSlashMenuPlugin = (options: {
  menuItems: Accessor<SlashMenuItem[]>;
  editor: Editor;
  menuContainerRef: Accessor<HTMLElement | null>;
}) => {
  const owner = getOwner();

  return Suggestion<SlashMenuItem>({
    pluginKey: slashMenuPluginKey,
    char: "/",
    editor: options.editor,
    allowSpaces: true,
    startOfLine: true,
    allow({ editor }) {
      const { selection } = editor.state;
      const selectedNode = selection.$from.node(selection.$from.depth);

      return (
        (selectedNode?.textContent.startsWith("/") &&
          !selectedNode?.textContent.startsWith("/ ")) ||
        !selectedNode?.textContent
      );
    },
    command({ editor, range, props }) {
      return props.command({
        editor: editor as Editor,
        range
      });
    },
    items: ({ query }) => {
      const lowerCaseQuery = stringToRegex(query.toLowerCase());
      const conditions: Array<(item: SlashMenuItem) => boolean> = [
        (item) => item.label.toLowerCase().startsWith(query.toLowerCase()),
        (item) => lowerCaseQuery.test(item.label),
        (item) => lowerCaseQuery.test(item.group),
        (item) => {
          return [...query.toLowerCase()].every((char) => {
            return item.label.toLowerCase().includes(char);
          });
        }
      ];
      const filteredItems: SlashMenuItem[] = [];

      options.menuItems().forEach((item) => {
        for (const condition of conditions) {
          if (condition(item) && !filteredItems.includes(item)) {
            filteredItems.push(item);
            break;
          }
        }
      });

      return filteredItems;
    },
    render: () => {
      const [suggestionProps, setSuggestionProps] =
        createSignal<SuggestionProps<SlashMenuItem> | null>(null);
      const [menuVisible, setMenuVisible] = createSignal(false);
      const getReferenceClientRect = (props: SuggestionProps<SlashMenuItem>): DOMRect => {
        const clientRect = props.clientRect?.();

        if (clientRect) {
          return clientRect;
        }

        return new DOMRect();
      };

      let component: {
        element: HTMLElement;
        unmount(): void;
      } | null = null;
      let keyDownHandler: ((props: SuggestionKeyDownProps) => boolean) | null = null;
      let popup: Instance | null = null;

      return {
        onStart: (props) => {
          setSuggestionProps(props);
          setMenuVisible(true);

          const target = options.editor.view.dom.closest("#editor-container") as HTMLElement;
          const element = document.createElement("div");
          const unmount = render(
            () =>
              runWithOwner(owner, () => {
                const state = (): SlashMenuState => ({
                  ...suggestionProps()!,
                  clientRect: () => getReferenceClientRect(suggestionProps()!),
                  visible: menuVisible(),
                  close() {
                    setMenuVisible(false);
                    popup?.hide();
                  },
                  setOnKeyDown(handler) {
                    keyDownHandler = handler;
                  }
                });
                return <SlashMenu state={state()} />;
              }),
            element
          );

          component = { element, unmount };

          if (!props.clientRect) {
            return;
          }

          popup = tippy(target, {
            getReferenceClientRect: () => getReferenceClientRect(props),
            appendTo: () => options.menuContainerRef() || target,
            duration: 0,
            zIndex: EDITOR_MENU_Z_INDEX.slashMenu,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            hideOnClick: "toggle",
            onHide: () => {
              setMenuVisible(false);
            }
          });
          popup.popper.classList.add("slash-menu");
          popup.popper.style.pointerEvents = "auto";
        },

        onUpdate(props) {
          setSuggestionProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.setProps({
            getReferenceClientRect: () => getReferenceClientRect(props)
          });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            setMenuVisible(false);
            popup?.hide();

            return true;
          }

          return keyDownHandler?.(props) ?? false;
        },

        onExit() {
          setMenuVisible(false);
          popup?.destroy();
          component?.unmount();
          keyDownHandler = null;
        }
      };
    }
  });
};

export { createSlashMenuPlugin, slashMenuPluginKey };
