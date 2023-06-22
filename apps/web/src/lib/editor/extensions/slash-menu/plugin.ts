import { SlashMenu, SlashMenuItem, SlashMenuState } from "./component";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { Extension } from "@tiptap/core";
import Suggestion, { SuggestionProps } from "@tiptap/suggestion";
import tippy, { Instance } from "tippy.js";

interface SlashMenuPluginOptions {
  menuItems: SlashMenuItem[];
}

const stringToRegex = (str: string): RegExp => {
  return new RegExp(str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"), "i");
};
const SlashMenuPlugin = Extension.create<SlashMenuPluginOptions>({
  name: "slashMenu",
  addOptions() {
    return {
      menuItems: [] as SlashMenuItem[]
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
          return !editor.isActive("table");
        },
        command({ editor, range, props }) {
          return props.command({
            editor: editor as SolidEditor,
            range
          });
        },
        items: ({ query, editor }) => {
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
            this.options.menuItems.forEach((item) => {
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
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start"
              });
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

              return component?.state().onKeyDown?.(props);
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
