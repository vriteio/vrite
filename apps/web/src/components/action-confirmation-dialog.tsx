import {
  Button,
  Card,
  createRef,
  Dialog,
  IconButton,
  ScrollShadow,
  Tooltip
} from "@andesine/components";
import clsx from "clsx";
import { type Component, createEffect, createSignal, For, type JSX, Show } from "solid-js";

interface AffectedItem {
  detail?: string;
  id: string;
  icon?: string;
  label: string;
}
interface ConfirmationDialogAction {
  color: "danger" | "base" | "primary";
  icon?: string;
  label: string;
  loading?: boolean;
  onClick(): void;
}

interface ActionConfirmationDialogProps {
  action: ConfirmationDialogAction;
  affected: AffectedItem[];
  description: JSX.Element;
  onClose(): void;
  opened: boolean;
  secondaryAction?: Omit<ConfirmationDialogAction, "color">;
  title: string;
  warning?: string;
}

interface ActionConfirmationDialogState {
  action: ConfirmationDialogAction;
  affected: AffectedItem[];
  description: JSX.Element;
  secondaryAction?: Omit<ConfirmationDialogAction, "color">;
  title: string;
  warning?: string;
}
interface ConfirmationDialogActionButtonProps {
  action: Omit<ConfirmationDialogAction, "color">;
  secondary?: boolean;
  class: string;
  color?: ConfirmationDialogAction["color"];
  disabled?: boolean;
}

const ConfirmationDialogActionButton: Component<ConfirmationDialogActionButtonProps> = (props) => (
  <Show
    when={props.action.icon}
    fallback={
      <Button
        color={props.color || "contrast"}
        variant="outlined"
        size="small"
        loading={props.action.loading}
        disabled={props.disabled}
        onClick={props.action.onClick}
        class={props.class}
      >
        {props.action.label}
      </Button>
    }
  >
    {(icon) => (
      <IconButton
        icon={icon()}
        iconProps={{ class: clsx("h-4 w-4", props.secondary && "text-gray-400") }}
        label={props.action.label}
        color={props.color || "contrast"}
        variant="outlined"
        size="small"
        loading={props.action.loading}
        disabled={props.disabled}
        onClick={props.action.onClick}
        class={props.class}
      />
    )}
  </Show>
);

const ActionConfirmationDialog: Component<ActionConfirmationDialogProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [displayedState, setDisplayedState] = createSignal<ActionConfirmationDialogState>({
    action: { ...props.action },
    affected: props.affected.map((item) => ({ ...item })),
    description: props.description,
    secondaryAction: props.secondaryAction ? { ...props.secondaryAction } : undefined,
    title: props.title,
    warning: props.warning
  });

  createEffect(() => {
    if (!props.opened) return;

    setDisplayedState({
      action: { ...props.action },
      affected: props.affected.map((item) => ({ ...item })),
      description: props.description,
      secondaryAction: props.secondaryAction ? { ...props.secondaryAction } : undefined,
      title: props.title,
      warning: props.warning
    });
  });

  return (
    <Dialog
      opened={props.opened}
      onOverlayClick={props.onClose}
      cardClass={displayedState().secondaryAction ? "relative" : undefined}
      portal
      aria-label={displayedState().title}
    >
      <div class="flex flex-col gap-0.5">
        <h3 class="text-lg font-semibold leading-tight">{displayedState().title}</h3>
        <div class="text-sm leading-tight text-gray-400">{displayedState().description}</div>
      </div>
      <Show when={displayedState().affected.length > 0}>
        <Card
          class="flex flex-col justify-start items-start relative rounded-lg p-0 text-sm border-0 overflow-hidden"
          color="contrast"
        >
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <div
            class="flex flex-col max-h-48 w-full overflow-y-auto p-2 scrollbar-contrast"
            ref={setScrollableContainerRef}
          >
            <For each={displayedState().affected}>
              {(item, index) => (
                <>
                  <Show when={index() !== 0}>
                    <div class="w-full h-px bg-gray-200 px-5 my-2 shrink-0 rounded-full" />
                  </Show>
                  <div class="flex items-start justify-center gap-1.5">
                    <div class="h-6 w-6 flex justify-center items-center">
                      <div
                        class={`${item.icon || "i-lucide:user"} h-5 w-5 shrink-0 text-gray-400`}
                      />
                    </div>
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="truncate text-base h-6">{item.label}</span>
                      <Show when={item.detail}>
                        <span class="truncate text-xs text-gray-400 -mt-1">{item.detail}</span>
                      </Show>
                    </div>
                  </div>
                </>
              )}
            </For>
          </div>
        </Card>
      </Show>
      <Show when={displayedState().warning}>
        <div class="text-sm leading-tight text-gray-400">{displayedState().warning}</div>
      </Show>
      <Show
        when={displayedState().secondaryAction}
        fallback={
          <div class="flex justify-end gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              size="small"
              text="soft"
              icon="i-lucide:x"
              disabled={displayedState().action.loading}
              onClick={props.onClose}
            >
              Cancel
            </IconButton>
            <ConfirmationDialogActionButton
              action={displayedState().action}
              color={displayedState().action.color}
              class="flex-1"
            />
          </div>
        }
      >
        {(secondaryAction) => (
          <>
            <Tooltip content="Close" wrapperClass="absolute right-2 top-2" placement="left">
              <IconButton
                variant="text"
                text="soft"
                size="small"
                icon="i-lucide:x"
                disabled={displayedState().action.loading || secondaryAction().loading}
                onClick={props.onClose}
              />
            </Tooltip>
            <div class="flex flex-col gap-1">
              <ConfirmationDialogActionButton
                action={displayedState().action}
                color={displayedState().action.color}
                disabled={secondaryAction().loading}
                class="w-full"
              />
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <div class="h-px flex-1 bg-gray-200" />
                or
                <div class="h-px flex-1 bg-gray-200" />
              </div>
              <ConfirmationDialogActionButton
                action={secondaryAction()}
                disabled={displayedState().action.loading}
                secondary
                class="w-full"
              />
            </div>
          </>
        )}
      </Show>
    </Dialog>
  );
};

export { ActionConfirmationDialog };
export type { AffectedItem, ConfirmationDialogAction };
