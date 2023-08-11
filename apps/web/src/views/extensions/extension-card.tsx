import { ExtensionIcon } from "./extension-icon";
import { mdiTune, mdiDownloadOutline } from "@mdi/js";
import { Component, Show } from "solid-js";
import { ExtensionDetails, hasPermission, useClient } from "#context";
import { Card, Heading, IconButton } from "#components/primitives";

interface ExtensionCardProps {
  extension: ExtensionDetails;
  installed?: boolean;
  setOpenedExtension(extension: ExtensionDetails): void;
}

const ExtensionCard: Component<ExtensionCardProps> = (props) => {
  const client = useClient();

  return (
    <Card class="m-0 gap-1 flex flex-col justify-center items-center" color="contrast">
      <div class="flex items-start justify-start w-full">
        <ExtensionIcon spec={props.extension.spec} />
        <Heading level={2} class="min-h-8 justify-center items-center flex">
          {props.extension.spec.displayName}
        </Heading>
        <div class="flex-1" />
        <Show when={hasPermission("manageExtensions")}>
          <IconButton
            path={props.installed ? mdiTune : mdiDownloadOutline}
            color={props.installed ? "base" : "primary"}
            text={props.installed ? "soft" : "primary"}
            label={props.installed ? "Configure" : "Install"}
            onClick={async () => {
              if (props.extension.id) {
                props.setOpenedExtension({
                  ...props.extension,
                  config: { ...props.extension.config }
                });
              } else {
                const { id, token } = await client.extensions.install.mutate({
                  extension: {
                    name: props.extension.spec.name,
                    displayName: props.extension.spec.displayName,
                    permissions: props.extension.spec.permissions || []
                  }
                });

                props.setOpenedExtension({ ...props.extension, config: {}, id, token });
              }
            }}
            class="m-0 my-1"
            size="small"
          />
        </Show>
      </div>
      <p class="text-gray-500 dark:text-gray-400">{props.extension.spec.description}</p>
    </Card>
  );
};

export { ExtensionCard };
