import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Show
} from "solid-js";
import {
  mdiChevronLeft,
  mdiDownload,
  mdiDownloadOutline,
  mdiPuzzle,
  mdiTrashCan,
  mdiTune
} from "@mdi/js";
import { createStore } from "solid-js/store";
import {
  ContextObject,
  ContextValue,
  ExtensionConfigurationViewContext,
  ExtensionSpec
} from "@vrite/extensions";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { ViewContextProvider } from "#lib/extensions/view-context";
import { ViewRenderer } from "#lib/extensions/view-renderer";
import { useClientContext, useConfirmationContext, useExtensionsContext } from "#context";
import { Button, Card, Heading, IconButton, Tooltip } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";
import { SettingsCard } from "#views/settings/settings-card";

interface ExtensionCardProps {
  spec: ExtensionSpec;
  installed?: boolean;
  openModal(): void;
}
interface ExtensionModalProps {
  extension: ExtensionSpec;
  close(): void;
  setActionComponent(component: Component<{}> | null): void;
}
interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

const ExtensionCard: Component<ExtensionCardProps> = (props) => {
  return (
    <Card class="m-0 gap-1 flex flex-col justify-center items-center" color="contrast">
      <div class="flex items-start justify-start w-full">
        <Show when={props.spec.icon}>
          <img
            src={props.spec.icon}
            class={clsx("w-8 h-8 mr-2 rounded-lg", props.spec.darkIcon && "dark:hidden")}
          />
        </Show>
        <Show when={props.spec.darkIcon}>
          <img
            src={props.spec.darkIcon}
            class={clsx("w-8 h-8 mr-2 rounded-lg", props.spec.icon && "hidden dark:block")}
          />
        </Show>
        <Heading level={2} class="min-h-8 justify-center items-center flex">
          {props.spec.name}
        </Heading>
        <div class="flex-1" />
        <IconButton
          path={props.installed ? mdiTune : mdiDownloadOutline}
          color={props.installed ? "base" : "primary"}
          text={props.installed ? "soft" : "primary"}
          label={props.installed ? "Configure" : "Install"}
          onClick={props.openModal}
          class="m-0 my-1"
          size="small"
        />
      </div>
      <p class="text-gray-500 dark:text-gray-400">{props.spec.description}</p>
    </Card>
  );
};
const ExtensionConfigurationView: Component<ExtensionModalProps> = (props) => {
  const { confirmDelete } = useConfirmationContext();
  const { client } = useClientContext();
  const [extension] = createResource(async () => {
    try {
      return await client.extensions.get.query({ extensionId: props.extension.id });
    } catch (e) {
      return null;
    }
  });
  const [extensionInstallation, setExtensionInstallation] = createStore<{
    configuration: Record<string, any>;
    extensionId: string;
  }>({
    extensionId: props.extension?.id || "",
    configuration: extension()?.configuration || {}
  });

  createEffect(() => {
    setExtensionInstallation({
      extensionId: props.extension?.id || "",
      configuration: extension()?.configuration || {}
    });
  });
  props.setActionComponent(() => {
    return (
      <div class="flex justify-center items-center gap-2">
        <Show when={extension()?.configuration}>
          <Tooltip text="Delete" class="mt-1">
            <IconButton
              class="m-0"
              path={mdiTrashCan}
              text="soft"
              onClick={async () => {
                confirmDelete({
                  header: "Remove extension",
                  content: "Are you sure you want to remove this extension?",
                  async onConfirm() {
                    await client.extensions.uninstall.mutate({
                      id: extension()!.id
                    });
                    props.close();
                  }
                });
              }}
            />
          </Tooltip>
        </Show>
        <Button
          color="primary"
          class="m-0"
          onClick={async () => {
            if (extension()?.configuration) {
              await client.extensions.configure.mutate({
                id: props.extension!.id,
                configuration: extensionInstallation.configuration
              });
            } else {
              await client.extensions.install.mutate(extensionInstallation);
            }

            props.close();
          }}
        >
          {extension()?.configuration ? "Update" : "Install"}
        </Button>
      </div>
    );
  });

  return (
    <SettingsCard label="Configure" icon={mdiTune}>
      <Show when={props.extension}>
        <ViewContextProvider<ExtensionConfigurationViewContext>
          spec={props.extension!}
          config={extensionInstallation.configuration}
          setConfig={(keyOrObject: string | ContextObject, value?: ContextValue) => {
            if (typeof keyOrObject === "string" && typeof value !== "undefined") {
              setExtensionInstallation("configuration", keyOrObject, value);
            } else if (typeof keyOrObject === "object") {
              setExtensionInstallation("configuration", keyOrObject);
            }
          }}
        >
          <ViewRenderer extension={props.extension!} view="configurationView" />
        </ViewContextProvider>
      </Show>
    </SettingsCard>
  );
};
const ExtensionsMenu: Component<{ setOpenedExtensionId(id: string): void }> = (props) => {
  const { availableExtensions, installedExtensions } = useExtensionsContext();

  return (
    <>
      <SettingsCard icon={mdiPuzzle} label="Installed">
        <Show
          when={installedExtensions().length > 0}
          fallback={<span class="px-2 w-full text-start">No extensions installed</span>}
        >
          <div class="grid w-full grid-cols-1 gap-2 @xl:grid-cols-2">
            <For each={installedExtensions()}>
              {(extension) => {
                return (
                  <ExtensionCard
                    openModal={() => {
                      props.setOpenedExtensionId(extension.id);
                    }}
                    spec={extension}
                    installed
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </SettingsCard>
      <SettingsCard icon={mdiDownload} label="Available">
        <Show
          when={availableExtensions().length > 0}
          fallback={<span class="px-2 w-full text-start">No other extensions available</span>}
        >
          <div class="grid w-full grid-cols-1 gap-2 @xl:grid-cols-2">
            <For each={availableExtensions()}>
              {(extension) => {
                return (
                  <ExtensionCard
                    openModal={() => {
                      props.setOpenedExtensionId(extension.id);
                    }}
                    spec={extension}
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </SettingsCard>
    </>
  );
};
const ExtensionsView: Component = () => {
  const { client } = useClientContext();
  const { availableExtensions, installedExtensions } = useExtensionsContext();
  const [openedExtensionId, setOpenedExtensionId] = createSignal("");
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [subSection, setSubSection] = createSignal<SubSection | null>(null);
  const [actionComponent, setActionComponent] = createSignal<Component<{}> | null>(null);
  const extension = createMemo(() => {
    const availableExtension = availableExtensions().find((extension) => {
      return extension.id === openedExtensionId();
    });
    const installedExtension = installedExtensions().find((extension) => {
      return extension.id === openedExtensionId();
    });

    return availableExtension || installedExtension;
  });
  const currentSection = createMemo(() => {
    if (!openedExtensionId()) return { label: "Extensions", id: "menu" };

    return {
      label: extension()?.name,
      id: extension()?.id,
      icon: extension()?.icon,
      darkIcon: extension()?.darkIcon
    };
  });

  return (
    <div class="@container pb-0 flex flex-col h-full overflow-auto scrollbar-sm-contrast">
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col",
          openedExtensionId() ? "pt-2" : "pt-5"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", !openedExtensionId() && "hidden")}
          onClick={() => {
            if (subSection()) {
              subSection()?.goBack();
              setSubSection(null);
            } else {
              setActionComponent(null);
              setOpenedExtensionId("");
            }
          }}
          label={subSection() ? currentSection().label : "Extensions"}
          size="small"
          path={mdiChevronLeft}
        ></IconButton>

        <Show
          when={openedExtensionId()}
          fallback={<Heading level={1}>{currentSection().label}</Heading>}
        >
          <div class="flex justify-center items-center w-full">
            <div class="flex h-8 w-8 mr-1">
              <Show when={currentSection().icon}>
                <img
                  src={currentSection().icon}
                  class={clsx(
                    "w-8 h-8 mr-2 rounded-lg",
                    currentSection().darkIcon && "dark:hidden"
                  )}
                />
              </Show>
              <Show when={currentSection().darkIcon}>
                <img
                  src={currentSection().darkIcon}
                  class={clsx(
                    "w-8 h-8 mr-2 rounded-lg",
                    currentSection().icon && "hidden dark:block"
                  )}
                />
              </Show>
            </div>
            <Heading level={2} class="flex-1">
              {subSection() ? subSection()?.label : currentSection().label}
            </Heading>
            <Show when={actionComponent()}>
              <Dynamic component={actionComponent()!} />
            </Show>
          </div>
        </Show>
      </div>
      <div class="flex-col h-full relative flex overflow-hidden">
        <ScrollShadow scrollableContainerRef={scrollableContainerRef} color="contrast" />
        <div
          class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5 pb-5"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-start flex-col min-h-full items-start w-full gap-5">
            <Show
              when={openedExtensionId()}
              fallback={<ExtensionsMenu setOpenedExtensionId={setOpenedExtensionId} />}
            >
              <ExtensionConfigurationView
                close={() => setOpenedExtensionId("")}
                extension={extension()!}
                setActionComponent={(component) => setActionComponent(() => component)}
              />
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ExtensionsView };
