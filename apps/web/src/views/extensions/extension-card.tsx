import { ExtensionDetails, useClientContext } from "#context";
import { mdiTune, mdiDownloadOutline } from "@mdi/js";
import { Card, Heading, IconButton } from "#components/primitives";
import { ExtensionSpec, ContextObject } from "@vrite/extensions";
import { Component } from "solid-js";
import { ExtensionIcon } from "./extension-icon";

interface ExtensionCardProps {
  extension: ExtensionDetails;
  installed?: boolean;
  setOpenedExtension(extension: {
    spec: ExtensionSpec;
    configuration?: ContextObject;
    id?: string;
  }): void;
}

const ExtensionCard: Component<ExtensionCardProps> = (props) => {
  const { client } = useClientContext();

  return (
    <Card class="m-0 gap-1 flex flex-col justify-center items-center" color="contrast">
      <div class="flex items-start justify-start w-full">
        <ExtensionIcon spec={props.extension.spec} />
        <Heading level={2} class="min-h-8 justify-center items-center flex">
          {props.extension.spec.displayName}
        </Heading>
        <div class="flex-1" />
        <IconButton
          path={props.installed ? mdiTune : mdiDownloadOutline}
          color={props.installed ? "base" : "primary"}
          text={props.installed ? "soft" : "primary"}
          label={props.installed ? "Configure" : "Install"}
          onClick={async () => {
            if (props.extension.id) {
              props.setOpenedExtension(props.extension);
            } else {
              const id = await client.extensions.install.mutate({
                extension: {
                  name: props.extension.spec.name,
                  displayName: props.extension.spec.displayName,
                  permissions: props.extension.spec.permissions || []
                }
              });

              props.setOpenedExtension({ ...props.extension, configuration: {}, id });
            }
          }}
          class="m-0 my-1"
          size="small"
        />
      </div>
      <p class="text-gray-500 dark:text-gray-400">{props.extension.spec.description}</p>
    </Card>
  );
};

export { ExtensionCard };
