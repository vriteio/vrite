import { mdiCircleOutline, mdiPlus, mdiMinus } from "@mdi/js";
import clsx from "clsx";
import { Component, createSignal, onMount, onCleanup, For, Switch, Match } from "solid-js";
import { Icon } from "#components/primitives";

type ChangeIndicatorType = "changed" | "added" | "removed";
interface ChangeIndicator {
  top: number;
  type: ChangeIndicatorType;
}

const ChangeIndicators: Component = () => {
  const [changeIndicators, setChangeIndicators] = createSignal<ChangeIndicator[]>([]);

  onMount(() => {
    const pmContainer = document.getElementById("pm-container")!;
    const observer = new ResizeObserver(() => {
      const changeIndicators: ChangeIndicator[] = [];
      const parentPos = pmContainer.getBoundingClientRect();
      const highlightDiffNodes = document.querySelectorAll("[data-highlight-diff]:not(span)");

      highlightDiffNodes.forEach((node) => {
        const nodePos = node.getBoundingClientRect();

        changeIndicators.push({
          top: nodePos.top - parentPos.top,
          type: node.getAttribute("data-highlight-diff") as ChangeIndicatorType
        });
      });
      setChangeIndicators(changeIndicators);
    });

    observer.observe(pmContainer!);
    onCleanup(() => {
      observer.disconnect();
    });
  });

  return (
    <div class="flex flex-col">
      <For each={changeIndicators()}>
        {(changeIndicator) => {
          const baseClass = "h-6 w-6 p-0.5 rounded-md bg-opacity-10";

          return (
            <div
              class="absolute"
              style={{
                top: `${changeIndicator.top}px`,
                right: `${-32}px`
              }}
            >
              <Switch>
                <Match when={changeIndicator.type === "changed"}>
                  <Icon
                    path={mdiCircleOutline}
                    class={clsx(baseClass, "text-blue-500 bg-blue-500")}
                  />
                </Match>
                <Match when={changeIndicator.type === "added"}>
                  <Icon path={mdiPlus} class={clsx(baseClass, "text-green-500 bg-green-500")} />
                </Match>
                <Match when={changeIndicator.type === "removed"}>
                  <Icon path={mdiMinus} class={clsx(baseClass, "text-red-500 bg-red-500")} />
                </Match>
              </Switch>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export { ChangeIndicators };
export type { ChangeIndicatorType, ChangeIndicator };
