import { marks, blocks, embeds } from "./options";
import { ConfigureWrapperSubSection } from "./configure-wrapper-subsection";
import { SettingsSectionComponent } from "../view";
import {
  mdiApplicationBrackets,
  mdiCodeTagsCheck,
  mdiCube,
  mdiFormatText,
  mdiImage,
  mdiPlus,
  mdiPuzzle,
  mdiTrashCan,
  mdiTune
} from "@mdi/js";
import { Component, For, Match, Show, Switch, createEffect, createSignal, on } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { Button, Card, Heading, IconButton, Tooltip } from "#components/primitives";
import { MiniCodeEditor, TitledCard } from "#components/fragments";
import {
  App,
  hasPermission,
  useAuthenticatedUserData,
  useClient,
  useNotifications
} from "#context";

const WrapperDetails: Component<{
  wrapper: App.Wrapper;
  onEdit?(): void;
  onDelete?(): void;
}> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const { notify } = useNotifications();
  const client = useClient();

  return (
    <Card class="flex flex-col gap-0 w-full m-0" color="contrast">
      <div class="flex items-start justify-center gap-2 w-full">
        <Heading level={3} class="break-anywhere flex-1">
          {props.wrapper.label || "[No name]"}
        </Heading>
        <Show
          when={!props.wrapper.extension}
          fallback={
            <Tooltip text="Extension" class="mt-1">
              <IconButton path={mdiPuzzle} text="soft" class="m-0" badge />
            </Tooltip>
          }
        >
          <Show when={hasPermission("manageWorkspace")}>
            <Tooltip text="Delete" class="mt-1">
              <IconButton
                path={mdiTrashCan}
                text="soft"
                class="m-0"
                loading={loading()}
                onClick={async () => {
                  try {
                    setLoading(true);
                    await client.workspaceSettings.deleteWrapper.mutate({
                      key: props.wrapper.key
                    });
                    setLoading(false);
                    props.onDelete?.();
                    notify({
                      text: "Wrapper deleted",
                      type: "success"
                    });
                  } catch (error) {
                    setLoading(false);
                    notify({
                      text: "Failed to delete wrapper",
                      type: "error"
                    });
                  }
                }}
              />
            </Tooltip>
          </Show>
        </Show>
      </div>
    </Card>
  );
};
const EditorSection: SettingsSectionComponent = (props) => {
  const { notify } = useNotifications();
  const [openedSubsection, setOpenedSubsection] = createSignal<"none" | "configure-wrapper">(
    "none"
  );
  const { workspaceSettings } = useAuthenticatedUserData();
  const [enabledMarks, setEnabledMarks] = createSignal<App.WorkspaceSettings["marks"]>([]);
  const [enabledBlocks, setEnabledBlocks] = createSignal<App.WorkspaceSettings["blocks"]>([]);
  const [enabledEmbeds, setEnabledEmbeds] = createSignal<App.WorkspaceSettings["embeds"]>([]);
  const [wrappers, setWrappers] = createSignal<App.WorkspaceSettings["wrappers"]>([]);
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
  const handleNewWrapper = (): void => {
    setOpenedSubsection("configure-wrapper");
    props.setSubSection({
      label: "New wrapper",
      icon: mdiCube,
      goBack() {
        setOpenedSubsection("none");
      }
    });
  };

  createEffect(() => {
    setEnabledMarks(workspaceSettings()?.marks || []);
    setEnabledBlocks(workspaceSettings()?.blocks || []);
    setEnabledEmbeds(workspaceSettings()?.embeds || []);
    setPrettierConfig(workspaceSettings()?.prettierConfig || "");
    setWrappers(workspaceSettings()?.wrappers || []);
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
        <TitledCard label="Inline formatting" icon={mdiFormatText}>
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
                    color={active() ? "primary" : "contrast"}
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
        </TitledCard>
        <TitledCard label="Block content" icon={mdiImage}>
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
                              color={active() ? "primary" : "contrast"}
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
        </TitledCard>
        <TitledCard label="Embeds" icon={mdiApplicationBrackets}>
          <p class="prose text-gray-500 dark:text-gray-400">
            Select which embeds to enabled in the editor for all users of the workspace
          </p>
          <div class="grid grid-cols-2 @md:grid-cols-3 gap-2 w-full">
            <For each={embeds}>
              {({ icon, label, value }) => {
                const active = (): boolean => enabledEmbeds().includes(value);

                return (
                  <IconButton
                    color={active() ? "primary" : "contrast"}
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
        </TitledCard>
        <Show when={enabledBlocks().includes("wrapper")}>
          <TitledCard
            label="Wrappers"
            icon={mdiCube}
            action={
              <Show when={hasPermission("manageWorkspace")}>
                <>
                  <Button color="primary" class="m-0 hidden @md:flex" onClick={handleNewWrapper}>
                    New Wrapper
                  </Button>
                  <Tooltip text="New Wrapper" wrapperClass="flex @md:hidden" class="mt-1" fixed>
                    <IconButton
                      path={mdiPlus}
                      class="m-0"
                      color="primary"
                      onClick={handleNewWrapper}
                    />
                  </Tooltip>
                </>
              </Show>
            }
          >
            <div class="flex flex-col gap-2 w-full">
              <For
                each={wrappers()}
                fallback={
                  <p class="px-2 w-full text-start text-gray-500 dark:text-gray-400">
                    No wrappers found
                  </p>
                }
              >
                {(wrapper) => {
                  return <WrapperDetails wrapper={wrapper} />;
                }}
              </For>
            </div>
          </TitledCard>
        </Show>
        <TitledCard label="Prettier config" icon={mdiCodeTagsCheck}>
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
        </TitledCard>
      </Match>
      <Match when={openedSubsection() === "configure-wrapper"}>
        <ConfigureWrapperSubSection
          setActionComponent={props.setActionComponent}
          onWrapperConfigured={() => {
            setOpenedSubsection("none");
          }}
        />
      </Match>
    </Switch>
  );
};

export { EditorSection };
