import {
  IconButton,
  Card,
  Button,
  DropdownArea,
  DropdownMenu,
  Overlay,
  Skeleton
} from "@andesine/components";
import { action, useAction, useSubmission } from "@solidjs/router";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  Suspense,
  batch
} from "solid-js";
import clsx from "clsx";
import { Setting } from "../../setting";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { KeyFormPage } from "./key-form";
import type { KeyPermission } from "./key-form";
import {
  TreeItem,
  TreeLevel,
  TreeProvider,
  TreeSelection,
  useTree,
  type TreeMap
} from "#web/components/tree";

interface SettingsTabProps {
  setTab(tabId: string): void;
  setBreadcrumb?(parts: BreadcrumbPart[]): void;
  opened?: boolean;
}

type BreadcrumbPart = string | { label: string; onClick: () => void };

type ExpirationOption = "now" | "1h" | "24h" | "7d";

const permissionLabels: Record<KeyPermission, string> = {
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

const rotateKeyAction = action((input: { id: string; expiresIn: ExpirationOption }) => {
  return client.keys.rotate(input);
});
const deleteKeyAction = action(async (input: { ids: string[] }) => {
  await client.keys.delete({ ids: input.ids });

  return input.ids;
});

const APIKeyItem: Component<{
  id: string;
  name: string;
  prefix: string;
  permissions: KeyPermission[];
  createdAt: Date;
  expiresAt: string | null;
  disabled?: boolean;
  getPermissionLabel: (permission: KeyPermission) => string;
  getExpirationStatus: (expiresAt: string | null) => string | null;
  onEdit: () => void;
  onRotate: () => void;
  onDelete: (ids: string[]) => void;
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);

  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;

    return [
      ...(!isMulti
        ? [
            [
              {
                label: "Edit",
                icon: "i-lucide:pencil",
                onClick: props.onEdit
              },
              {
                label: "Rotate",
                icon: "i-lucide:refresh-cw",
                onClick: props.onRotate
              }
            ]
          ]
        : []),
      [
        {
          label: isMulti ? `Delete ${selectedIDs.length} keys` : "Delete",
          icon: "i-lucide:trash",
          color: "danger" as const,
          onClick: () => {
            props.onDelete(isMulti ? selectedIDs : [props.id]);
            setSelection([]);
          }
        }
      ]
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) => (selectedIDs.includes(props.id) ? selectedIDs : [props.id]));
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.id}
        label={props.name}
        topLevel
        selectable={!props.disabled}
        class="px-1 py-1"
        icon={<div class="i-lucide:key-round h-5 w-5 text-gray-400 dark:text-gray-500" />}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              cardProps={{ class: "w-48" }}
              opened={menuOpened()}
              portal={false}
              setOpened={setMenuOpened}
              trigger={() => (
                <div class={clsx(!menuOpened() && "opacity-0 group-hover:opacity-100")}>
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                    disabled={props.disabled}
                  />
                </div>
              )}
              items={dropdownOptions()}
            />
          </div>
        }
      >
        <div class="flex flex-1 items-center gap-1.5 overflow-hidden">
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate font-semibold">{props.name}</span>
              <code class="shrink-0 font-mono text-xs text-gray-400 dark:text-gray-500">
                {props.prefix}...
              </code>
            </div>
            <div class="flex flex-wrap gap-1">
              <For each={props.permissions}>
                {(perm) => (
                  <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {props.getPermissionLabel(perm)}
                  </span>
                )}
              </For>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2 self-start pl-2">
            <Show when={props.getExpirationStatus(props.expiresAt)}>
              {(status) => <span class="text-xs font-medium text-amber-500">{status()}</span>}
            </Show>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {props.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
        </div>
      </TreeItem>
    </DropdownArea>
  );
};

