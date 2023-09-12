import { SettingsImageUpload } from "../image-upload";
import { mdiCheck, mdiInformation } from "@mdi/js";
import { Component, Show, createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Button, IconButton, Loader, Tooltip } from "#components/primitives";
import { App, hasPermission, useClient, useNotifications } from "#context";
import { InputField, TitledCard } from "#components/fragments";

interface InformationCardProps {
  workspace: Omit<App.Workspace, "contentGroups"> | null;
  workspaceLoading: boolean;
}

const InformationCard: Component<InformationCardProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [edited, setEdited] = createSignal(false);
  const [workspaceData, setWorkspaceData] = createStore<Omit<App.Workspace, "contentGroups">>({
    id: "",
    name: "",
    description: "",
    logo: ""
  });
  const handleWorkspaceDataChange = <K extends Exclude<keyof App.Workspace, "contentGroups">>(
    key: K,
    value: App.Workspace[K]
  ): void => {
    if (workspaceData[key] !== value) setEdited(true);

    setWorkspaceData(key, value);
  };
  const handleUpdateInfo = async (): Promise<void> => {
    setLoading(true);

    try {
      await client.workspaces.update.mutate({ ...workspaceData });
      notify({
        type: "success",
        text: "Workspace details updated"
      });
      setEdited(false);
    } catch (e) {
      notify({
        type: "error",
        text: "Failed to update workspace details"
      });
    } finally {
      setLoading(false);
    }
  };

  createEffect(async () => {
    if (props.workspace) {
      setWorkspaceData((workspaceData) => props.workspace || workspaceData);
    }
  });

  return (
    <TitledCard
      icon={mdiInformation}
      label="Details"
      action={
        <Show when={!props.workspaceLoading && hasPermission("manageWorkspace")}>
          <Tooltip text="Update" wrapperClass="flex @md:hidden" class="mt-1" fixed>
            <IconButton
              path={mdiCheck}
              class="m-0"
              color="primary"
              disabled={!edited() || !workspaceData.name}
              onClick={handleUpdateInfo}
            />
          </Tooltip>
          <Button
            color="primary"
            class="m-0 hidden @md:flex"
            disabled={!edited() || !workspaceData.name}
            loading={loading()}
            onClick={handleUpdateInfo}
          >
            Update
          </Button>
        </Show>
      }
    >
      <Show when={!props.workspaceLoading} fallback={<Loader />}>
        <div class="flex w-full gap-4 justify-center items-center">
          <SettingsImageUpload
            disabled={loading()}
            url={workspaceData.logo || ""}
            label="Logo"
            onUpload={(url) => {
              handleWorkspaceDataChange("logo", url);
            }}
          />
          <div class="flex-1">
            <InputField
              type="text"
              color="contrast"
              inputProps={{ maxLength: 50 }}
              label="Workspace Name"
              placeholder="Name"
              value={workspaceData.name}
              disabled={!hasPermission("manageWorkspace") || loading()}
              setValue={(value) => {
                handleWorkspaceDataChange("name", value);
              }}
            />
          </div>
        </div>
        <InputField
          type="text"
          color="contrast"
          label="Description"
          optional
          textarea
          placeholder="Workspace description"
          value={workspaceData.description || ""}
          disabled={!hasPermission("manageWorkspace") || loading()}
          setValue={(value) => {
            handleWorkspaceDataChange("description", value);
          }}
        >
          Additional details about the workspace
        </InputField>
      </Show>
    </TitledCard>
  );
};

export { InformationCard };
