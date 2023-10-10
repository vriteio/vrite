import { webhookEvents } from "./events";
import { mdiCheck, mdiTune } from "@mdi/js";
import { Component, Show, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { InputField, TitledCard } from "#components/fragments";
import { IconButton, Button, Loader, Tooltip } from "#components/primitives";
import { App, useClient, useNotifications } from "#context";
import { validateURL } from "#lib/utils";

interface ConfigureWebhookSubsectionProps {
  editedWebhookId?: string;
  onWebhookConfigured?(): void;
  setActionComponent(component: Component<{}> | null): void;
}

const ConfigureWebhookSubsection: Component<ConfigureWebhookSubsectionProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [webhookData, setWebhookData] = createStore<Omit<App.Webhook, "id">>({
    description: "",
    event: "" as App.WebhookEventName,
    name: "",
    url: ""
  });
  const [editedWebhookData] = createResource(() => {
    if (!props.editedWebhookId) return null;

    return client.webhooks.get.query({ id: props.editedWebhookId });
  });
  const filled = createMemo(() => {
    return Boolean(
      webhookData.event &&
        (!webhookData.event.startsWith("contentPiece") || webhookData.metadata) &&
        webhookData.name &&
        validateURL(webhookData.url || "") &&
        webhookData.url.startsWith("https://")
    );
  });
  const onClick = async (): Promise<void> => {
    setLoading(true);

    try {
      if (props.editedWebhookId) {
        await client.webhooks.update.mutate({
          id: props.editedWebhookId,
          ...webhookData
        });
      } else {
        await client.webhooks.create.mutate(webhookData);
      }

      setLoading(false);
      notify({
        type: "success",
        text: props.editedWebhookId ? "Webhook updated" : "New Webhook created"
      });
      props.onWebhookConfigured?.();
    } catch (e) {
      let text = "Failed to create new Webhook";

      if (props.editedWebhookId) text = "Failed to update the Webhook";

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
          disabled={!filled() || Boolean(editedWebhookData.loading && props.editedWebhookId)}
          onClick={onClick}
        >
          {props.editedWebhookId ? "Update Webhook" : "Create Webhook"}
        </Button>
        <Tooltip
          text={props.editedWebhookId ? "Update Webhook" : "Create Webhook"}
          wrapperClass="flex @md:hidden"
          class="mt-1"
          fixed
        >
          <IconButton
            color="primary"
            path={mdiCheck}
            class="m-0"
            loading={loading()}
            disabled={!filled() || Boolean(editedWebhookData.loading && props.editedWebhookId)}
            onClick={onClick}
          />
        </Tooltip>
      </>
    );
  });
  createEffect(() => {
    if (editedWebhookData()) {
      setWebhookData((webhookData) => editedWebhookData() || webhookData);
    }
  });

  return (
    <TitledCard icon={mdiTune} label="Configure">
      <Show when={!editedWebhookData.loading || !props.editedWebhookId} fallback={<Loader />}>
        <InputField
          label="Name"
          color="contrast"
          placeholder="Webhook name"
          type="text"
          value={webhookData.name || ""}
          inputProps={{ maxLength: 50 }}
          setValue={(value) => setWebhookData("name", value)}
        >
          Name of the Webhook
        </InputField>
        <InputField
          label="Description"
          color="contrast"
          textarea
          optional
          placeholder="Webhook description"
          type="text"
          value={webhookData.description || ""}
          setValue={(value) => setWebhookData("description", value)}
        >
          Additional details about the Webhook
        </InputField>
        <InputField
          label="Target URL"
          color="contrast"
          placeholder="URL"
          type="text"
          value={webhookData.url || ""}
          setValue={(value) => setWebhookData("url", value)}
        >
          Webhook URL must start with <code>https://</code>
        </InputField>
        <InputField
          placeholder="Event"
          label="Trigger Event"
          color="contrast"
          type="select"
          options={webhookEvents}
          value={webhookData.event || ""}
          setValue={(value) => {
            setWebhookData("event", value as App.WebhookEventName);
          }}
        >
          Event for which the Webhook should be called
        </InputField>
        <Show when={webhookData.event.startsWith("contentPiece")}>
          <InputField
            placeholder="Content Group ID"
            color="contrast"
            label="Content Group"
            type="text"
            value={webhookData.metadata?.contentGroupId || ""}
            setValue={(value) => setWebhookData("metadata", { contentGroupId: value })}
          >
            ID of the content group to listen for the event on
          </InputField>
        </Show>
      </Show>
    </TitledCard>
  );
};

export { ConfigureWebhookSubsection };