const APISettingsTab: Component<SettingsTabProps> = (props) => {
  const notify = useNotify();
  const keys = () => contentState.keys();
  const { syncMetadata } = contentActions;
  const rotateKey = useAction(rotateKeyAction);
  const deleteKey = useAction(deleteKeyAction);
  const rotateSubmission = useSubmission(rotateKeyAction);
  const deleteSubmission = useSubmission(deleteKeyAction);

  // ── Sub-page ──────────────────────────────────────────────────────────────
  type Page =
    | { id: "list" }
    | { id: "create" }
    | { id: "edit"; keyId: string; name: string; permissions: KeyPermission[] };
  const [page, setPage] = createSignal<Page>({ id: "list" });

  // ── Keys list ─────────────────────────────────────────────────────────────
  const mutationPending = createMemo(() => rotateSubmission.pending || deleteSubmission.pending);
  const keyMutationText = createMemo(() => {
    if (rotateSubmission.pending) {
      return "Rotating API key...";
    }

    if (deleteSubmission.pending) {
      const count = deleteSubmission.input?.[0]?.ids.length ?? 0;

      return count > 1 ? `Deleting ${count} API keys...` : "Deleting API key...";
    }

    return null;
  });
  const keysTree = createMemo<TreeMap>(() => ({
    "*": { items: keys().map((key) => key.id), levels: [] }
  }));

  const getPermissionLabel = (permission: KeyPermission) => {
    return permissionLabels[permission] || permission;
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
      const data = await rotateKey({ id, expiresIn });
      await syncMetadata("keys");

      batch(() => {
        setRotatingId(null);
        setRevealedKey(data.rawKey);
      });
      notify({ type: "success", text: "API key rotated" });
    } catch (error) {
      notify({
        type: "error",
        text: "Failed to rotate API key"
      });
      await syncMetadata("keys");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (ids: string[]) => {
    try {
      await deleteKey({ ids });
      await syncMetadata("keys");

      notify({
        type: "success",
        text: ids.length > 1 ? `${ids.length} API keys deleted` : "API key deleted"
      });
    } catch (error) {
      notify({
        type: "error",
        text: "Failed to delete API key"
      });
      await syncMetadata("keys");
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

  createEffect(() => {
    const currentPage = page();

    if (currentPage.id === "list") {
      props.setBreadcrumb?.([]);
    } else if (currentPage.id === "create") {
      props.setBreadcrumb?.([{ label: "API", onClick: goToList }, "Keys", "Create Key"]);
    } else if (currentPage.id === "edit") {
      props.setBreadcrumb?.([{ label: "API", onClick: goToList }, "Keys", "Edit Key"]);
    }
  });

  return (
    <div class="flex h-full min-w-0 flex-col gap-3 overflow-x-hidden">
      {/* ── Revealed key dialog ────────────────────────────────────────── */}
      <Show when={revealedKey()}>
        <Overlay
          opened={!!revealedKey()}
          ariaLabel="API key"
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
          ariaLabel="Rotate API key"
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
                    disabled={rotateSubmission.pending}
                    onClick={() => handleRotate(rotatingId()!, opt.value)}
                  >
                    {rotateSubmission.pending ? "Rotating..." : opt.label}
                  </Button>
                )}
              </For>
            </div>
            <div class="flex justify-end">
              <Button
                variant="text"
                text="soft"
                size="small"
                disabled={rotateSubmission.pending}
                onClick={() => setRotatingId(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </Overlay>
      </Show>

      {/* ── Sub-page: Create Key ──────────────────────────────────────── */}
      <Show when={page().id === "create"}>
        <KeyFormPage
          mode="create"
          goBack={goToList}
          onCreated={async (rawKey) => {
            setRevealedKey(rawKey);
            await syncMetadata("keys");
          }}
        />
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
              onUpdated={() => syncMetadata("keys")}
            />
          );
        })()}
      </Show>

      {/* ── Sub-page: List ────────────────────────────────────────────── */}
      <Show when={page().id === "list"}>
        <div class="flex flex-col gap-3">
          <Setting
            label="API Keys"
            description="Use API keys to authenticate requests from external apps or scripts"
          >
            <IconButton
              label={() => <span class="px-1">Create key</span>}
              class="flex-row-reverse pr-1"
              onClick={() => setPage({ id: "create" })}
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
              <div class="w-full flex flex-col gap-2">
                <Skeleton class={["h-12", "h-12", "h-12"]} />
              </div>
            }
          >
            <div class="w-full flex flex-col gap-2">
              <Show
                when={keys().length}
                fallback={
                  <span class="text-sm text-gray-400 dark:text-gray-500">
                    No API keys yet. Create one for scripts, CI, or external integrations.
                  </span>
                }
              >
                <TreeProvider tree={keysTree} itemHeight={40}>
                  <div class="relative flex flex-col">
                    <TreeSelection />
                    <TreeLevel
                      levelID="*"
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
                                      void handleDelete(ids);
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </Show>
                        );
                      }}
                    />
                  </div>
                </TreeProvider>
              </Show>
            </div>
          </Suspense>
        </div>
      </Show>
    </div>
  );
};

export { APISettingsTab };
