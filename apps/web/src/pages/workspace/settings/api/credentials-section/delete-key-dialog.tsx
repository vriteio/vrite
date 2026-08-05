import { Button, Card, createRef, IconButton, Input, Overlay } from "@andesine/components";
import { type Component, createEffect, createSignal, createUniqueId } from "solid-js";

interface DeleteKeyDialogProps {
  keys: Array<{ id: string; name: string }>;
  loading?: boolean;
  onClose(): void;
  onConfirm(ids: string[]): void;
}

const DeleteKeyDialog: Component<DeleteKeyDialogProps> = (props) => {
  const [confirmationInput, setConfirmationInput] = createRef<HTMLInputElement | null>(null);
  const [confirmation, setConfirmation] = createSignal("");
  const [visibleKeys, setVisibleKeys] = createSignal(props.keys);
  const instructionID = createUniqueId();
  const handleClose = () => {
    if (props.loading) return;

    props.onClose();
    setTimeout(() => {
      setVisibleKeys([]);
      setConfirmation("");
    }, 300);
  };
  const confirmationText = () => {
    return visibleKeys().length > 1 ? "DELETE" : visibleKeys()[0]?.name || "";
  };

  createEffect(() => {
    if (props.keys.length > 0) {
      setVisibleKeys(props.keys);
      setConfirmation("");
      queueMicrotask(() => confirmationInput()?.focus());
    }
  });

  return (
    <Overlay
      opened={props.keys.length > 0}
      onOverlayClick={handleClose}
      aria-label="Delete API key"
    >
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-md max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">
              Delete {visibleKeys().length > 1 ? `${visibleKeys().length} API keys` : "API key"}?
            </h3>
            <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              {visibleKeys().length > 1 ? "These keys" : "This key"} will stop working immediately.
              This cannot be undone.
            </p>
          </div>
          <label class="flex flex-col gap-1 text-xs">
            <span id={instructionID}>
              Type <span class="font-mono font-medium">{confirmationText()}</span> to confirm
            </span>
            <Input
              ref={setConfirmationInput}
              aria-describedby={instructionID}
              value={confirmation()}
              setValue={setConfirmation}
              disabled={props.loading}
              placeholder={confirmationText()}
              class="font-mono"
              size="small"
              color="contrast"
              variant="outlined"
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  props.loading ||
                  confirmation() !== confirmationText()
                ) {
                  return;
                }

                event.preventDefault();
                props.onConfirm(visibleKeys().map(({ id }) => id));
              }}
            />
          </label>
          <div class="flex gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:x"
              disabled={props.loading}
              onClick={handleClose}
            />
            <Button
              color="danger"
              variant="outlined"
              size="small"
              loading={props.loading}
              disabled={confirmation() !== confirmationText()}
              onClick={() => props.onConfirm(visibleKeys().map(({ id }) => id))}
              class="flex-1"
            >
              Delete permanently
            </Button>
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { DeleteKeyDialog };
