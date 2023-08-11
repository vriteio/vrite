import { SettingsSectionComponent } from "./view";
import {
  mdiAccountMultipleOutline,
  mdiCalendarOutline,
  mdiDatabaseSettings,
  mdiFileOutline,
  mdiLink,
  mdiLinkVariant,
  mdiTagOutline
} from "@mdi/js";
import { For, createEffect, createSignal } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { IconButton, Input } from "#components/primitives";
import { TitledCard } from "#components/fragments";
import { App, hasPermission, useAuthenticatedUserData, useClient } from "#context";

const metadataFields: Array<{ icon: string; label: string; value: App.MetadataField }> = [
  {
    icon: mdiFileOutline,
    label: "Filename",
    value: "filename"
  },
  {
    icon: mdiLink,
    label: "Slug",
    value: "slug"
  },
  {
    icon: mdiLinkVariant,
    label: "Canonical link",
    value: "canonical-link"
  },
  {
    icon: mdiCalendarOutline,
    label: "Date",
    value: "date"
  },
  {
    icon: mdiTagOutline,
    label: "Tags",
    value: "tags"
  },
  {
    icon: mdiAccountMultipleOutline,
    label: "Members",
    value: "members"
  }
];
const MetadataSection: SettingsSectionComponent = () => {
  const client = useClient();
  const { workspaceSettings } = useAuthenticatedUserData();
  const [canonicalLinkPattern, setCanonicalLinkPattern] = createSignal<string>("");
  const [enabledFields, setEnabledFields] = createSignal<App.MetadataField[]>([]);
  const updateMetadataSettings = debounce(() => {
    client.workspaceSettings.update.mutate({
      metadata: {
        enabledFields: enabledFields(),
        canonicalLinkPattern: workspaceSettings()?.metadata?.canonicalLinkPattern
      }
    });
  }, 350);

  createEffect(() => {
    setCanonicalLinkPattern(workspaceSettings()?.metadata?.canonicalLinkPattern || "");
    setEnabledFields(
      workspaceSettings()?.metadata?.enabledFields || [
        "slug",
        "canonical-link",
        "date",
        "tags",
        "members"
      ]
    );
  });

  return (
    <>
      <TitledCard label="Enabled fields" icon={mdiDatabaseSettings}>
        <p class="prose text-gray-500 dark:text-gray-400">
          Select the metadata fields that should be enabled in the content piece view for all users
          of the workspace
        </p>
        <div class="flex flex-wrap gap-2 w-full">
          <For each={metadataFields}>
            {({ icon, label, value }) => {
              const active = (): boolean => {
                return enabledFields().includes(value);
              };

              return (
                <IconButton
                  color={active() ? "primary" : "contrast"}
                  text={active() ? "primary" : "soft"}
                  badge={!hasPermission("manageWorkspace")}
                  disabled={!hasPermission("manageWorkspace")}
                  hover={hasPermission("manageWorkspace")}
                  onClick={() => {
                    updateMetadataSettings.clear();

                    if (active()) {
                      setEnabledFields(
                        enabledFields().filter((enabledField) => enabledField !== value)
                      );
                    } else {
                      setEnabledFields([...enabledFields(), value]);
                    }

                    updateMetadataSettings();
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
      <TitledCard label="Canonical pattern" icon={mdiLinkVariant}>
        <div class="prose text-gray-500 dark:text-gray-400 w-full">
          Set the pattern to use for auto-generating <b>canonical links</b>. You can use the
          following variables:
          <ul class="list-none pl-0 my-1">
            <li>
              <code class="!px-1 !dark:bg-gray-800">{`{{slug}}`}</code> the content piece's slug;
            </li>
            <li>
              <code class="!px-1 !dark:bg-gray-800">{`{{variant}}`}</code> the selected Variant
              name;
            </li>
          </ul>
        </div>
        <Input
          class="w-full m-0"
          wrapperClass="w-full"
          value={canonicalLinkPattern()}
          color="contrast"
          placeholder="https://example.com/{{variant}}/{{slug}}"
          setValue={() => {}}
          onChange={(event) => {
            const { value } = event.target;

            updateMetadataSettings.clear();
            setCanonicalLinkPattern(value);
            updateMetadataSettings();
          }}
        />
      </TitledCard>
    </>
  );
};

export { MetadataSection };
