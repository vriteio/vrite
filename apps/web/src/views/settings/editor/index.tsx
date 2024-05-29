import { marks, blocks, embeds } from "./options";
import { SettingsSectionComponent } from "../view";
import { mdiApplicationBrackets, mdiCodeTagsCheck, mdiFormatText, mdiImage } from "@mdi/js";
import { For, Match, Switch, createEffect, createSignal, on } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { Heading, IconButton } from "#components/primitives";
import { CollapsibleSection, MiniCodeEditor } from "#components/fragments";
import {
  App,
  hasPermission,
  useAuthenticatedUserData,
  useClient,
  useNotifications
} from "#context";

const EditorSection: SettingsSectionComponent = (props) => {
  const { notify } = useNotifications();
  const [openedSubsection, setOpenedSubsection] = createSignal<"none">("none");
  const { workspaceSettings } = useAuthenticatedUserData();
  const [enabledMarks, setEnabledMarks] = createSignal<App.WorkspaceSettings["marks"]>([]);
  const [enabledBlocks, setEnabledBlocks] = createSignal<App.WorkspaceSettings["blocks"]>([]);
  const [enabledEmbeds, setEnabledEmbeds] = createSignal<App.WorkspaceSettings["embeds"]>([]);
  const [prettierConfig, setPrettierConfig] =
    createSignal<App.WorkspaceSettings["prettierConfig"]>("");
  const client = useClient();
  const updateMarks = debounce(() => {
    client.workspaceSettings.update.mutate({
      marks: enabledMarks()
    });
  }, 350);
  const updateBlocks = debounce(() => {
    client.workspaceSettings.update.mutate({
      blocks: enabledBlocks()
    });
  }, 350);
  const updateEmbeds = debounce(() => {
    client.workspaceSettings.update.mutate({
      embeds: enabledEmbeds()
    });
  }, 350);

  createEffect(() => {
    setEnabledMarks(workspaceSettings()?.marks || []);
    setEnabledBlocks(workspaceSettings()?.blocks || []);
    setEnabledEmbeds(workspaceSettings()?.embeds || []);
    setPrettierConfig(workspaceSettings()?.prettierConfig || "");
  });
  createEffect(
    on(openedSubsection, (openedSubsection) => {
      if (openedSubsection === "none") {
        setOpenedSubsection("none");
        props.setSubSection(null);
        props.setActionComponent(null);
      }
    })
  );

  return (
    <Switch>
      <Match when={openedSubsection() === "none"}>
        <CollapsibleSection label="Inline formatting" icon={mdiFormatText}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Select the inline formatting options that should be enabled in the editor for all users
            of the workspace
          </p>
          <div class="flex flex-wrap gap-2">
            <For each={marks}>
              {({ icon, label, value }) => {
                const active = (): boolean => {
                  return enabledMarks().includes(value);
                };

                return (
                  <IconButton
                    color={active() ? "primary" : "base"}
                    text={active() ? "primary" : "soft"}
                    badge={!hasPermission("manageWorkspace")}
                    disabled={!hasPermission("manageWorkspace")}
                    hover={hasPermission("manageWorkspace")}
                    onClick={() => {
                      updateMarks.clear();
                      setEnabledMarks((enabledMarks) => {
                        if (active()) {
                          return enabledMarks.filter((block) => block !== value);
                        } else {
                          return [...enabledMarks, value];
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
        </CollapsibleSection>
        <CollapsibleSection label="Block content" icon={mdiImage}>
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
                            return enabledBlocks().includes(value);
                          };

                          return (
                            <IconButton
                              color={active() ? "primary" : "base"}
                              text={active() ? "primary" : "soft"}
                              badge={!hasPermission("manageWorkspace")}
                              disabled={!hasPermission("manageWorkspace")}
                              hover={hasPermission("manageWorkspace")}
                              onClick={() => {
                                updateBlocks.clear();
                                setEnabledBlocks((enabledBlocks) => {
                                  if (active()) {
                                    return enabledBlocks.filter((block) => block !== value);
                                  } else {
                                    return [...enabledBlocks, value];
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
        </CollapsibleSection>
        <CollapsibleSection label="Embeds" icon={mdiApplicationBrackets}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Select which embeds to enabled in the editor for all users of the workspace
          </p>
          <div class="grid grid-cols-2 @md:grid-cols-3 gap-2 w-full">
            <For each={embeds}>
              {({ icon, label, value }) => {
                const active = (): boolean => enabledEmbeds().includes(value);

                return (
                  <IconButton
                    color={active() ? "primary" : "base"}
                    text={active() ? "primary" : "soft"}
                    badge={!hasPermission("manageWorkspace")}
                    disabled={!hasPermission("manageWorkspace")}
                    hover={hasPermission("manageWorkspace")}
                    onClick={() => {
                      updateEmbeds.clear();
                      setEnabledEmbeds((enabledEmbeds) => {
                        if (active()) {
                          return enabledEmbeds.filter((block) => block !== value);
                        } else {
                          return [...enabledEmbeds, value];
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
        </CollapsibleSection>
        <CollapsibleSection label="Prettier config" icon={mdiCodeTagsCheck}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Customize your Prettier config for consistent code formatting for all users of the
            workspace
          </p>
          <MiniCodeEditor
            minHeight={200}
            fileName="prettierrc.json"
            code={JSON.stringify(JSON.parse(workspaceSettings()?.prettierConfig || "{}"), null, 2)}
            onSave={async (value) => {
              try {
                setPrettierConfig(JSON.stringify(JSON.parse(value)));
                await client.workspaceSettings.update.mutate({
                  prettierConfig: prettierConfig()
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
        </CollapsibleSection>
      </Match>
    </Switch>
  );
};

export { EditorSection };
