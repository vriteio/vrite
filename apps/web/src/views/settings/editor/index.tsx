import { marks, blocks, embeds } from "./options";
import { SettingsSectionComponent } from "../view";
import { mdiApplicationBrackets, mdiCodeTagsCheck, mdiFormatText, mdiImage } from "@mdi/js";
import { Accessor, For, Show, createSignal, onCleanup } from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { debounce } from "@solid-primitives/scheduled";
import { Heading, IconButton, Loader } from "#components/primitives";
import { MiniCodeEditor, TitledCard } from "#components/fragments";
import { App, hasPermission, useClient, useNotifications } from "#context";

const useWorkspaceSettings = (): {
  loading: Accessor<boolean>;
  workspaceSettings: Omit<App.WorkspaceSettings, "id">;
  setWorkspaceSettings: SetStoreFunction<Omit<App.WorkspaceSettings, "id">>;
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(true);
  const [workspaceSettings, setWorkspaceSettings] = createStore<Omit<App.WorkspaceSettings, "id">>({
    marks: [],
    blocks: [],
    embeds: [],
    prettierConfig: "{}"
  });

  client.workspaceSettings.get.query().then((workspaceSettings) => {
    setLoading(false);
    setWorkspaceSettings(workspaceSettings);
  });

  const workspaceSettingsChanges = client.workspaceSettings.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "update") {
        setWorkspaceSettings(data);
      }
    }
  });

  onCleanup(() => {
    workspaceSettingsChanges.unsubscribe();
  });

  return {
    loading,
    workspaceSettings,
    setWorkspaceSettings
  };
};
const EditorSection: SettingsSectionComponent = () => {
  const { notify } = useNotifications();
  const client = useClient();
  const { loading, workspaceSettings, setWorkspaceSettings } = useWorkspaceSettings();
  const updateMarks = debounce(() => {
    client.workspaceSettings.update.mutate({
      marks: workspaceSettings.marks
    });
  }, 350);
  const updateBlocks = debounce(() => {
    client.workspaceSettings.update.mutate({
      blocks: workspaceSettings.blocks
    });
  }, 350);
  const updateEmbeds = debounce(() => {
    client.workspaceSettings.update.mutate({
      embeds: workspaceSettings.embeds
    });
  }, 350);

  return (
    <>
      <TitledCard label="Inline formatting" icon={mdiFormatText}>
        <Show when={!loading()} fallback={<Loader />}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Select the inline formatting options that should be enabled in the editor for all users
            of the workspace
          </p>
          <div class="flex flex-wrap gap-2">
            <For each={marks}>
              {({ icon, label, value }) => {
                const active = (): boolean => {
                  return workspaceSettings.marks.includes(value);
                };

                return (
                  <IconButton
                    color={active() ? "primary" : "contrast"}
                    text={active() ? "primary" : "soft"}
                    badge={!hasPermission("manageWorkspace")}
                    disabled={!hasPermission("manageWorkspace")}
                    hover={hasPermission("manageWorkspace")}
                    onClick={() => {
                      updateMarks.clear();
                      setWorkspaceSettings("marks", () => {
                        if (active()) {
                          return workspaceSettings.marks.filter((block) => block !== value);
                        } else {
                          return [...workspaceSettings.marks, value];
                        }
                      });
                      updateMarks();
                    }}
                    class="m-0"
                    path={icon}
                    label={label}
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </TitledCard>
      <TitledCard label="Block content" icon={mdiImage}>
        <Show when={!loading()} fallback={<Loader />}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Select content blocks that should be enabled in the editor for all users of the
            workspace
          </p>
          <div class="flex flex-col gap-2 w-full">
            <For
              each={[
                { label: "Headings", blocks: blocks.headings },
                { label: "Lists", blocks: blocks.lists },
                { label: "Others", blocks: blocks.others }
              ]}
            >
              {({ label, blocks }) => {
                return (
                  <>
                    <Heading level={3} class="flex-1 text-start w-full">
                      {label}
                    </Heading>
                    <div class="grid grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4 gap-2">
                      <For each={blocks}>
                        {({ icon, label, value }) => {
                          const active = (): boolean => {
                            return workspaceSettings.blocks.includes(value);
                          };

                          return (
                            <IconButton
                              color={active() ? "primary" : "contrast"}
                              text={active() ? "primary" : "soft"}
                              badge={!hasPermission("manageWorkspace")}
                              disabled={!hasPermission("manageWorkspace")}
                              hover={hasPermission("manageWorkspace")}
                              onClick={() => {
                                updateBlocks.clear();
                                setWorkspaceSettings("blocks", () => {
                                  if (active()) {
                                    return workspaceSettings.blocks.filter(
                                      (block) => block !== value
                                    );
                                  } else {
                                    return [...workspaceSettings.blocks, value];
                                  }
                                });
                                updateBlocks();
                              }}
                              class="m-0 flex-col h-20"
                              path={icon}
                              label={label}
                            />
                          );
                        }}
                      </For>
                    </div>
                  </>
                );
              }}
            </For>
          </div>
        </Show>
      </TitledCard>
      <TitledCard label="Embeds" icon={mdiApplicationBrackets}>
        <Show when={!loading()} fallback={<Loader />}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Select which embeds to enabled in the editor for all users of the workspace
          </p>
          <div class="grid grid-cols-2 @md:grid-cols-3 gap-2 w-full">
            <For each={embeds}>
              {({ icon, label, value }) => {
                const active = (): boolean => workspaceSettings.embeds.includes(value);

                return (
                  <IconButton
                    color={active() ? "primary" : "contrast"}
                    text={active() ? "primary" : "soft"}
                    badge={!hasPermission("manageWorkspace")}
                    disabled={!hasPermission("manageWorkspace")}
                    hover={hasPermission("manageWorkspace")}
                    onClick={() => {
                      updateEmbeds.clear();
                      setWorkspaceSettings("embeds", () => {
                        if (active()) {
                          return workspaceSettings.embeds.filter((block) => block !== value);
                        } else {
                          return [...workspaceSettings.embeds, value];
                        }
                      });
                      updateEmbeds();
                    }}
                    class="m-0 flex-col flex-1 h-20"
                    path={icon}
                    label={label}
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </TitledCard>
      <TitledCard label="Prettier config" icon={mdiCodeTagsCheck}>
        <Show when={!loading()} fallback={<Loader />}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Customize your Prettier config for consistent code formatting for all users of the
            workspace
          </p>
          <MiniCodeEditor
            minHeight={200}
            fileName="prettierrc.json"
            code={JSON.stringify(JSON.parse(workspaceSettings.prettierConfig), null, 2)}
            onSave={async (value) => {
              try {
                setWorkspaceSettings("prettierConfig", JSON.stringify(JSON.parse(value)));
                await client.workspaceSettings.update.mutate({
                  prettierConfig: workspaceSettings.prettierConfig
                });
                notify({
                  text: "Prettier configuration saved",
                  type: "success"
                });
              } catch (error) {
                notify({
                  text: "Couldn't save Prettier configuration",
                  type: "error"
                });
              }
            }}
          />
        </Show>
      </TitledCard>
    </>
  );
};

export { EditorSection };
