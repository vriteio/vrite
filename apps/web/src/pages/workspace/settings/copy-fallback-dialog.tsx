import { Button, Card, Overlay } from "@andesine/components";
import { Component } from "solid-js";

interface CopyFallbackDialogProps {
  description?: string;
  onClose(): void;
  opened: boolean;
  title?: string;
  value: string;
}

const CopyFallbackDialog: Component<CopyFallbackDialogProps> = (props) => {
  return (
    <Overlay
      opened={props.opened}
      onOverlayClick={props.onClose}
      portal
      aria-label={props.title || "Copy manually"}
    >
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-lg max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">{props.title || "Copy manually"}</h3>
            <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              {props.description || "Clipboard access failed. Select and copy the value below."}
            </p>
          </div>
          <Card
            class="flex min-h-16 items-center justify-center break-all rounded-xl border-0 p-3 font-mono text-sm select-all"
            color="contrast"
          >
            {props.value}
          </Card>
          <Button color="primary" variant="outlined" size="small" onClick={props.onClose}>
            Close
          </Button>
        </Card>
      </Card>
    </Overlay>
  );
};

export { CopyFallbackDialog };
