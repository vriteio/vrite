import { WorkspaceViewAction } from "./view";
import { Component, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { mdiCheck } from "@mdi/js";
import { InputField, ScrollShadow } from "#components/fragments";
import { App, useClient } from "#context";
import { SettingsImageUpload } from "#views/settings/image-upload";
import { Tooltip, IconButton } from "#components/primitives";
import { createRef } from "#lib/utils";

interface WorkspaceCreateSectionProps {
  setActionComponent(component: Component): void;
  onWorkspaceCreated(): void;
}

const WorkspaceCreateSection: Component<WorkspaceCreateSectionProps> = (props) => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [edited, setEdited] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [workspaceData, setWorkspaceData] = createStore<Omit<App.Workspace, "contentGroups">>({
    id: "",
    name: "",
    description: "",
    logo: ""
  });
  const filled = createMemo(() => workspaceData.name);
  const handleWorkspaceDataChange = <K extends Exclude<keyof App.Workspace, "contentGroups">>(
    key: K,
    value: App.Workspace[K]
  ): void => {
    if (workspaceData[key] !== value) setEdited(true);

    setWorkspaceData(key, value);
  };

  props.setActionComponent(() => {
    return (
      <Tooltip text="Create workspace" class="mt-1" fixed>
        <IconButton
          color="primary"
          path={mdiCheck}
          class="m-0"
          disabled={!filled()}
          loading={loading()}
          onClick={async () => {
            setLoading(true);
            await client.workspaces.create.mutate(workspaceData);
            setLoading(false);
            props.onWorkspaceCreated();
          }}
        ></IconButton>
      </Tooltip>
    );
  });

  return (
    <div class="px-4 pb-4 h-full w-full overflow-hidden grid relative">
      <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
      <div
        class="flex flex-col gap-2 w-full overflow-y-auto h-full scrollbar-sm pr-2"
        ref={setScrollableContainerRef}
      >
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
          disabled={loading()}
          setValue={(value) => {
            handleWorkspaceDataChange("description", value);
          }}
        >
          Additional details about the workspace
        </InputField>
      </div>
    </div>
  );
};

export { WorkspaceCreateSection };
