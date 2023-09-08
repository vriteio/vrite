import { mdiCheck, mdiInformation } from "@mdi/js";
import { Component, createEffect, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { InputField, TitledCard } from "#components/fragments";
import { Button, IconButton, Tooltip } from "#components/primitives";
import { useClient, App, useNotifications } from "#context";
import { validateKey } from "#lib/utils";

interface ConfigureWrapperSubSectionProps {
  setActionComponent(component: Component<{}> | null): void;
  onWrapperConfigured(): void;
}

const ConfigureWrapperSubSection: Component<ConfigureWrapperSubSectionProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [wrapperData, setWrapperData] = createStore<App.Wrapper>({
    key: "",
    label: ""
  });
  const filled = createMemo(() => {
    return Boolean(wrapperData.label && validateKey(wrapperData.key));
  });
  const onClick = async (): Promise<void> => {
    try {
      setLoading(true);
      await client.workspaceSettings.createWrapper.mutate(wrapperData);
      notify({ text: "New Wrapper created", type: "success" });
      props.onWrapperConfigured();
      setLoading(false);
    } catch (error) {
      notify({ text: "Failed to create new Wrapper", type: "error" });
      setLoading(false);
    }
  };

  createEffect(() => {
    setWrapperData("key", wrapperData.label.toLowerCase().replace(/\s|-/g, "_").slice(0, 20));
  });
  props.setActionComponent(() => {
    return (
      <>
        <Button
          color="primary"
          class="m-0 hidden @md:flex"
          loading={loading()}
          disabled={!filled()}
          onClick={onClick}
        >
          Create Wrapper
        </Button>
        <Tooltip text="Create Wrapper" wrapperClass="flex @md:hidden" class="mt-1" fixed>
          <IconButton
            color="primary"
            path={mdiCheck}
            class="m-0"
            loading={loading()}
            disabled={!filled()}
            onClick={onClick}
          />
        </Tooltip>
      </>
    );
  });

  return (
    <>
      <TitledCard icon={mdiInformation} label="Details">
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
      </TitledCard>
    </>
  );
};

export { ConfigureWrapperSubSection };
