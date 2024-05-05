import { mdiDownloadOutline, mdiPuzzle } from "@mdi/js";
import { Component, createSignal } from "solid-js";
import { App, useConfirmationModal, useExtensions } from "#context";
import { TitledCard } from "#components/fragments";
import { ExtensionDetails } from "#context/extensions";
import { IconButton, Input } from "#components/primitives";
import { validateURL } from "#lib/utils";

interface ExtensionsURLInstallViewProps {
  setOpenedExtension(extension: ExtensionDetails): void;
}

const ExtensionsURLInstallView: Component<ExtensionsURLInstallViewProps> = (props) => {
  const [extensionURL, setExtensionURL] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const { installExtension } = useExtensions();
  const { confirmAction } = useConfirmationModal();
  const install = async (): Promise<void> => {
    setLoading(true);

    const url = extensionURL();
    const response = await fetch(url);

    if (response.ok) {
      const spec = await response.json();

      try {
        const installedExtension = await installExtension({
          spec,
          url
        });

        setLoading(false);
        props.setOpenedExtension(installedExtension);
      } catch (error) {
        const trpcError = error as App.ClientError;

        if (trpcError.data.code === "CONFLICT") {
          confirmAction({
            header: "Extension already installed",
            content:
              "Extension with the same name is already installed. Do you want to overwrite it?",
            type: "danger",
            onConfirm: async () => {
              const installedExtension = await installExtension(
                {
                  spec,
                  url
                },
                true
              );

              setLoading(false);
              props.setOpenedExtension(installedExtension);
            },
            onCancel: () => {
              setLoading(false);
            }
          });
        }
      }
    }
  };

  return (
    <>
      <TitledCard
        icon={mdiPuzzle}
        label="Extension URL"
        action={
          <IconButton
            class="m-0"
            color="primary"
            path={mdiDownloadOutline}
            disabled={!extensionURL() || !validateURL(extensionURL())}
            loading={loading()}
            label="Install"
            size="small"
            onClick={install}
          />
        }
      >
        <div class="prose text-gray-500 dark:text-gray-400 w-full">
          The URL to the extension's <code class="!px-1 !dark:bg-gray-800">{`spec.json`}</code>{" "}
          file.
        </div>
        <Input
          class="w-full m-0"
          wrapperClass="w-full"
          value={extensionURL()}
          color="contrast"
          placeholder="https://example.com/spec.json"
          setValue={setExtensionURL}
          onEnter={install}
        />
      </TitledCard>
    </>
  );
};

export { ExtensionsURLInstallView };
