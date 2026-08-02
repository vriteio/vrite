import { Button, Card, createRef, IconButton, Overlay, ScrollShadow } from "@andesine/components";
import { Component, For, JSX, Show } from "solid-js";

interface AffectedItem {
  detail?: string;
  id: string;
  icon?: string;
  label: string;
}

interface ActionConfirmationDialogProps {
  affected: AffectedItem[];
  confirmLabel: string;
  danger?: boolean;
  description: JSX.Element;
  onClose(): void;
  onConfirm(): void;
  opened: boolean;
  title: string;
  warning?: string;
}

const ActionConfirmationDialog: Component<ActionConfirmationDialogProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);

  return (
    <Overlay opened={props.opened} onOverlayClick={props.onClose} portal aria-label={props.title}>
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-md max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">{props.title}</h3>
            <div class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              {props.description}
            </div>
          </div>
          <Show when={props.affected.length > 0}>
            <Card
              class="flex flex-col justify-start items-start relative rounded-xl p-0 text-sm border-0 overflow-hidden"
              color="contrast"
            >
              <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
              <div
                class="flex flex-col max-h-48 w-full overflow-y-auto p-2 scrollbar-contrast"
                ref={setScrollableContainerRef}
              >
                <For each={props.affected}>
                  {(item, index) => (
                    <>
                      <Show when={index() !== 0}>
                        <div class="w-full h-px bg-gray-200 px-5 my-2 shrink-0 rounded-full" />
                      </Show>
                      <div class="flex items-start justify-center gap-1.5 min-h-8">
                        <div class="h-6 w-6 flex justify-center items-center">
                          <div
                            class={`${item.icon || "i-lucide:user"} h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500`}
                          />
                        </div>
                        <div class="flex min-w-0 flex-1 flex-col">
                          <span class="truncate text-base h-6">{item.label}</span>
                          <Show when={item.detail}>
                            <span class="truncate text-xs text-gray-400 dark:text-gray-500 -mt-1">
                              {item.detail}
                            </span>
                          </Show>
                        </div>
                      </div>
                    </>
                  )}
                </For>
              </div>
            </Card>
          </Show>
          <Show when={props.warning}>
            <div class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              {props.warning}
            </div>
          </Show>
          <div class="flex justify-end gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              size="small"
              text="soft"
              icon="i-lucide:x"
              onClick={props.onClose}
            >
              Cancel
            </IconButton>
            <Button
              color={props.danger ? "danger" : "contrast"}
              variant="outlined"
              size="small"
              onClick={props.onConfirm}
              class="flex-1"
            >
              {props.confirmLabel}
            </Button>
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { ActionConfirmationDialog };
export type { AffectedItem };
