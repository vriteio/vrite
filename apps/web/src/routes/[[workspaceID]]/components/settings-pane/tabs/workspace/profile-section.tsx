import { Input, Skeleton, Spinner } from "@andesine/components";
import { Component, createEffect, createSignal, Show } from "solid-js";
import { SettingsSection } from "../../settings-section";
import { Setting } from "../../setting";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/client";
import { createMutation } from "@tanstack/solid-query";
import clsx from "clsx";

const WorkspaceProfileSection: Component = () => {
  const notify = useNotify();
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [name, setName] = createSignal(currentWorkspace()?.name || "");
  const updateWorkspaceNameMutation = createMutation(() => ({
    onSuccess: () => {
      refreshWorkspaces();
    },
    onError: (error) => {
      console.error(error);
      setName(currentWorkspace()?.name || "");
      notify({
        type: "error",
        text: "Failed to update workspace name"
      });
    },
    mutationFn: async (input: { name: string }) => {
      await client.workspaces.update({ name: input.name });
    }
  }));

  createEffect(() => {
    setName(currentWorkspace()?.name || "");
  });

  return (
    <SettingsSection label="Profile">
      <Setting
        label="Workspace name"
        description="The display name for this workspace"
        fade={false}
      >
        <Show
          when={currentWorkspace()}
          fallback={<Skeleton class="h-9 w-full max-w-md rounded-lg" />}
        >
          <div class="flex w-full max-w-md flex-col gap-2">
            <div class="relative">
              <Input
                placeholder="My Workspace"
                class={clsx(
                  "w-full pr-28",
                  updateWorkspaceNameMutation.isPending && "animate-pulse"
                )}
                disabled={updateWorkspaceNameMutation.isPending}
                size="small"
                color="contrast"
                variant="outlined"
                value={name()}
                setValue={setName}
                slot={() => {
                  return (
                    <Show when={updateWorkspaceNameMutation.isPending}>
                      <div class="absolute right-0 p-1.5">
                        <Spinner class="h-4 w-4" color="primary" />
                      </div>
                    </Show>
                  );
                }}
                onConfirm={() => {
                  if (name() !== currentWorkspace()?.name) {
                    updateWorkspaceNameMutation.mutate({ name: name() });
                  }
                }}
                onCancel={() => {
                  setName(currentWorkspace()?.name || "");
                }}
              />
            </div>
          </div>
        </Show>
      </Setting>
    </SettingsSection>
  );
};

export { WorkspaceProfileSection };
