import {
  ExtensionDetails,
  useConfirmationContext,
  useClientContext,
  useExtensionsContext
} from "#context";
import { ViewContextProvider, ViewRenderer } from "#lib/extensions";
import { TitledCard } from "#components/fragments";
import { mdiInformation, mdiInformationOutline, mdiTrashCan, mdiTune } from "@mdi/js";
import { Tooltip, IconButton, Button } from "#components/primitives";
import {
  ExtensionSpec,
  ExtensionConfigurationViewContext,
  ContextObject,
  ContextValue
} from "@vrite/extensions";
import { Component, createEffect, createSignal, Show } from "solid-js";
import { createStore } from "solid-js/store";

interface ExtensionModalProps {
  extension: ExtensionDetails;
  close(): void;
  setActionComponent(component: Component<{}> | null): void;
}

const ExtensionConfigurationView: Component<ExtensionModalProps> = (props) => {
  const { confirmDelete } = useConfirmationContext();
  const { client } = useClientContext();
  const { callFunction } = useExtensionsContext();
  const [loading, setLoading] = createSignal(false);
  const [extensionInstallation, setExtensionInstallation] = createStore<{
    configuration: Record<string, any>;
    extension: Pick<ExtensionSpec, "name" | "displayName" | "permissions">;
  }>({
    extension: {
      name: props.extension.spec.name,
      displayName: props.extension.spec.displayName,
      permissions: props.extension.spec.permissions || []
    },
    configuration: props.extension.configuration || {}
  });

  createEffect(() => {
    setExtensionInstallation({
      extension: {
        name: props.extension.spec.name,
        displayName: props.extension.spec.displayName,
        permissions: props.extension.spec.permissions || []
      },
      configuration: props.extension.configuration || {}
    });
  });
  props.setActionComponent(() => {
    return (
      <div class="flex justify-center items-center gap-2">
        <Show when={props.extension.id}>
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
                    const onUninstallCallback = props.extension.spec.lifecycle?.["on:uninstall"];

                    if (onUninstallCallback) {
                      await callFunction(props.extension.spec, onUninstallCallback, {
                        extensionId: props.extension.id || "",
                        token: props.extension.token || "",
                        context: {
                          config: extensionInstallation.configuration,
                          spec: props.extension.spec
                        }
                      });
                    }
                    await client.extensions.uninstall.mutate({
                      id: props.extension.id || ""
                    });
                    props.close();
                  }
                });
              }}
            />
          </Tooltip>
        </Show>
        <Show when={props.extension.spec.configurationView}>
          <Button
            color="primary"
            class="m-0"
            loading={loading()}
            onClick={async () => {
              if (props.extension.id) {
                setLoading(true);
                await client.extensions.configure.mutate({
                  id: props.extension.id,
                  configuration: extensionInstallation.configuration
                });
                const onConfigureCallback = props.extension.spec.lifecycle?.["on:configure"];

                if (onConfigureCallback) {
                  await callFunction(props.extension.spec, onConfigureCallback, {
                    extensionId: props.extension.id || "",
                    token: props.extension.token || "",
                    context: {
                      config: extensionInstallation.configuration,
                      spec: props.extension.spec
                    }
                  });
                }
                setLoading(false);
              }

              props.close();
            }}
          >
            Configure
          </Button>
        </Show>
      </div>
    );
  });

  return (
    <>
      <TitledCard label="Description" icon={mdiInformationOutline}>
        <p class="prose text-gray-500 dark:text-gray-400">{props.extension.spec.description}</p>
      </TitledCard>
      <Show when={props.extension.spec.configurationView}>
        <TitledCard label="Configuration" icon={mdiTune}>
          <ViewContextProvider<ExtensionConfigurationViewContext>
            extension={props.extension}
            config={extensionInstallation.configuration}
            setConfig={(keyOrObject: string | ContextObject, value?: ContextValue) => {
              if (typeof keyOrObject === "string" && typeof value !== "undefined") {
                setExtensionInstallation("configuration", keyOrObject, value);
              } else if (typeof keyOrObject === "object") {
                setExtensionInstallation("configuration", keyOrObject);
              }
            }}
          >
            <ViewRenderer spec={props.extension.spec} view="configurationView" />
          </ViewContextProvider>
        </TitledCard>
      </Show>
    </>
  );
};

export { ExtensionConfigurationView };
