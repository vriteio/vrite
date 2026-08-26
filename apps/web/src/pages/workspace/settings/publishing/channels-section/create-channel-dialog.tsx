import { Button, Dialog, IconButton, Input, Tooltip } from "@andesine/components";
import { type Component, Show } from "solid-js";

interface CreateChannelDialogProps {
  code: string;
  error: string;
  loading: boolean;
  name: string;
  opened: boolean;
  onClose(): void;
  onConfirm(): void;
  setName(name: string): void;
}

const CreateChannelDialog: Component<CreateChannelDialogProps> = (props) => (
  <Dialog
    opened={props.opened}
    onOverlayClick={props.onClose}
    size="small"
    portal
    aria-label="Create channel"
  >
    <div class="flex flex-col gap-0.5">
      <h3 class="text-lg font-semibold leading-tight">Create channel</h3>
      <p class="text-sm leading-tight text-gray-400">
        Channels let you publish separate versions of the same content.
      </p>
    </div>
    <label class="flex flex-col gap-1 text-xs">
      <span>Channel name</span>
      <Input
        value={props.name}
        setValue={props.setName}
        maxlength={50}
        placeholder="Staging"
        size="small"
        color="contrast"
        variant="outlined"
        disabled={props.loading}
        slotWrapperClass="w-full"
        slot={() => (
          <Show when={props.error}>
            <div class="absolute right-2">
              <Tooltip content={props.error} placement="top">
                <div
                  class="i-lucide:triangle-alert h-4.5 w-4.5 text-red-500"
                  title={props.error}
                  aria-label={props.error}
                  tabindex="0"
                />
              </Tooltip>
            </div>
          </Show>
        )}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || props.loading || props.error) return;

          event.preventDefault();
          props.onConfirm();
        }}
      />
      <Show when={props.code && !props.error}>
        <p class="text-xs text-gray-400">
          Will be available via the API as{" "}
          <span class="bg-gray-950/2.5 rounded-md py-0.5 px-1">
            <code class="font-mono text-gray-500 bg-gradient-to-tr text-transparent bg-clip-text">
              {props.code}
            </code>
          </span>
        </p>
      </Show>
    </label>
    <div class="flex gap-2">
      <IconButton
        variant="outlined"
        color="contrast"
        text="soft"
        size="small"
        icon="i-lucide:x"
        disabled={props.loading}
        onClick={props.onClose}
      />
      <Button
        class="flex-1"
        color="primary"
        variant="outlined"
        size="small"
        loading={props.loading}
        disabled={Boolean(props.error)}
        onClick={props.onConfirm}
      >
        Create channel
      </Button>
    </div>
  </Dialog>
);

export { CreateChannelDialog };
