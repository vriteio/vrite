import { DropdownMenu, Input, Tooltip } from "@andesine/components";
import type { Editor } from "@tiptap/core";
import clsx from "clsx";
import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { getResourceNameDetails } from "#editor/extensions/resource-name-tracker";
import { MAX_FRAGMENT_NAME_LENGTH } from "#editor/schema";

interface FragmentMenuProps {
  editor: Editor;
  getPos(): number | undefined;
  name: string;
  selected: boolean;
  selectFragment(): void;
  updateName(name: string): void;
}

const FragmentMenu = (props: FragmentMenuProps): JSX.Element => {
  const [opened, setOpened] = createSignal(false);
  const [name, setName] = createSignal(props.name);
  const [nameInputTabIndex, setNameInputTabIndex] = createSignal(0);
  const fragmentNameDetails = () => {
    return getResourceNameDetails(props.editor.state, "fragment", props.getPos(), name());
  };
  const blurInputOnEscape = (event: KeyboardEvent) => {
    const target = event.target;
    const fragmentMenuInput =
      target instanceof HTMLInputElement && target.closest("[data-fragment-menu-input]");

    if (event.key !== "Escape" || !fragmentMenuInput) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    target.blur();
  };
  const commitName = () => props.updateName(name());

  createEffect(() => {
    if (!opened()) setName(props.name);
  });
  onMount(() => {
    document.addEventListener("keydown", blurInputOnEscape, true);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", blurInputOnEscape, true);
  });

  return (
    <DropdownMenu
      title="Fragment settings"
      opened={opened()}
      setOpened={(nextOpened) => {
        if (!opened() && nextOpened) setNameInputTabIndex(0);

        if (opened() && !nextOpened) commitName();

        setOpened(nextOpened);
      }}
      placement="bottom-start"
      portal={false}
      positioningStrategy="absolute"
      cardProps={{ class: "w-full max-w-none not-prose md:max-w-64" }}
      items={[
        () => (
          <div class="flex w-full min-w-0 flex-col gap-1 p-1 md:min-w-60" data-fragment-menu-input>
            <Input
              class="w-full min-w-0 bg-gray-50"
              label="Fragment name"
              size="small"
              color="contrast"
              variant="outlined"
              placeholder="Content"
              maxLength={MAX_FRAGMENT_NAME_LENGTH}
              tabIndex={nameInputTabIndex()}
              value={name()}
              setValue={setName}
              slot={() => (
                <Show when={fragmentNameDetails().warning} keyed>
                  {(warning) => (
                    <div class="absolute right-2">
                      <Tooltip
                        content={
                          <span class="max-w-48 whitespace-pre-wrap leading-tight">{warning}</span>
                        }
                      >
                        <div class="i-lucide:triangle-alert h-4 w-4 bg-gradient-to-tr leading-tight" />
                      </Tooltip>
                    </div>
                  )}
                </Show>
              )}
              onConfirm={commitName}
              onFocus={() => setNameInputTabIndex(-1)}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <p class="text-xs text-gray-400">
              Available via the API as{" "}
              <span class="bg-gray-950/2.5 rounded-md py-0.5 px-1">
                <code class="font-mono text-gray-500 bg-gradient-to-tr text-transparent bg-clip-text">
                  {fragmentNameDetails().name}
                </code>
              </span>
            </p>
          </div>
        )
      ]}
      trigger={() => (
        <button
          type="button"
          class="relative flex mt-1 h-7 md:mt-0 md:h-9 w-full cursor-pointer items-center gap-2 text-sm font-medium"
          aria-label="Configure fragment"
          contentEditable={false}
          data-block-control-anchor
          data-fragment-header
          onClick={props.selectFragment}
        >
          <Show when={props.selected}>
            <span class="absolute inset-y-0 -left-2.5 -z-10 w-[calc(100%+1.25rem)] bg-gradient-to-r from-secondary via-primary to-transparent opacity-10 md:-left-2 md:w-[calc(12rem+0.75rem)] md:rounded-lg" />
          </Show>
          <span class="relative flex h-9 min-w-0 items-center gap-1">
            <span
              class={clsx(
                "h-4.5 w-4.5 shrink-0 i-lucide:letter-text",
                props.selected ? "bg-gradient-to-tr" : "text-gray-300"
              )}
            />
            <span
              class={clsx(
                "min-w-0 truncate text-start",
                props.selected ? "bg-gradient-to-tr bg-clip-text text-transparent" : "text-gray-500"
              )}
            >
              {props.name || "Content"}
            </span>
          </span>
          <span
            class={clsx(
              "h-px flex-1 rounded-full",
              props.selected
                ? "bg-gradient-to-r from-secondary via-primary to-transparent"
                : "bg-gray-200"
            )}
          />
        </button>
      )}
    />
  );
};

export { FragmentMenu };
