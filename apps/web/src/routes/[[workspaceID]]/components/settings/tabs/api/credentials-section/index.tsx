import {
  IconButton,
  Card,
  Button,
  Overlay,
  Skeleton
} from "@andesine/components";
import { Component, createMemo, createSignal, For, Show, Suspense, batch } from "solid-js";
import { Setting } from "../../../setting";
import { SettingsSection } from "../../../settings-section";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { KeyFormPage } from "../key-form";
import type { KeyPermission } from "../key-form";
import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { createMutation } from "@tanstack/solid-query";
import { createAsync, query, revalidate } from "@solidjs/router";
import { APIKeyItem } from "./api-key-item";
import type { SettingsTabProps } from "../../../settings-tab";

type ExpirationOption = "now" | "1h" | "24h" | "7d";

const apiKeysQuery = query(() => client.keys.list(), "api-keys");
const refreshAPIKeys = () => revalidate(apiKeysQuery.key);

const keyPermissionLabels: Record<KeyPermission, string> = {
  "entries": "Entries: write",
  "read:entries": "Entries: read",
  "collections": "Collections: write",
  "read:collections": "Collections: read",
  "memberships": "People: write",
  "read:memberships": "People: read",
  "roles": "Roles: write",
  "read:roles": "Roles: read"
};

const expirationOptions: Array<{ value: ExpirationOption; label: string }> = [
  { value: "now", label: "Expire now" },
  { value: "1h", label: "In 1 hour" },
  { value: "24h", label: "In 24 hours" },
  { value: "7d", label: "In 7 days" }
];

