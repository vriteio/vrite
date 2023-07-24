import { ConfigureWebhookSubsection } from "./configure-webhook-subsection";
import { webhookEvents } from "./events";
import { SettingsSectionComponent } from "../view";
import {
  Accessor,
  Component,
  For,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup
} from "solid-js";
import { mdiFormatListBulleted, mdiPlusCircle, mdiPuzzle, mdiTrashCan, mdiTune } from "@mdi/js";
import { createStore } from "solid-js/store";
import { TitledCard } from "#components/fragments";
import { App, hasPermission, useClient, useNotifications } from "#context";
import { Button, Card, Heading, IconButton, Loader, Tooltip } from "#components/primitives";

interface WebhookDetailsProps {
  webhook: App.Webhook & { extension?: boolean };
  onEdit?(): void;
  onDelete?(): void;
}

const useContentGroups = (): {
  contentGroups: Accessor<App.ContentGroup[]>;
} => {
  const client = useClient();
  const [state, setState] = createStore<{
    contentGroups: App.ContentGroup[];
  }>({
    contentGroups: []
  });

  client.contentGroups.list.query().then((contentGroups) => {
    setState("contentGroups", contentGroups);
  });

  const contentGroupsChanges = client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState({ contentGroups: [...state.contentGroups, data] });
          break;
        case "update":
          setState(
            "contentGroups",
            state.contentGroups.findIndex((column) => column.id === data.id),
            (contentGroup) => ({ ...contentGroup, ...data })
          );
          break;
        case "delete":
          setState({
            contentGroups: state.contentGroups.filter((column) => column.id !== data.id)
          });
          break;
      }
    }
  });

  onCleanup(() => {
    contentGroupsChanges.unsubscribe();
  });

  return {
    contentGroups: () => state.contentGroups
  };
};
const useWebhooks = (): {
  loading: Accessor<boolean>;
  moreToLoad: Accessor<boolean>;
  loadMore(): void;
  webhooks(): Array<App.Webhook & { extension?: boolean }>;
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const [state, setState] = createStore<{
    webhooks: Array<App.Webhook & { extension?: boolean }>;
  }>({
    webhooks: []
  });
  const loadMore = (): void => {
    const lastId = state.webhooks[state.webhooks.length - 1]?.id;

    if (loading() || !moreToLoad()) return;

    setLoading(true);
    client.webhooks.list.query({ perPage: 20, lastId }).then((data) => {
      setLoading(false);
      setState("webhooks", (webhooks) => [...webhooks, ...data]);
      setMoreToLoad(data.length === 20);
    });
  };

  loadMore();

  const webhooksChanges = client.webhooks.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState("webhooks", (webhooks) => [data, ...webhooks]);
          break;
        case "update":
          setState("webhooks", (webhooks) => {
            return webhooks.map((webhook) => {
              if (webhook.id === data.id) {
                return { ...webhook, ...data };
              }

              return webhook;
            });
          });
          break;
        case "delete":
          setState("webhooks", (webhooks) => {
            return webhooks.filter((webhook) => webhook.id !== data.id);
          });
          break;
      }
    }
  });

  onCleanup(() => {
    webhooksChanges.unsubscribe();
  });

  return { loadMore, loading, moreToLoad, webhooks: () => state.webhooks };
};
const WebhookDetails: Component<WebhookDetailsProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);

  return (
    <Card color="contrast" class="relative flex flex-col m-0 w-full">
      <div class="flex gap-1 justify-center items-center">
        <Button badge size="small" class="m-0" hover={false}>
          {
            webhookEvents.find((webhookEvent) => {
              return webhookEvent.value === props.webhook.event;
            })?.label
          }
        </Button>
        <div class="flex-1" />
        <div class="flex gap-2">
          <Show
            when={!props.webhook.extension}
            fallback={
              <Tooltip text="Extension" class="mt-1">
                <IconButton path={mdiPuzzle} text="soft" class="m-0" badge />
              </Tooltip>
            }
          >
            <Show when={hasPermission("manageWebhooks")}>
              <Tooltip text="Edit" class="mt-1">
                <IconButton
                  disabled={loading()}
                  path={mdiTune}
                  class="m-0"
                  text="soft"
                  onClick={() => {
                    props.onEdit?.();
                  }}
                />
              </Tooltip>
              <Tooltip text="Delete" class="mt-1">
                <IconButton
                  path={mdiTrashCan}
                  loading={loading()}
                  class="m-0"
                  text="soft"
                  onClick={async () => {
                    setLoading(true);
                    await client.webhooks.delete.mutate({ id: props.webhook.id });
                    setLoading(false);
                    props.onDelete?.();
                    notify({ text: "Webhook deleted", type: "success" });
                  }}
                />
              </Tooltip>
            </Show>
          </Show>
        </div>
      </div>
      <Heading level={2} class="break-anywhere">
        {props.webhook.name}
      </Heading>
      <p class="font-mono text-xs break-anywhere text-gray-500 dark:text-gray-400 ">
        {props.webhook.url}
      </p>
    </Card>
  );
};
const WebhooksSection: SettingsSectionComponent = (props) => {
  const [editedWebhookId, setEditedWebhookId] = createSignal("");
  const { webhooks, loadMore, loading, moreToLoad } = useWebhooks();
  const { contentGroups } = useContentGroups();
  const [configureWebhookSectionOpened, setConfigureWebhookSectionOpened] = createSignal(false);

  createEffect(
    on(configureWebhookSectionOpened, (configureWebhookSectionOpened) => {
      if (!configureWebhookSectionOpened) {
        setEditedWebhookId("");
        props.setSubSection(null);
        props.setActionComponent(() => {
          return (
            <Show when={hasPermission("manageWebhooks")}>
              <Button
                color="primary"
                class="m-0"
                onClick={() => {
                  setConfigureWebhookSectionOpened(true);
                  props.setSubSection({
                    label: "New Webhook",
                    icon: mdiPlusCircle,
                    goBack() {
                      setConfigureWebhookSectionOpened(false);
                    }
                  });
                }}
              >
                New Webhook
              </Button>
            </Show>
          );
        });
      }
    })
  );

  return (
    <Show
      when={!configureWebhookSectionOpened()}
      fallback={
        <ConfigureWebhookSubsection
          contentGroups={contentGroups()}
          editedWebhookId={editedWebhookId()}
          setActionComponent={props.setActionComponent}
          onWebhookConfigured={() => {
            setConfigureWebhookSectionOpened(false);
          }}
        />
      }
    >
      <TitledCard icon={mdiFormatListBulleted} label="List">
        <Show when={webhooks().length || !loading()} fallback={<Loader />}>
          <For
            each={webhooks()}
            fallback={<p class="px-2 w-full text-start">No registered Webhooks</p>}
          >
            {(webhook) => (
              <WebhookDetails
                webhook={webhook}
                onEdit={() => {
                  setEditedWebhookId(webhook.id);
                  setConfigureWebhookSectionOpened(true);
                  props.setSubSection({
                    label: "Edit Webhook",
                    icon: mdiTune,
                    goBack() {
                      setConfigureWebhookSectionOpened(false);
                    }
                  });
                }}
              />
            )}
          </For>
          <Show when={moreToLoad()}>
            <Button
              class="m-0 w-full"
              text="soft"
              loading={loading()}
              onClick={() => {
                loadMore();
              }}
            >
              Load more
            </Button>
          </Show>
        </Show>
      </TitledCard>
    </Show>
  );
};

export { WebhooksSection };
