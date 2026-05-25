import { Input } from "@andesine/components";
import { Component, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { InputSaveIndicator } from "../../input-save-indicator";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { action, useAction, useSubmission } from "@solidjs/router";

interface SettingsTabProps {
  setTab(tabId: string): void;
  canManageWorkspace?: boolean;
  opened?: boolean;
}

const updateWorkspaceAction = action(async (input: { name: string }) => {
  const [error] = await client.workspaces.update({ name: input.name });

  if (error) throw error;

  return input.name;
});

const WorkspaceGeneralTab: Component<SettingsTabProps> = (props) => {
  const notify = useNotify();
  const { refreshWorkspaces } = useWorkspace();
  const updateWorkspace = useAction(updateWorkspaceAction);
  const updateWorkspaceSubmission = useSubmission(updateWorkspaceAction);

  const [localName, setLocalName] = createSignal(workspace()?.name ?? "");
  const [saveState, setSaveState] = createSignal<"idle" | "saved">("idle");
  let lastSavedName = workspace()?.name ?? "";
  let savedIndicatorTimeout: ReturnType<typeof setTimeout> | undefined;
  const isSaving = createMemo(() => updateWorkspaceSubmission.pending);
  const canManageWorkspace = createMemo(() => props.canManageWorkspace ?? false);

  const isDirty = createMemo(() => {
    const trimmed = localName().trim();

    return Boolean(trimmed) && trimmed !== lastSavedName;
  });
  const saveIndicatorState = createMemo(() => {
    if (!canManageWorkspace()) return "view-only" as const;
    if (isSaving()) return "saving" as const;
    if (saveState() === "saved" && !isDirty()) return "saved" as const;
    if (isDirty()) return "unsaved" as const;

    return "idle" as const;
  });

  createEffect(
    on(
      () => workspace()?.id,
      () => {
        const name = workspace()?.name ?? "";
        lastSavedName = name;
        setLocalName(name);
        setSaveState("idle");
      },
      { defer: true }
    )
  );

  createEffect(() => {
    localName();

    if (saveState() === "saved" && isDirty()) {
      setSaveState("idle");
    }
  });

  createEffect(() => {
    if (savedIndicatorTimeout) {
      clearTimeout(savedIndicatorTimeout);
      savedIndicatorTimeout = undefined;
    }

    if (saveState() !== "saved" || isDirty()) return;

    savedIndicatorTimeout = setTimeout(() => {
      setSaveState("idle");
    }, 1500);
  });

  createEffect(
    on(
      () => props.opened,
      (opened, previous) => {
        if (previous && opened === false) {
          void saveWorkspaceName();
        }
      }
    )
  );

  const saveWorkspaceName = async () => {
    const trimmed = localName().trim();

    if (!canManageWorkspace() || !trimmed || trimmed === lastSavedName || isSaving()) return;

    try {
      await updateWorkspace({ name: trimmed });
      await syncMetadata("workspace");

      lastSavedName = trimmed;
      setLocalName(trimmed);
      refreshWorkspaces();
      setSaveState("saved");
      notify({ type: "success", text: "Workspace name saved" });
    } catch (error) {
      notify({
        type: "error",
        text: "Failed to update workspace name"
      });
      await syncMetadata("workspace");
      setLocalName(lastSavedName);
      setSaveState("idle");
    }
  };

  onCleanup(() => {
    if (savedIndicatorTimeout) {
      clearTimeout(savedIndicatorTimeout);
    }
  });

  return (
    <div class="flex h-full min-w-0 flex-col gap-3 overflow-x-hidden">
      {/* ── Profile section ──────────────────────────────────────────────── */}
      <SettingsSection label="Profile">
        <Setting label="Workspace name" description="The display name for this workspace">
          <div class="flex w-full max-w-md flex-col gap-2">
            <div class="relative">
              <InputSaveIndicator state={saveIndicatorState()} />
              <Input
                placeholder="My Workspace"
                class="w-full pr-28"
                size="small"
                color="contrast"
                variant="outlined"
                value={localName()}
                setValue={(value) => {
                  if (canManageWorkspace()) {
                    setLocalName(value);
                  }
                }}
                disabled={!canManageWorkspace()}
                onBlur={saveWorkspaceName}
                onEnter={() => {
                  void saveWorkspaceName();
                }}
              />
            </div>
          </div>
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { WorkspaceGeneralTab };
