import { Accessor, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Node } from "@tiptap/pm/model";
import { Card, Button } from "#components/primitives";

interface Autocomplete {
  element: HTMLElement;
  content: Accessor<string>;
  parent: Accessor<Node | null>;
  setContent(content: string): void;
  setParent(parent: Node | null): void;
}

const createAutocomplete = (): Autocomplete => {
  const container = document.createElement("div");
  const menu = document.createElement("div");
  const autocompletion = document.createElement("span");
  const pmContainer = document.getElementById("pm-container");
  const pmContainerRect = pmContainer?.getBoundingClientRect();
  const [position, setPosition] = createSignal(0);
  const [parent, setParent] = createSignal<Node | null>(null);
  const [content, setContent] = createSignal("");

  container.setAttribute("class", "inline relative group");
  autocompletion.setAttribute("class", "opacity-30");
  autocompletion.setAttribute("contenteditable", "false");
  menu.setAttribute("class", "absolute top-0 left-0 h-full w-full");
  container.append(autocompletion, menu);
  render(() => {
    return (
      <Card
        class="invisible pointer-events-none opacity-0 ease-out duration-350 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto p-0 m-0 absolute -top-9 not-prose whitespace-nowrap rounded-xl"
        style={{
          "transition-property": "opacity, visibility",
          "left": `${position()}px`
        }}
      >
        <div class="h-8 flex gap-1 justify-center items-center px-1">
          <Button
            class="m-0 flex justify-center items-center gap-1 group/btn"
            variant="text"
            size="small"
            onClick={() => {}}
          >
            Accept
            <kbd class="text-xs bg-gray-200 dark:bg-gray-700 group-hover/btn:bg-gray-200 dark:group-hover/btn:bg-gray-800 flex justify-center items-center rounded-[0.25rem] px-0.5 h-4">
              Tab
            </kbd>
          </Button>
          <Button
            class="m-0 flex justify-center items-center gap-1 group/btn"
            variant="text"
            size="small"
          >
            Accept token
            <kbd class="text-xs bg-gray-200 dark:bg-gray-700 group-hover/btn:bg-gray-200 dark:group-hover/btn:bg-gray-800 flex justify-center items-center rounded-[0.25rem] px-0.5 h-4">
              Shift Tab
            </kbd>
          </Button>
        </div>
      </Card>
    );
  }, menu);

  return {
    element: container,
    parent,
    content,
    setParent,
    setContent(content: string) {
      const menuRect = menu.firstElementChild?.getBoundingClientRect();

      if (menuRect && pmContainerRect) {
        if (menuRect.x + menuRect.width > pmContainerRect.width + pmContainerRect.x) {
          setPosition(-menuRect.width - (menuRect.x - pmContainerRect.width - pmContainerRect.x));
        } else {
          setPosition(0);
        }
      }

      autocompletion.textContent = content;
      setContent(content);
    }
  };
};

export { createAutocomplete };
export type { Autocomplete };
