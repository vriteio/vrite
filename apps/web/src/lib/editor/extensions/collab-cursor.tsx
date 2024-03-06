import { HocuspocusProvider } from "@hocuspocus/provider";
import { CollaborationCursor } from "@tiptap/extension-collaboration-cursor";
import { createSignal, JSX, onMount, Show } from "solid-js";
import { render } from "solid-js/web";
import { Extension } from "@tiptap/core";
import { yCursorPlugin } from "y-prosemirror";
import clsx from "clsx";
import { useAuthenticatedUserData } from "#context";
import { getSelectionColor, selectionClasses, selectionColors } from "#lib/utils";

const awarenessStatesToArray = (
  states: Map<number, Record<string, any>>
): Array<{ clientId: number } & Record<string, any>> => {
  return Array.from(states.entries()).map(([key, value]) => {
    return {
      clientId: key,
      ...value.user
    };
  });
};
const CollabCursor = (provider: HocuspocusProvider): Extension => {
  const { profile } = useAuthenticatedUserData();

  return CollaborationCursor.extend({
    addProseMirrorPlugins() {
      return [
        yCursorPlugin(
          (() => {
            this.options.provider.awareness.setLocalStateField("user", this.options.user);
            this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
            this.options.provider.awareness.on("update", () => {
              this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
            });

            return this.options.provider.awareness;
          })(),
          {
            selectionBuilder(user) {
              const color = user.selectionColor as (typeof selectionColors)[number];

              return {
                class: clsx("bg-opacity-40 dark:bg-opacity-40", selectionClasses[color].label)
              };
            },
            cursorBuilder: this.options.render
          }
        )
      ];
    }
  }).configure({
    provider,
    user: {
      name: profile()?.username || "",
      avatar: profile()?.avatar || "",
      id: profile()?.id || "",
      selectionColor: getSelectionColor()
    },
    render(user) {
      const container = document.createElement("div");
      const color = user.selectionColor as (typeof selectionColors)[number];
      const component = (): JSX.Element => {
        const [blockSelection, setBlockSelection] = createSignal<null | {
          h: number;
          w: number;
          top: number;
          display: string;
        }>(null);

        onMount(() => {
          if (
            container.parentElement?.classList.contains("ProseMirror") ||
            container.parentElement?.classList.contains("content") ||
            container.parentElement?.tagName === "TH" ||
            container.parentElement?.tagName === "TD" ||
            container.parentElement?.tagName === "LI" ||
            container.parentElement?.tagName === "BLOCKQUOTE"
          ) {
            const rect = container.previousElementSibling?.getBoundingClientRect();
            const isElement = container.previousElementSibling?.getAttribute("data-element");
            const relativeParent =
              container.previousElementSibling?.closest("th,td") ||
              document.getElementById("pm-container");

            let parentPos = relativeParent?.getBoundingClientRect();

            if (container.parentElement?.classList.contains("content")) {
              parentPos = container.parentElement?.getBoundingClientRect();
            }

            if (!parentPos || !rect) return;

            setBlockSelection({
              h: rect.height,
              w: rect.width,
              display: isElement ? "none" : "block",
              top: rect.top - parentPos.top
              //  - parseFloat(window.getComputedStyle(container.previousElementSibling!).marginTop)
            });
          }
        });

        return (
          <Show
            when={blockSelection()}
            keyed
            fallback={
              <span class={clsx("relative ring-1", selectionClasses[color].cursor)}>
                {"\u2060"}
                <div
                  class={clsx(
                    "absolute group -top-px -right-px h-2px w-2px flex justify-center items-center ring-2 hover:ring-0 transition-shadow duration-100",
                    selectionClasses[color].cursor
                  )}
                >
                  <div class="absolute h-4 w-4" />
                  <div
                    class={clsx(
                      "absolute pointer-events-none left-0 -top-4 font-bold not-italic text-white dark:text-white",
                      "scale-0 transform duration-150 transition origin-bl delay-100 group-hover:scale-100",
                      "leading-none py-0.5 px-1 whitespace-nowrap rounded-bl-none rounded-md border-0 text-base",
                      selectionClasses[color].label
                    )}
                  >
                    {user.name}
                  </div>
                </div>
                {"\u2060"}
              </span>
            }
          >
            {(blockSelection) => {
              return (
                <div
                  style={{
                    height: `${blockSelection.h}px`,
                    width: `${blockSelection.w}px`,
                    top: `${blockSelection.top}px`,
                    display: blockSelection.display
                  }}
                  class={clsx(
                    "absolute border-2 rounded-[18px] pointer-events-none",
                    selectionClasses[color].outline
                  )}
                >
                  <div
                    class={clsx(
                      "absolute pointer-events-none left-3 -top-5 font-bold not-italic text-white dark:text-white",
                      "leading-none py-0.5 px-1 whitespace-nowrap rounded-b-none rounded-md border-0 text-base",
                      selectionClasses[color].label
                    )}
                  >
                    {user.name}
                  </div>
                </div>
              );
            }}
          </Show>
        );
      };

      container.classList.add("contents");
      setTimeout(() => {
        render(component, container);
      });

      return container;
    }
  });
};

export { CollabCursor };
