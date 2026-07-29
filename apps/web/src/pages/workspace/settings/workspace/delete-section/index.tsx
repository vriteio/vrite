import { Button } from "@andesine/components";
import { Component, createSignal, Show } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { useWorkspace } from "#web/context/workspace";
import { ConfirmDeletionDialog } from "./confirm-deletion-dialog";

const WorkspaceDeleteSection: Component = () => {
  const { currentWorkspace } = useWorkspace();
  const [opened, setOpened] = createSignal(false);

  return (
    <Show when={currentWorkspace()?.admin}>
      <SettingsSection label="Danger zone">
        <Setting
          label="Delete workspace"
          description="Delete this workspace and all its data"
          fade={false}
        >
          <Button color="danger" variant="outlined" size="small" onClick={() => setOpened(true)}>
            Delete workspace
          </Button>
        </Setting>
      </SettingsSection>
      <ConfirmDeletionDialog
        opened={opened()}
        onClose={() => {
          setOpened(false);
        }}
      />
    </Show>
  );
};

export { WorkspaceDeleteSection };
