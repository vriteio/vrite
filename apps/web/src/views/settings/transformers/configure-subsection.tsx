import { mdiCheck, mdiTune } from "@mdi/js";
import { Component, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { CollapsibleSection, InputField } from "#components/fragments";
import { IconButton, Button, Tooltip } from "#components/primitives";
import { App, useClient, useNotifications } from "#context";
import { validateURL } from "#lib/utils";

interface ConfigureTransformerSubsectionProps {
  onTransformerConfigured?(): void;
  setActionComponent(component: Component<{}> | null): void;
}

const ConfigureTransformerSubsection: Component<ConfigureTransformerSubsectionProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [transformerData, setTransformerData] = createStore<Omit<App.Transformer, "id">>({
    label: "",
    input: "",
    output: "",
    maxBatchSize: 100
  });
  const filled = createMemo(() => {
    return Boolean(
      transformerData.label &&
        validateURL(transformerData.input) &&
        validateURL(transformerData.output)
    );
  });
  const onClick = async (): Promise<void> => {
    setLoading(true);

    try {
      await client.transformers.create.mutate(transformerData);
      setLoading(false);
      notify({
        type: "success",
        text: "New Transformer created"
      });
      props.onTransformerConfigured?.();
    } catch (e) {
      setLoading(false);
      notify({
        type: "error",
        text: "Failed to create new Transformer"
      });
    }
  };

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
          Create Transformer
        </Button>
        <Tooltip text="Create Transformer" wrapperClass="flex @md:hidden" class="mt-1" fixed>
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
    <CollapsibleSection icon={mdiTune} label="Configure">
      <InputField
        label="Label"
        placeholder="Transformer label"
        type="text"
        value={transformerData.label || ""}
        inputProps={{ maxLength: 50 }}
        setValue={(value) => setTransformerData("label", value)}
      >
        Identifiable label for the Transformer
      </InputField>
      <InputField
        label="Input Transformer URL"
        placeholder="https://example.com/input"
        type="text"
        value={transformerData.input || ""}
        setValue={(value) => setTransformerData("input", value)}
      >
        URL for remote input transformer, converting custom format to Vrite-acceptable HTML.
      </InputField>
      <InputField
        label="Output Transformer URL"
        placeholder="https://example.com/output"
        type="text"
        value={transformerData.output || ""}
        setValue={(value) => setTransformerData("output", value)}
      >
        URL for remote output transformer, converting Vrite's JSON content to custom format.
      </InputField>
      <InputField
        label="Max Batch Size"
        placeholder="1000"
        type="text"
        value={`${transformerData.maxBatchSize || ""}`}
        setValue={(value) => {
          if (value) {
            setTransformerData("maxBatchSize", Math.min(Math.max(Number(value), 1), 1000));
          } else {
            setTransformerData("maxBatchSize", 100);
          }
        }}
        inputProps={{ type: "number" }}
      >
        Max number of entries to send to the transformer in a single request (
        <code class="!px-1 !dark:bg-gray-800">1...1000</code>)
      </InputField>
    </CollapsibleSection>
  );
};

export { ConfigureTransformerSubsection };
