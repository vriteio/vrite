import { mdiCheck, mdiTune } from "@mdi/js";
import { Component, createEffect, createMemo, createSignal, on } from "solid-js";
import { createStore } from "solid-js/store";
import { InputField, TitledCard } from "#components/fragments";
import { IconButton, Button, Tooltip } from "#components/primitives";
import { App, useClient, useNotifications } from "#context";
import { validateVariantName } from "#lib/utils";

interface ConfigureVariantSubsectionProps {
  editedVariantData: App.Variant | null;
  onVariantConfigured?(): void;
  setActionComponent(component: Component<{}> | null): void;
}

const ConfigureVariantSubsection: Component<ConfigureVariantSubsectionProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [variantData, setVariantData] = createStore<Omit<App.Variant, "id">>({
    description: "",
    label: "",
    name: ""
  });
  const filled = createMemo(() => {
    return Boolean(variantData.label && variantData.name && validateVariantName(variantData.name));
  });
  const onClick = async (): Promise<void> => {
    setLoading(true);

    try {
      if (props.editedVariantData) {
        await client.variants.update.mutate({
          id: props.editedVariantData.id,
          ...variantData
        });
      } else {
        await client.variants.create.mutate(variantData);
      }

      setLoading(false);
      notify({
        type: "success",
        text: props.editedVariantData ? "Variant updated" : "New Variant created"
      });
      props.onVariantConfigured?.();
    } catch (e) {
      let text = "Failed to create new Variant";

      if (props.editedVariantData) text = "Failed to update the Variant";

      setLoading(false);
      notify({
        type: "error",
        text
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
          {props.editedVariantData ? "Update Variant" : "Create Variant"}
        </Button>
        <Tooltip
          text={props.editedVariantData ? "Update Variant" : "Create Variant"}
          wrapperClass="flex @md:hidden"
          class="mt-1"
          fixed
        >
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
  createEffect(
    on(
      () => props.editedVariantData,
      (editedVariantData) => {
        if (editedVariantData) {
          setVariantData((variantData) => editedVariantData || variantData);
        }
      }
    )
  );

  return (
    <TitledCard icon={mdiTune} label="Configure">
      <InputField
        label="Label"
        color="contrast"
        placeholder="Variant label"
        type="text"
        value={variantData.label || ""}
        inputProps={{ maxLength: 50 }}
        setValue={(value) => setVariantData("label", value)}
      >
        Identifiable label for the Variant
      </InputField>
      <InputField
        label="Name"
        color="contrast"
        placeholder="Variant name"
        type="text"
        value={variantData.name || ""}
        inputProps={{ maxLength: 20 }}
        setValue={(value) => setVariantData("name", value)}
      >
        Unique name for the Variant. Can only contain lowercase letters, numbers, and underscores.
      </InputField>
      <InputField
        label="Description"
        color="contrast"
        textarea
        optional
        placeholder="Variant description"
        type="text"
        value={variantData.description || ""}
        setValue={(value) => setVariantData("description", value)}
      >
        Additional details about the Variant
      </InputField>
    </TitledCard>
  );
};

export { ConfigureVariantSubsection };
