import { Button, Card, IconButton, Overlay, Spinner } from "@andesine/components";
import { Component, createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import { client } from "#web/lib/client";

interface BillingProcessingDialogProps {
  onClose(): void;
  onConfirmed(): void;
  opened: boolean;
}

const POLL_INTERVAL = 2_000;
const POLL_TIMEOUT = 30_000;

const BillingProcessingDialog: Component<BillingProcessingDialogProps> = (props) => {
  const [state, setState] = createSignal<"polling" | "delayed">("polling");
  let pollController: AbortController | undefined;
  const wait = (duration: number, signal: AbortSignal) => {
    return new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      const timeout = setTimeout(finish, duration);

      signal.addEventListener("abort", finish, { once: true });
    });
  };
  const poll = async () => {
    pollController?.abort();
    const controller = new AbortController();
    const deadline = Date.now() + POLL_TIMEOUT;

    pollController = controller;
    setState("polling");

    while (!controller.signal.aborted && Date.now() < deadline) {
      try {
        const subscription = await client.billing.subscription();

        if (subscription.plan === "pro" && subscription.status !== "incomplete") {
          if (!controller.signal.aborted) props.onConfirmed();
          return;
        }
      } catch (error) {
        console.error("Failed to refresh subscription status", error);
      }

      if (!controller.signal.aborted) {
        await wait(Math.min(POLL_INTERVAL, Math.max(0, deadline - Date.now())), controller.signal);
      }
    }

    if (!controller.signal.aborted) setState("delayed");
  };
  const close = () => {
    if (state() === "polling") return;

    props.onClose();
  };

  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (opened) {
          void poll();
        } else {
          pollController?.abort();
        }
      }
    )
  );
  onCleanup(() => pollController?.abort());

  return (
    <Overlay
      opened={props.opened}
      onOverlayClick={close}
      closeOnEscape={state() === "delayed"}
      portal
      aria-label="Confirming subscription"
    >
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-md max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">
              {state() === "polling" ? "Confirming your subscription" : "Confirmation is delayed"}
            </h3>
            <p class="text-sm leading-tight text-gray-400 dark:text-gray-500" aria-live="polite">
              {state() === "polling"
                ? "Stripe accepted your Checkout. Waiting for the subscription to appear in your workspace."
                : "Stripe has not confirmed the subscription yet. You can refresh the status or return later; no additional Checkout is needed."}
            </p>
          </div>
          <Show
            when={state() === "delayed"}
            fallback={
              <div class="flex min-h-16 items-center justify-center gap-2 rounded-xl bg-gray-100 text-sm">
                <Spinner class="h-5 w-5 text-gray-400 dark:text-gray-500" />
                Waiting for Stripe
              </div>
            }
          >
            <div class="flex gap-2">
              <IconButton
                variant="outlined"
                color="contrast"
                text="soft"
                size="small"
                icon="i-lucide:x"
                onClick={close}
              >
                Close
              </IconButton>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                class="flex-1"
                onClick={() => void poll()}
              >
                Refresh status
              </Button>
            </div>
          </Show>
        </Card>
      </Card>
    </Overlay>
  );
};

export { BillingProcessingDialog };
