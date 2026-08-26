import { Button, Dialog, IconButton, Input } from "@andesine/components";
import { formatDistanceToNow } from "date-fns";
import { type Component, createSignal } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { type VersionSummary } from "#web/lib/data";

interface CreateVersionDialogProps {
  loading: boolean;
  onClose(): void;
  onConfirm(name: string): void;
  opened: boolean;
}

interface RevertVersionDialogProps {
  loading: boolean;
  onClose(): void;
  onConfirm(): void;
  version: VersionSummary | null;
}

const MAX_VERSION_NAME_LENGTH = 100;

const CreateVersionDialog: Component<CreateVersionDialogProps> = (props) => {
  const [name, setName] = createSignal("");
  const close = () => {
    if (props.loading) return;

    setName("");
    props.onClose();
  };
  const confirm = () => props.onConfirm(name().trim());

  return (
    <Dialog
      opened={props.opened}
      onOverlayClick={close}
      size="small"
      portal
      aria-label="Create version"
    >
      <div class="flex flex-col gap-0.5">
        <h3 class="text-lg font-semibold leading-tight">Create version</h3>
        <p class="text-sm leading-tight text-gray-400">Save the current document as a version.</p>
      </div>
      <label class="flex flex-col gap-1 text-xs">
        <span>Version name</span>
        <Input
          value={name()}
          setValue={setName}
          maxLength={MAX_VERSION_NAME_LENGTH}
          placeholder="Optional name"
          size="small"
          color="contrast"
          variant="outlined"
          disabled={props.loading}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || props.loading) return;

            event.preventDefault();
            confirm();
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
          onClick={close}
        />
        <Button
          class="flex-1"
          color="primary"
          variant="outlined"
          size="small"
          loading={props.loading}
          onClick={confirm}
        >
          Create version
        </Button>
      </div>
    </Dialog>
  );
};

const RevertVersionDialog: Component<RevertVersionDialogProps> = (props) => {
  const affected = () => {
    const version = props.version;

    if (!version) return [];

    return [
      {
        detail: formatDistanceToNow(new Date(version.createdAt), { addSuffix: true }),
        id: version.id,
        icon: "i-lucide:history",
        label: version.name || version.entryName
      }
    ];
  };

  return (
    <ActionConfirmationDialog
      opened={Boolean(props.version)}
      title="Revert to this version?"
      description={
        <>
          The selected version will replace the current document. Its current content is kept in
          version history when needed.
        </>
      }
      affected={affected()}
      action={{
        color: "primary",
        label: "Revert current",
        loading: props.loading,
        onClick: props.onConfirm
      }}
      onClose={props.onClose}
    />
  );
};

export { CreateVersionDialog, MAX_VERSION_NAME_LENGTH, RevertVersionDialog };
