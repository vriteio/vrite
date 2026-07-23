import { Card, IconButton, Skeleton } from "@andesine/components";
import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { client, type KeyPermission } from "#web/lib/client";
import { createAsync, query, revalidate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import {
  batch,
  Component,
  createMemo,
  createSignal,
  Show,
  Suspense,
  useTransition
} from "solid-js";
import { Setting } from "../../../../setting";
import { SettingsSection } from "../../../../settings-section";
import { useSettingsPane } from "../../../../settings-pane-context";
import { APIKeyItem } from "./api-key-item";
import { NewKeyDialog } from "../../new-key-dialog";

type APIKey = Awaited<ReturnType<typeof client.keys.list>>[number];
type ExpirationOption = "now" | "1h" | "24h" | "7d";

interface APIKeyListProps {
  keys: APIKey[];
  keysRefreshing?: boolean;
  refreshKeys(onRevalidate?: () => void): void;
}

const apiKeysQuery = query(() => client.keys.list(), "api-keys");

const APIKeyList: Component<APIKeyListProps> = (props) => {
  const notify = useNotify();
  const { setTab } = useSettingsPane();
  const [revealedKey, setRevealedKey] = createSignal<string | null>(null);
  const rotateKeyMutation = createMutation(() => ({
    onSuccess: (data) => {
      props.refreshKeys(() => {
        batch(() => {
          setRevealedKey(data.rawKey);
          rotateKeyMutation.reset();
        });
      });
      notify({ type: "success", text: "API key rotated" });
    },
    onError: (error) => {
      console.error(error);
      props.refreshKeys();
      notify({ type: "error", text: "Failed to rotate API key" });
    },
    mutationFn: (input: { id: string; expiresIn: ExpirationOption }) => client.keys.rotate(input)
  }));
  const deleteKeyMutation = createMutation(() => ({
    onSuccess: (_, { ids }) => {
      props.refreshKeys(() => deleteKeyMutation.reset());
      notify({
        type: "success",
        text: ids.length > 1 ? `${ids.length} API keys deleted` : "API key deleted"
      });
    },
    onError: (error) => {
      console.error(error);
      props.refreshKeys();
      notify({ type: "error", text: "Failed to delete API key" });
    },
    mutationFn: (input: { ids: string[] }) => client.keys.delete(input)
  }));
  const mutationPending = () => rotateKeyMutation.isPending || deleteKeyMutation.isPending;
  const visibleKeys = createMemo(() => {
    // Sort keys by creation date first, moving expired ones to the end of the list
    const orderedKeys = [...props.keys].sort((a, b) => {
      if (a.expiresAt && !b.expiresAt) return 1;
      if (!a.expiresAt && b.expiresAt) return -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    if ((deleteKeyMutation.isPending || props.keysRefreshing) && deleteKeyMutation.variables) {
      return orderedKeys.filter((key) => !deleteKeyMutation.variables!.ids.includes(key.id));
    }

    return orderedKeys;
  });
  const keysTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: { items: visibleKeys().map((key) => key.id), levels: [] }
  }));

  return (
    <>
      <NewKeyDialog key={revealedKey()} onClose={() => setRevealedKey(null)} />
      <Show
        when={visibleKeys().length}
        fallback={
          <Card
            class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
            shade
          >
            <div class="i-lucide:key-round h-5.5 w-5.5 text-gray-300" />
            No registered API keys
          </Card>
        }
      >
        <Tree
          tree={keysTree}
          itemHeight={32}
          renderItem={(itemID) => {
            const key = () => visibleKeys().find((currentKey) => currentKey.id === itemID)!;

            return (
              <APIKeyItem
                id={key().id}
                name={key().name}
                prefix={key().prefix}
                permissions={key().permissions as KeyPermission[]}
                createdAt={key().createdAt}
                expiresAt={key().expiresAt}
                loading={mutationPending() || props.keysRefreshing}
                onEdit={() => setTab(`key-${key().id}`)}
                onRotate={(expiresIn) => rotateKeyMutation.mutate({ id: key().id, expiresIn })}
                onDelete={(ids) => deleteKeyMutation.mutate({ ids })}
              />
            );
          }}
        />
      </Show>
    </>
  );
};

const CredentialsSection: Component = () => {
  const { setTab } = useSettingsPane();
  const keys = createAsync(() => apiKeysQuery(), { initialValue: [] });
  const [keysRefreshing, startKeysRefresh] = useTransition();
  const refreshKeys = (onRevalidate = () => {}) => {
    startKeysRefresh(async () => {
      await revalidate(apiKeysQuery.key);
      onRevalidate();
    });
  };

  return (
    <SettingsSection label="Credentials">
      <div class="flex flex-col">
        <Setting
          label="API keys"
          description="Use API keys to authenticate requests from external apps or scripts"
        >
          <IconButton
            label={() => <span class="px-1">Create key</span>}
            class="flex-row-reverse pr-1"
            onClick={() => setTab("key")}
            iconProps={{ class: "h-4 w-4" }}
            icon="i-lucide:plus"
            size="small"
            color="contrast"
            variant="outlined"
            text="soft"
          />
        </Setting>
        <div class="relative flex w-full flex-col">
          <Suspense
            fallback={
              <div class="flex flex-col">
                <div class="flex h-8 items-center gap-1 px-1">
                  <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
                </div>
                <div class="flex h-8 items-center gap-1 px-1">
                  <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
                </div>
              </div>
            }
          >
            <APIKeyList keys={keys()} keysRefreshing={keysRefreshing()} refreshKeys={refreshKeys} />
          </Suspense>
        </div>
      </div>
    </SettingsSection>
  );
};

export { CredentialsSection };
