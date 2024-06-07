import { SlashMenu, SlashMenuItem, SlashMenuState } from "./component";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { Extension } from "@tiptap/core";
import Suggestion, { SuggestionProps } from "@tiptap/suggestion";
import tippy, { Instance } from "tippy.js";
import { Accessor } from "solid-js";

interface SlashMenuPluginOptions {
  menuItems: Accessor<SlashMenuItem[]>;
}

const stringToRegex = (str: string): RegExp => {
  return new RegExp(str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"), "i");
};
const SlashMenuPlugin = Extension.create<SlashMenuPluginOptions>({
  name: "slashMenu",
  addOptions() {
    return {
      menuItems: () => []
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashMenuItem>({
        char: "/",
        editor: this.editor,
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
            editor: editor as SolidEditor,
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

          conditions.forEach((condition) => {
            this.options.menuItems().forEach((item) => {
              if (condition(item) && !filteredItems.includes(item)) {
                filteredItems.push(item);
              }
            });
          });

          return filteredItems;
        },
        render: () => {
          const getReferenceClientRect = (props: SuggestionProps<SlashMenuItem>): DOMRect => {
            const clientRect = props.clientRect?.();

            if (clientRect) {
              return clientRect;
            }

            return new DOMRect();
          };

          let component: SolidRenderer<SlashMenuState> | null = null;
          let popup: Instance | null = null;

          return {
            onStart: (props) => {
              const target = document.querySelector("#main-scrollable-container")!;

              component = new SolidRenderer(SlashMenu, {
                state: {
                  ...props,
                  close() {
                    popup?.hide();
                  },
                  setOnKeyDown(handler) {
                    component?.setState((state) => ({ ...state, onKeyDown: handler }));
                  }
                },
                editor: props.editor as SolidEditor
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy(target, {
                getReferenceClientRect: () => getReferenceClientRect(props),
                appendTo: () => target,
                duration: 0,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                hideOnClick: "toggle"
              });
              popup.popper.classList.add("slash-menu");
            },

            onUpdate(props) {
              component?.setState((state) => ({ ...state, ...props }));

              if (!props.clientRect) {
                return;
              }

              popup?.setProps({
                getReferenceClientRect: () => getReferenceClientRect(props)
              });
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.hide();

                return true;
              }

              return component?.state().onKeyDown?.(props) ?? false;
            },

            onExit() {
              popup?.destroy();
              component?.destroy();
            }
          };
        }
      })
    ];
  }
});

export { SlashMenuPlugin };