const CredentialsSection: Component<SettingsTabProps> = (props) => {
  const notify = useNotify();
  const keys = createAsync(() => apiKeysQuery(), { initialValue: [] });
  const refreshKeys = refreshAPIKeys;
  const getErrorText = (error: unknown, fallback: string) => {
    return error instanceof Error && error.message ? error.message : fallback;
  };
  const rotateKeyMutation = createMutation(() => ({
    mutationFn: (input: { id: string; expiresIn: ExpirationOption }) => client.keys.rotate(input)
  }));
  const deleteKeyMutation = createMutation(() => ({
    mutationFn: async (input: { ids: string[] }) => {
      await client.keys.delete({ ids: input.ids });

      return input.ids;
    }
  }));

  // ── Sub-page ──────────────────────────────────────────────────────────────
  type Page =
    | { id: "list" }
    | { id: "edit"; keyId: string; name: string; permissions: KeyPermission[] };
  const [page, setPage] = createSignal<Page>({ id: "list" });

  // ── Keys list ─────────────────────────────────────────────────────────────
  const mutationPending = createMemo(
    () => rotateKeyMutation.isPending || deleteKeyMutation.isPending
  );
  const keyMutationText = createMemo(() => {
    if (rotateKeyMutation.isPending) {
      return "Rotating API key...";
    }

    if (deleteKeyMutation.isPending) {
      const count = deleteKeyMutation.variables?.ids.length ?? 0;

      return count > 1 ? `Deleting ${count} API keys...` : "Deleting API key...";
    }

    return null;
  });
  const keysTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: { items: keys().map((key) => key.id), levels: [] }
  }));

  const getPermissionLabel = (permission: KeyPermission) => {
    return keyPermissionLabels[permission] || permission;
  };

  // ── Revealed key ─────────────────────────────────────────────────────────
  const [revealedKey, setRevealedKey] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);

  const copyKey = async () => {
    const raw = revealedKey();

    if (!raw) return;

    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Rotate state ──────────────────────────────────────────────────────────
  const [rotatingId, setRotatingId] = createSignal<string | null>(null);

  const handleRotate = async (id: string, expiresIn: ExpirationOption) => {
    try {
      const data = await rotateKeyMutation.mutateAsync({ id, expiresIn });
      await refreshKeys();

      batch(() => {
        setRotatingId(null);
        setRevealedKey(data.rawKey);
      });
      notify({ type: "success", text: "API key rotated" });
    } catch (error) {
      notify({
        type: "error",
        text: getErrorText(error, "Failed to rotate API key")
      });
      await refreshKeys();
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (ids: string[]) => {
    try {
      await deleteKeyMutation.mutateAsync({ ids });
      await refreshKeys();

      notify({
        type: "success",
        text: ids.length > 1 ? `${ids.length} API keys deleted` : "API key deleted"
      });
    } catch (error) {
      notify({
        type: "error",
        text: getErrorText(error, "Failed to delete API key")
      });
      await refreshKeys();
    }
  };

  // ── Expiration status ─────────────────────────────────────────────────────
  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) return null;

    const expDate = new Date(expiresAt);
    const now = new Date();

    if (expDate <= now) return "Expired";

    const diff = expDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `Expires in ${days}d`;
    if (hours > 0) return `Expires in ${hours}h`;

    return "Expiring soon";
  };

  const goToList = () => setPage({ id: "list" });

  return (
    <div class="flex h-full min-w-0 flex-col gap-3">
      {/* ── Revealed key dialog ────────────────────────────────────────── */}
      <Show when={revealedKey()}>
        <Overlay
          opened={!!revealedKey()}
          aria-label="API key"
          onOverlayClick={() => setRevealedKey(null)}
        >
          <Card class="flex flex-col gap-3 p-4 w-lg rounded-2xl" color="contrast">
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold">Your API Key</h3>
              <p class="text-sm text-gray-400 dark:text-gray-500">
                Copy this key now. You won't be able to see it again.
              </p>
            </div>
            <Card class="rounded-xl p-3 font-mono text-sm break-all select-all" shade>
              {revealedKey()}
            </Card>
            <div class="flex justify-end gap-2">
              <Button
                variant="outlined"
                text="soft"
                size="small"
                onClick={() => setRevealedKey(null)}
              >
                Close
              </Button>
              <Button color="primary" variant="solid" size="small" onClick={copyKey}>
                {copied() ? "Copied!" : "Copy key"}
              </Button>
            </div>
          </Card>
        </Overlay>
      </Show>

      {/* ── Rotate dialog ──────────────────────────────────────────────── */}
      <Show when={rotatingId()}>
        <Overlay
          opened={!!rotatingId()}
          aria-label="Rotate API key"
          onOverlayClick={() => setRotatingId(null)}
        >
          <Card class="flex flex-col gap-3 p-4 w-md rounded-2xl" color="contrast">
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold">Rotate API Key</h3>
              <p class="text-sm text-gray-400 dark:text-gray-500">
                A new key will be created. Choose when the old key should expire.
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <For each={expirationOptions}>
                {(opt) => (
                  <Button
                    variant="outlined"
                    text="soft"
                    size="small"
                    class="justify-start"
                    disabled={rotateKeyMutation.isPending}
                    onClick={() => handleRotate(rotatingId()!, opt.value)}
                  >
                    {rotateKeyMutation.isPending ? "Rotating..." : opt.label}
                  </Button>
                )}
              </For>
            </div>
            <div class="flex justify-end">
              <Button
                variant="text"
                text="soft"
                size="small"
                disabled={rotateKeyMutation.isPending}
                onClick={() => setRotatingId(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </Overlay>
      </Show>

      {/* ── Sub-page: Edit Key ────────────────────────────────────────── */}
      <Show when={page().id === "edit"}>
        {(() => {
          const p = page() as Extract<Page, { id: "edit" }>;

          return (
            <KeyFormPage
              mode="edit"
              keyId={p.keyId}
              initialName={p.name}
              initialPermissions={p.permissions}
              goBack={goToList}
              onUpdated={refreshKeys}
            />
          );
        })()}
      </Show>

      {/* ── Sub-page: List ────────────────────────────────────────────── */}
      <Show when={page().id === "list"}>
        <div class="flex flex-col gap-3">
          <SettingsSection label="Credentials">
            <Setting
              label="API keys"
              description="Use API keys to authenticate requests from external apps or scripts"
            >
              <IconButton
                label={() => <span class="px-1">Create key</span>}
                class="flex-row-reverse pr-1"
                onClick={() => props.setTab("create-key")}
                iconProps={{ class: "h-4 w-4" }}
                icon="i-lucide:plus"
                size="small"
                color="contrast"
                variant="outlined"
                text="soft"
              />
            </Setting>
            <Show when={keyMutationText()}>
              {(text) => (
                <div class="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <Skeleton class="h-4 w-4 rounded-full" />
                  <span>{text()}</span>
                </div>
              )}
            </Show>
            <Suspense
              fallback={
                <div class="flex flex-col">
                  <div class="flex items-center gap-1 h-8 px-1">
                    <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
                  </div>
                  <div class="flex items-center gap-1 h-8 px-1">
                    <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
                  </div>
                </div>
              }
            >
                <div class="w-full flex flex-col gap-2">
                  <Show
                    when={keys().length}
                    fallback={
                      <Card>
                        No API keys yet. Create one for scripts, CI, or external integrations.
                      </Card>
                    }
                  >
                    <Tree
                      tree={keysTree}
                      renderLevel={() => <></>}
                      renderItem={(itemID) => {
                        const key = () => keys().find((_key) => _key.id === itemID);

                        return (
                          <Show when={key()}>
                            {(currentKey) => (
                              <div class="relative">
                                <APIKeyItem
                                  id={currentKey().id}
                                  name={currentKey().name}
                                  prefix={currentKey().prefix}
                                  permissions={currentKey().permissions as KeyPermission[]}
                                  createdAt={new Date(currentKey().createdAt)}
                                  expiresAt={currentKey().expiresAt}
                                  disabled={mutationPending()}
                                  getPermissionLabel={getPermissionLabel}
                                  getExpirationStatus={getExpirationStatus}
                                  onEdit={() =>
                                    setPage({
                                      id: "edit",
                                      keyId: currentKey().id,
                                      name: currentKey().name,
                                      permissions: currentKey().permissions as KeyPermission[]
                                    })
                                  }
                                  onRotate={() => {
                                    if (!mutationPending()) {
                                      setRotatingId(currentKey().id);
                                    }
                                  }}
                                  onDelete={(ids) => {
                                    if (!mutationPending()) {
                                      handleDelete(ids);
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </Show>
                        );
                      }}
                    />
                  </Show>
                </div>
            </Suspense>
          </SettingsSection>
        </div>
      </Show>
    </div>
  );
};

export { CredentialsSection, refreshAPIKeys };
