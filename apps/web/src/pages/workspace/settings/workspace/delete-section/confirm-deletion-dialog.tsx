import { Button, Card, IconButton, Input, Overlay } from "@andesine/components";
import { Component, createSignal, Show } from "solid-js";
import { createMutation } from "@tanstack/solid-query";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/client";

interface ConfirmDeletionDialogProps {
  opened: boolean;
  onClose(): void;
}

const ConfirmDeletionDialog: Component<ConfirmDeletionDialogProps> = (props) => {
  const notify = useNotify();
  const { content, currentWorkspace, refreshWorkspaces, switchWorkspace, workspaces } =
    useWorkspace();
  const [confirmation, setConfirmation] = createSignal("");
  const deleteWorkspaceMutation = createMutation(() => ({
    mutationFn: async () => {
      const workspace = currentWorkspace();

      if (!workspace) throw new Error("Workspace not found");

      return {
        deletedWorkspaceID: workspace.id,
        result: await client.workspaces.delete()
      };
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: "Failed to delete workspace. No local data was removed."
      });
    },
    onSuccess: async ({ deletedWorkspaceID, result }) => {
      await Promise.allSettled([
        content.disposeWorkspaceContent(deletedWorkspaceID),
        refreshWorkspaces()
      ]);

      if (result.workspaceID) {
        window.location.href = `/${result.workspaceID}/`;
        return;
      }

      const remainingWorkspace = workspaces().find(({ id }) => id !== deletedWorkspaceID);

      if (remainingWorkspace) {
        await switchWorkspace(remainingWorkspace.id);
        return;
      }

      window.location.href = "/new-workspace";
    }
  }));
  const close = () => {
    if (deleteWorkspaceMutation.isPending) return;

    setConfirmation("");
    props.onClose();
  };
  const canConfirm = () => {
    const workspace = currentWorkspace();

    return Boolean(
      workspace && confirmation() === workspace.name && !deleteWorkspaceMutation.isPending
    );
  };

  return (
    <Overlay opened={props.opened} onOverlayClick={close} portal aria-label="Delete workspace">
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-md max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">Delete workspace permanently?</h3>
            <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              All workspace data will be permanently deleted and any active subscription cancelled.
              This cannot be undone.
            </p>
          </div>
          <label class="flex flex-col gap-1 text-xs">
            <span>
              Type{" "}
              <span class="relative">
                <div class="absolute rounded-md top-0 left-0 h-full w-full bg-gray-950/2.5" />
                <span class="font-mono relative font-medium py-0.5 px-1 whitespace-pre-wrap leading-normal">
                  {currentWorkspace()?.name}
                </span>
              </span>{" "}
              to confirm
            </span>
            <Input
              value={confirmation()}
              setValue={setConfirmation}
              disabled={deleteWorkspaceMutation.isPending}
              placeholder={currentWorkspace()?.name}
              class="font-mono"
              size="small"
              color="contrast"
              variant="outlined"
            />
          </label>
          <div class="flex justify-end gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              size="small"
              text="soft"
              icon="i-lucide:x"
              disabled={deleteWorkspaceMutation.isPending}
              onClick={close}
            >
              Cancel
            </IconButton>
            <Button
              color="danger"
              variant="outlined"
              size="small"
              loading={deleteWorkspaceMutation.isPending}
              disabled={!canConfirm()}
              onClick={() => deleteWorkspaceMutation.mutate()}
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

export { ConfirmDeletionDialog };
