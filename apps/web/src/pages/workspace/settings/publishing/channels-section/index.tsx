import { Card, IconButton, Skeleton } from "@andesine/components";
import { createAsync, revalidate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { normalizeResourceName } from "@andesine/editor/normalize-resource-name";
import { type Component, createMemo, createSignal, Show, Suspense, useTransition } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { settleBulkAction } from "#web/lib/primitives";
import { type PublishingChannel, publishingChannelsWithUsageQuery } from "#web/lib/data";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { ChannelItem } from "./channel-item";
import { CreateChannelDialog } from "./create-channel-dialog";

interface ChannelsResult {
  error?: true;
  result?: PublishingChannel[];
}

const isConflictError = (error: unknown) => {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "CONFLICT"
  );
};

const ChannelsSection: Component = () => {
  const { hasPermission } = useWorkspace();
  const notify = useNotify();
  const channelsResult = createAsync(async (): Promise<ChannelsResult> => {
    try {
      return { result: await publishingChannelsWithUsageQuery() };
    } catch (error) {
      console.error(error);
      return { error: true };
    }
  });
  const [refreshing, startRefresh] = useTransition();
  const [createDialogOpened, setCreateDialogOpened] = createSignal(false);
  const [newChannelName, setNewChannelName] = createSignal("");
  const [newChannelServerError, setNewChannelServerError] = createSignal("");
  const [deletionTargets, setDeletionTargets] = createSignal<PublishingChannel[]>([]);
  const channels = () => channelsResult()?.result || [];
  const refresh = (onRevalidated = () => {}) => {
    void startRefresh(() => {
      void (async () => {
        await revalidate(publishingChannelsWithUsageQuery.key);
        onRevalidated();
      })();
    });
  };
  const clearCreateDialog = () => {
    setTimeout(() => {
      setNewChannelName("");
      setNewChannelServerError("");
    }, 300);
  };
  const createChannelMutation = createMutation(() => ({
    mutationFn: (name: string) => client.publishing.createChannel({ name }),
    onSuccess: () => {
      setCreateDialogOpened(false);
      clearCreateDialog();
      refresh(() => createChannelMutation.reset());
      notify({ type: "success", text: "Publishing channel created" });
    },
    onError: (error) => {
      console.error(error);
      if (isConflictError(error)) {
        setNewChannelServerError(`The API code ${newChannelCode()} is already in use`);
      }
      notify({ type: "error", text: "Failed to create publishing channel" });
    }
  }));
  const deleteChannelMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return settleBulkAction(ids, (code) => client.publishing.deleteChannel({ code }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      setDeletionTargets([]);
      refresh(() => {
        deleteChannelMutation.reset();

        if (result.successful.length > 0) {
          notify({
            type: "success",
            text:
              result.successful.length > 1
                ? `${result.successful.length} publishing channels deleted`
                : "Publishing channel deleted"
          });
        }

        if (result.failed.length > 0) {
          notify({
            type: "error",
            text:
              result.failed.length > 1
                ? `${result.failed.length} publishing channels failed to delete`
                : "Failed to delete publishing channel"
          });
        }
      });
    }
  }));
  const normalizedName = () => newChannelName().trim();
  const newChannelCode = () => normalizeResourceName(normalizedName(), "channel");
  const newChannelError = () => {
    const name = normalizedName();

    if (!name) return "Channel name is required";
    if (name.length > 50) return "Channel name must be 50 characters or fewer";
    if (channels().some((channel) => channel.code === newChannelCode())) {
      return `The API code ${newChannelCode()} is already in use`;
    }

    return newChannelServerError();
  };
  const visibleChannels = createMemo(() => {
    let currentChannels = channels();

    if ((deleteChannelMutation.isPending || refreshing()) && deleteChannelMutation.variables) {
      currentChannels = currentChannels.filter((channel) => {
        return !deleteChannelMutation.variables!.ids.includes(channel.code);
      });
    }

    if ((createChannelMutation.isPending || refreshing()) && createChannelMutation.variables) {
      const optimisticCode = normalizeResourceName(createChannelMutation.variables, "channel");
      const exists = currentChannels.some((channel) => channel.code === optimisticCode);

      if (!exists) {
        const now = new Date().toISOString();

        currentChannels = [
          ...currentChannels,
          {
            builtIn: false,
            code: optimisticCode,
            createdAt: now,
            name: createChannelMutation.variables,
            assignmentCount: 0,
            updatedAt: now
          }
        ];
      }
    }

    return [...currentChannels].sort((a, b) => {
      return Number(a.builtIn) - Number(b.builtIn) || a.name.localeCompare(b.name);
    });
  });
  const tree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: {
      items: visibleChannels().map((channel) => channel.code),
      levels: []
    }
  }));
  const mutationPending = () => {
    return createChannelMutation.isPending || deleteChannelMutation.isPending;
  };
  const deletionAffected = () => {
    return deletionTargets().map((channel) => ({
      id: channel.code,
      icon: "i-lucide:radio",
      label: channel.name,
      detail: `${channel.assignmentCount || 0} assigned entries · ${channel.code}`
    }));
  };
  const deletionDescription = () => {
    const assignmentCount = deletionTargets().reduce((total, channel) => {
      return total + (channel.assignmentCount || 0);
    }, 0);

    if (deletionTargets().length === 0) {
      return "Publishing assignments for these channels will be removed.";
    }

    return `All ${assignmentCount} assignments for ${deletionTargets().length === 1 ? "this channel" : "these channels"} will be removed. Existing versions are kept.`;
  };
  const closeCreateDialog = () => {
    if (createChannelMutation.isPending) return;

    setCreateDialogOpened(false);
    clearCreateDialog();
  };

  return (
    <SettingsSection label="Publishing">
      <CreateChannelDialog
        code={normalizedName() ? newChannelCode() : ""}
        opened={createDialogOpened()}
        name={newChannelName()}
        error={createDialogOpened() ? newChannelError() : ""}
        loading={createChannelMutation.isPending}
        setName={(name) => {
          setNewChannelName(name);
          setNewChannelServerError("");
        }}
        onClose={closeCreateDialog}
        onConfirm={() => createChannelMutation.mutate(normalizedName())}
      />
      <ActionConfirmationDialog
        opened={deletionTargets().length > 0}
        title={`Delete ${deletionTargets().length === 1 ? "publishing channel" : `${deletionTargets().length} publishing channels`}?`}
        description={deletionDescription()}
        affected={deletionAffected()}
        action={{
          color: "danger",
          label: deletionTargets().length === 1 ? "Delete channel" : "Delete channels",
          loading: deleteChannelMutation.isPending,
          onClick: () => {
            const ids = deletionTargets().map((channel) => channel.code);

            if (ids.length > 0) deleteChannelMutation.mutate({ ids });
          }
        }}
        onClose={() => {
          if (!deleteChannelMutation.isPending) setDeletionTargets([]);
        }}
      />
      <div class="flex flex-col">
        <Setting
          label="Channels"
          description="Publish separate versions of content for different destinations"
          fade={false}
        >
          <Show when={hasPermission("publishing")}>
            <IconButton
              label={() => <span class="px-1">Create channel</span>}
              class="flex-row-reverse pr-1"
              onClick={() => setCreateDialogOpened(true)}
              disabled={mutationPending()}
              iconProps={{ class: "h-4 w-4" }}
              icon="i-lucide:plus"
              size="small"
              color="contrast"
              variant="outlined"
              text="soft"
            />
          </Show>
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
            <Show
              when={!channelsResult()?.error}
              fallback={
                <Card
                  class="flex h-20 flex-col items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
                  shade
                >
                  <div class="i-lucide:triangle-alert h-5.5 w-5.5 text-gray-300" />
                  Publishing channels could not be loaded
                  <IconButton
                    label={() => <span class="px-1">Try again</span>}
                    icon="i-lucide:refresh-cw"
                    size="small"
                    variant="text"
                    onClick={() => refresh()}
                  />
                </Card>
              }
            >
              <Show
                when={visibleChannels().length > 0}
                fallback={
                  <Card
                    class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
                    shade
                  >
                    <div class="i-lucide:radio h-5.5 w-5.5 text-gray-300" />
                    No publishing channels
                  </Card>
                }
              >
                <Tree
                  tree={tree}
                  itemHeight="2rem"
                  renderItem={(channelCode) => {
                    const channel = () => {
                      return visibleChannels().find((candidate) => candidate.code === channelCode)!;
                    };

                    return (
                      <ChannelItem
                        channel={channel()}
                        assignmentCount={channel().assignmentCount}
                        canManage={hasPermission("publishing")}
                        loading={mutationPending() || refreshing()}
                        onDelete={(ids) => {
                          setDeletionTargets(
                            ids.flatMap((id) => {
                              const target = visibleChannels().find(
                                (candidate) => candidate.code === id && !candidate.builtIn
                              );

                              return target ? [target] : [];
                            })
                          );
                        }}
                      />
                    );
                  }}
                />
              </Show>
            </Show>
          </Suspense>
        </div>
      </div>
    </SettingsSection>
  );
};

export { ChannelsSection };
