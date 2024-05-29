import { webhookEvents } from "./events";
import {
  mdiCheck,
  mdiInformationOutline,
  mdiRefresh,
  mdiShieldLockOutline,
  mdiTune
} from "@mdi/js";
import { Component, Show, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { nanoid } from "nanoid";
import { CollapsibleSection, InputField } from "#components/fragments";
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
  const [loadingSecret, setLoadingSecret] = createSignal(false);
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
  const secretHidden = (): boolean => {
    return Boolean(props.editedWebhookId && typeof webhookData.secret === "undefined");
  };
  const revealSecret = async (): Promise<void> => {
    if (!props.editedWebhookId) return;

    setLoadingSecret(true);

    try {
      const { secret } = await client.webhooks.revealSecret.query({ id: props.editedWebhookId! });

      setWebhookData("secret", secret);
      setLoadingSecret(false);
    } catch (error) {
      notify({
        type: "error",
        text: "Failed to reveal secret"
      });
    }
  };
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
    <>
      <CollapsibleSection icon={mdiInformationOutline} label="Details">
        <Show
          when={!editedWebhookData.loading || !props.editedWebhookId}
          fallback={
            <div class="flex justify-center items-center w-full">
              <Loader />
            </div>
          }
        >
          <InputField
            label="Name"
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
            textarea
            optional
            placeholder="Webhook description"
            type="text"
            value={webhookData.description || ""}
            setValue={(value) => setWebhookData("description", value)}
          >
            Additional details about the Webhook
          </InputField>
        </Show>
      </CollapsibleSection>
      <CollapsibleSection icon={mdiTune} label="Configuration">
        <InputField
          label="Target URL"
          placeholder="URL"
          type="text"
          value={webhookData.url || ""}
          setValue={(value) => setWebhookData("url", value)}
        >
          Webhook URL must start with <code class="!px-1 !py-0.5 !rounded-md">https://</code>
        </InputField>
        <InputField
          placeholder="Event"
          label="Trigger Event"
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
            label="Content Group"
            type="text"
            value={webhookData.metadata?.contentGroupId || ""}
            setValue={(value) => setWebhookData("metadata", { contentGroupId: value })}
          >
            ID of the content group to listen for the event on
          </InputField>
        </Show>
      </CollapsibleSection>
      <CollapsibleSection
        icon={mdiShieldLockOutline}
        label="Security"
        action={
          <Show when={secretHidden()}>
            <Button class="m-0" text="soft" loading={loadingSecret()} onClick={revealSecret}>
              Reveal secret
            </Button>
          </Show>
        }
      >
        <p class="prose text-gray-500 dark:text-gray-400">
          Provide a secret to sign the payload of your webhook
        </p>
        <InputField
          placeholder="Secret"
          label="Signing secret"
          optional
          type="text"
          value={props.editedWebhookId ? webhookData.secret || "secret" : webhookData.secret || ""}
          disabled={Boolean(props.editedWebhookId)}
          inputProps={{
            type: secretHidden() ? "password" : "text"
          }}
          class="flex items-center gap-1"
          setValue={(value) => {
            setWebhookData("secret", value || undefined);
          }}
          adornment={() => {
            return (
              <Show when={!props.editedWebhookId}>
                <Tooltip text="Generate secret" class="mt-1">
                  <IconButton
                    path={mdiRefresh}
                    class="m-0"
                    text="soft"
                    onClick={() => {
                      setWebhookData("secret", nanoid());
                    }}
                  />
                </Tooltip>
              </Show>
            );
          }}
        />
      </CollapsibleSection>
    </>
  );
};

export { ConfigureWebhookSubsection };
