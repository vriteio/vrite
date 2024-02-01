import { mdiInformationOutline, mdiTrashCan, mdiTune } from "@mdi/js";
import { ExtensionConfigurationViewContext, ContextObject } from "@vrite/sdk/extensions";
import { Component, createEffect, createSignal, Show } from "solid-js";
import { createStore } from "solid-js/store";
import {
  ExtensionDetails,
  useConfirmationModal,
  useClient,
  useExtensions,
  useNotifications
} from "#context";
import { TitledCard } from "#components/fragments";
import { Tooltip, IconButton, Button } from "#components/primitives";
import { ExtensionViewRenderer } from "#lib/extensions";

interface ExtensionModalProps {
  extension: ExtensionDetails;
  close(): void;
  setActionComponent(component: Component<{}> | null): void;
}

const ExtensionConfigurationView: Component<ExtensionModalProps> = (props) => {
  const { confirmDelete } = useConfirmationModal();
  const { notify } = useNotifications();
  const { getExtensionSandbox } = useExtensions();
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [extensionInstallation, setExtensionInstallation] = createStore<{
    config: Record<string, any>;
    extension: ExtensionDetails;
  }>({
    extension: props.extension,
    config: props.extension.config || {}
  });
  const sandbox = getExtensionSandbox(props.extension.spec.name);

  createEffect(() => {
    setExtensionInstallation({
      extension: props.extension,
      config: props.extension.config || {}
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
                    const onUninstallCallback = sandbox?.runtimeSpec?.onUninstall;

                    if (onUninstallCallback) {
                      await sandbox?.runFunction(
                        onUninstallCallback,
                        {
                          contextFunctions: ["notify"],
                          usableEnv: { readable: [], writable: [] },
                          config: extensionInstallation.config
                        },
                        { notify }
                      );
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
        <Show when={sandbox?.runtimeSpec?.configurationView}>
          <Button
            color="primary"
            class="m-0"
            loading={loading()}
            onClick={async () => {
              if (props.extension.id) {
                setLoading(true);
                await client.extensions.configure.mutate({
                  id: props.extension.id,
                  config: extensionInstallation.config
                });

                const onConfigureCallback = sandbox?.runtimeSpec?.onConfigure;

                if (onConfigureCallback) {
                  await sandbox?.runFunction(
                    onConfigureCallback,
                    {
                      contextFunctions: ["notify"],
                      usableEnv: { readable: [], writable: [] },
                      config: extensionInstallation.config
                    },
                    { notify }
                  );
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
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          {props.extension.spec.description}
        </p>
      </TitledCard>
      <Show when={sandbox?.runtimeSpec?.configurationView}>
        <TitledCard label="Configuration" icon={mdiTune}>
          <ExtensionViewRenderer<ExtensionConfigurationViewContext>
            ctx={{
              contextFunctions: ["notify"],
              usableEnv: { readable: [], writable: ["config"] },
              config: extensionInstallation.config
            }}
            extension={extensionInstallation.extension}
            func={{ notify }}
            view="configurationView"
            usableEnvData={{ config: extensionInstallation.config as ContextObject }}
            onUsableEnvDataUpdate={(envData) => {
              setExtensionInstallation(
                "config",
                (envData as ContextObject).config as ContextObject
              );
            }}
          />
        </TitledCard>
      </Show>
    </>
  );
};

export { ExtensionConfigurationView };
