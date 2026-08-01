import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { Button, Card, IconButton, Overlay, Tooltip } from "@andesine/components";
import { createMutation } from "@tanstack/solid-query";
import { Component } from "solid-js";

const SnapshotErrorDialog: Component = () => {
  const notify = useNotify();
  const { content, workspaceID } = useWorkspace();
  const retryMutation = createMutation(() => ({
    mutationFn: () => content.syncWorkspaceContent(workspaceID()),
    onError: () => {
      notify({ type: "error", text: "Couldn't load workspace content" });
    }
  }));

  return (
    <Overlay opened={content.snapshotError()} onOverlayClick={() => retryMutation.mutate()} portal>
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-sm flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">Couldn't load this workspace</h3>
            <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              Workspace content couldn't be synced from the server. Check your connection and try
              again.
            </p>
          </div>
          <div class="flex gap-2">
            <Tooltip content="Reload page">
              <IconButton
                variant="outlined"
                color="contrast"
                text="soft"
                size="small"
                icon="i-lucide:rotate-cw"
                onClick={() => window.location.reload()}
              />
            </Tooltip>
            <Button
              color="primary"
              variant="outlined"
              size="small"
              class="flex-1"
              loading={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
            >
              Try again
            </Button>
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { SnapshotErrorDialog };
