import { mdiInformation, mdiKeyChain } from "@mdi/js";
import { Component, For, Show, createEffect, createResource, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { InputField, TitledCard } from "#components/fragments";
import { Select, Heading, Loader, Button } from "#components/primitives";
import { useClient, App } from "#context";

interface ConfigureWrapperSubSectionProps {
  editedWrapper: App.Wrapper | null;
  setActionComponent(component: Component<{}> | null): void;
  onWrapperConfigured(): void;
}

const ConfigureWrapperSubSection: Component<ConfigureWrapperSubSectionProps> = (props) => {
  const client = useClient();
  const [wrapperId, setWrapperId] = createSignal<string | null>(null);
  const [wrapperData, setWrapperData] = createStore<Omit<App.Wrapper, "id">>({
    key: "",
    label: ""
  });

  createEffect(() => {
    if (props.editedWrapper) {
      setWrapperId(props.editedWrapper.id);
      setWrapperData({
        key: props.editedWrapper.key,
        label: props.editedWrapper.label
      });
    }
  });
  createEffect(() => {
    setWrapperData("key", wrapperData.label.toLowerCase().replace(/\s|-/g, "_"));
  });
  props.setActionComponent(() => {
    return (
      <Button color="primary" class="m-0">
        Create wrapper
      </Button>
    );
  });

  return (
    <>
      <TitledCard icon={mdiInformation} label="Details">
        <Show when={!wrapperId()} fallback={<Loader />}>
          <InputField
            label="Wrapper label"
            color="contrast"
            placeholder="Label"
            type="text"
            value={wrapperData.label}
            inputProps={{ maxLength: 50 }}
            setValue={(value) => setWrapperData("label", value)}
          >
            Descriptive label for the wrapper.
          </InputField>
          <InputField
            label="Wrapper key"
            color="contrast"
            placeholder="wrapper_key"
            type="text"
            value={wrapperData.key}
            inputProps={{ maxLength: 20 }}
            setValue={(value) => setWrapperData("key", value)}
          >
            Key identifying wrapper in JSON content. Has to be unique, and can only contain letters,
            numbers and underscores.
          </InputField>
        </Show>
      </TitledCard>
    </>
  );
};

export { ConfigureWrapperSubSection };
