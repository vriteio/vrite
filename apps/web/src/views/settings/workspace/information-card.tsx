import { SettingsImageUpload } from "../image-upload";
import { mdiInformation } from "@mdi/js";
import { Component, Show, createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Button, Loader } from "#components/primitives";
import { App, hasPermission, useClientContext, useNotificationsContext } from "#context";
import { InputField, TitledCard } from "#components/fragments";

interface InformationCardProps {
  workspace: Omit<App.Workspace, "contentGroups"> | null;
  workspaceLoading: boolean;
}

const InformationCard: Component<InformationCardProps> = (props) => {
  const { client } = useClientContext();
  const { notify } = useNotificationsContext();
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
          <Button
            color="primary"
            class="m-0 flex justify-center items-center"
            disabled={!edited() || !workspaceData.name}
            loading={loading()}
            onClick={async () => {
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
            }}
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
