import { SettingsSectionComponent } from "./view";
import { mdiLinkVariant } from "@mdi/js";
import { Accessor, Show, createSignal, onCleanup } from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { Loader } from "#components/primitives";
import { InputField, TitledCard } from "#components/fragments";
import { App, useClient } from "#context";

const useMetadataSettings = (): {
  loading: Accessor<boolean>;
  metadataSettings: App.MetadataSettings;
  setMetadataSettings: SetStoreFunction<App.MetadataSettings>;
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(true);
  const [metadataSettings, setMetadataSettings] = createStore<App.MetadataSettings>({});

  client.workspaceSettings.get.query().then((workspaceSettings) => {
    setLoading(false);
    setMetadataSettings(workspaceSettings.metadata || {});
  });

  const workspaceSettingsChanges = client.workspaceSettings.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "update") {
        setMetadataSettings(data.metadata || {});
      }
    }
  });

  onCleanup(() => {
    workspaceSettingsChanges.unsubscribe();
  });

  return {
    loading,
    metadataSettings,
    setMetadataSettings
  };
};
const MetadataSection: SettingsSectionComponent = () => {
  const { loading, metadataSettings, setMetadataSettings } = useMetadataSettings();
  const client = useClient();

  return (
    <>
      <TitledCard label="Canonical link" icon={mdiLinkVariant}>
        <Show when={!loading()} fallback={<Loader />}>
          <InputField
            label="Pattern"
            color="contrast"
            type="text"
            optional
            value={metadataSettings.canonicalLinkPattern || ""}
            setValue={() => {}}
            inputProps={{
              onChange(event) {
                const { value } = event.target;

                setMetadataSettings({ canonicalLinkPattern: value });
                client.workspaceSettings.update.mutate({
                  metadata: {
                    canonicalLinkPattern: value
                  }
                });
              }
            }}
          >
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
          </InputField>
        </Show>
      </TitledCard>
    </>
  );
};

export { MetadataSection };
