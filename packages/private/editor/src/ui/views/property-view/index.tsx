import { Button, DropdownArea, DropdownMenu, IconButton, Input } from "@andesine/components";
import { NodeViewWrapper, useSolidNodeView } from "@andesine/tiptap-solid";
import { createEffect, Match, Show, Switch } from "solid-js";
import clsx from "clsx";

interface PropertyAttributes {
  type: "text" | "long-text";
  label: string;
  value: string;
}

const PropertyView = () => {
  const { state } = useSolidNodeView<PropertyAttributes>();
  const attrs = () => state().node.attrs;
  createEffect(() => {
    console.log(state());
  });

  return (
    <NodeViewWrapper>
      <div class="flex gap-4 items-start w-full min-h-9">
        <DropdownArea>
          <div class="flex gap-1 items-center min-w-48 font-medium h-9 relative">
            <Show when={state().selected}>
              <div class="absolute bg-gradient-to-r from-secondary via-primary to-transparent opacity-10 rounded-lg w-[calc(100%+0.75rem)] h-full top-0 -left-2 -z-10" />
            </Show>
            <DropdownMenu
              activatorButton={() => {
                return (
                  <button>
                    <div
                      class={clsx("h-5 w-5 bg-gradient-to-tr", {
                        "i-lucide:text-cursor-input": attrs().type === "text",
                        "i-lucide:text": attrs().type === "long-text"
                      })}
                    />
                  </button>
                );
              }}
              placement="bottom-start"
              cardProps={{
                class: "w-56"
              }}
              options={[
                {
                  icon: "i-lucide:text-cursor-input",
                  label: "Short text",
                  onClick() {
                    state().updateAttributes({
                      type: "text"
                    });
                  }
                },
                {
                  icon: "i-lucide:text",
                  label: "Long text",
                  onClick() {
                    console.log("Long text clicked");
                    state().updateAttributes({
                      type: "long-text"
                    });
                  }
                },
                {
                  icon: "i-lucide:hash",
                  label: "Number"
                },
                {
                  icon: "i-lucide:square-check",
                  label: "Checkbox"
                },
                {
                  icon: "i-lucide:calendar",
                  label: "Date"
                },
                {
                  icon: "i-lucide:link",
                  label: "URL"
                },
                {
                  icon: "i-lucide:circle-chevron-down",
                  label: "Select"
                },
                {
                  icon: "i-lucide:list-collapse",
                  label: "Multi-select"
                },
                {
                  icon: "i-lucide:history",
                  label: "Version tag"
                },
                {
                  icon: "i-lucide:route",
                  label: "Relation"
                }
              ]}
            />
            {attrs().label || "Property"}
          </div>
        </DropdownArea>
        <div class="h-full flex items-center min-h-9 flex-1">
          <Switch>
            <Match when={attrs().type === "text"}>
              <Input
                variant="outlined"
                color="contrast"
                size="small"
                placeholder="Enter text"
                class="outline-transparent shadow-none bg-transparent focus:shadow-md focus:outline-gray-200"
              />
            </Match>
            <Match when={attrs().type === "long-text"}>
              <Input
                variant="outlined"
                color="contrast"
                size="small"
                textarea
                placeholder="Enter text"
                class="outline-transparent shadow-none bg-transparent focus:shadow-md focus:outline-gray-200"
              />
            </Match>
          </Switch>
        </div>
      </div>
      {/*<div class="flex gap-2 items-center w-full my-3">
        <div class="flex-1 bg-gray-200 h-px rounded-full" />
      </div>*/}
    </NodeViewWrapper>
  );
};

export { PropertyView };
