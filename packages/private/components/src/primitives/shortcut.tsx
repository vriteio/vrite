import clsx from "clsx";
import { Component, createMemo, For, Switch, Match } from "solid-js";

interface ShortcutProps {
  shortcut: string;
  class?: string;
}

const Shortcut: Component<ShortcutProps> = (props) => {
  const shortcutPieces = createMemo(() => {
    return props.shortcut.split("+").map((piece) => {
      return piece.toLowerCase().trim();
    });
  });
  return (
    <span class={clsx(":base: font-mono flex items-center justify-center", props.class)}>
      <For each={shortcutPieces()}>
        {(piece) => {
          return (
            <Switch>
              <Match when={piece === "$mod"}>
                <span class="inline-block i-lucide:command" />
              </Match>
              <Match when={piece === "alt"}>
                <span class="inline-block i-lucide:option" />
              </Match>
              <Match when={piece === "shift"}>
                <span class="inline-block i-lucide:arrow-big-up" />
              </Match>
              <Match when={piece === "enter"}>
                <span class="inline-block i-lucide:corner-down-left" />
              </Match>
              <Match when={piece === "backspace"}>
                <span class="inline-block i-lucide:delete" />
              </Match>
              <Match when={/f\d\d?/i.test(piece)}>
                <span class="min-w-3 leading-[1] text-[90%] font-light text-center">
                  {piece.toUpperCase()}
                </span>
              </Match>
              <Match when={true}>
                <span class="w-3 leading-[1] font-light text-center">{piece.toUpperCase()}</span>
              </Match>
            </Switch>
          );
        }}
      </For>
    </span>
  );
};

export { Shortcut };
