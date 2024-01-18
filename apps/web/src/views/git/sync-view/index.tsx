import {
  mdiCheck,
  mdiFileOutline,
  mdiMinusBox,
  mdiPlusBox,
  mdiSourceCommit,
  mdiSourcePull,
  mdiSync
} from "@mdi/js";
import { Component, For, Match, Show, Switch, createSignal } from "solid-js";
import { Button, Heading, Icon, IconButton, Input } from "@vrite/components";
import clsx from "clsx";
import { useNavigate } from "@solidjs/router";
import { TitledCard } from "#components/fragments";
import {
  App,
  hasPermission,
  useClient,
  useContentData,
  useNotifications,
  useSharedState
} from "#context";

interface SyncViewProps {
  gitData: App.GitData;
  setActionComponent(component: Component<{}> | null): void;
}
interface GitConflict {
  path: string;
  contentPieceId: string;
  variantId?: string;
  currentContent: string;
  pulledContent: string;
  pulledHash: string;
}

declare module "#context" {
  interface SharedState {
    conflicts: GitConflict[];
  }
}

const extractFileName = (path: string): { fileName: string; directory: string } => {
  const pathParts = path.split("/");
  const fileName = pathParts.pop()!;
  const directory = pathParts.filter(Boolean).join("/");

  return { fileName, directory };
};
const InitialSyncCard: Component = () => {
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const client = useClient();

  return (
    <TitledCard icon={mdiSync} label="Sync">
      <Show
        when={hasPermission("manageGit")}
        fallback={
          <p class="text-gray-500 dark:text-gray-400 mb-2">
            You need additional permissions to perform initial sync with remote repository.
          </p>
        }
      >
        <p class="text-gray-500 dark:text-gray-400 mb-2">
          Perform the initial sync with your remote repository. Depending on the amount of synced
          content, this may take a while.
        </p>
        <Button
          color="primary"
          class="m-0 w-full"
          loading={loading()}
          onClick={async () => {
            setLoading(true);

            try {
              await client.git.initialSync.mutate();
              notify({ text: "Latest content pulled", type: "success" });
            } catch (error) {
              notify({ text: "Couldn't pull content", type: "error" });
            }

            setLoading(false);
          }}
        >
          Sync now
        </Button>
      </Show>
    </TitledCard>
  );
};
const CommitCard: Component<{ changedRecords: App.GitRecord[] }> = (props) => {
  const { setActiveContentPieceId } = useContentData();
  const client = useClient();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [message, setMessage] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  return (
    <TitledCard
      icon={mdiSourceCommit}
      label="Commit"
      action={
        <Show when={props.changedRecords.length && hasPermission("manageGit")}>
          <IconButton
            disabled={!message() || !props.changedRecords.length}
            loading={loading()}
            path={mdiCheck}
            color="primary"
            class="m-0"
            onClick={async () => {
              setLoading(true);

              try {
                const { status } = await client.git.commit.mutate({ message: message() });

                if (status === "success") {
                  notify({ text: "Changes committed", type: "success" });
                  setMessage("");
                } else {
                  notify({
                    text: "Pull required before committing changes",
                    type: "error"
                  });
                }
              } catch (e) {
                notify({ text: "Couldn't commit changes", type: "error" });
              }

              setLoading(false);
            }}
          />
        </Show>
      }
    >
      <Show
        when={props.changedRecords.length}
        fallback={
          <div class="flex flex-col w-full">
            <p class="text-gray-500 dark:text-gray-400">There are no changes to commit.</p>
          </div>
        }
      >
        <div class="flex flex-col w-full">
          <Show when={hasPermission("manageGit")}>
            <Heading level={3}>Commit message</Heading>
            <p class="text-gray-500 dark:text-gray-400 mb-2">
              Briefly describe the changes you're committing.
            </p>
            <Input
              placeholder="Message"
              class="m-0 mb-2 w-full"
              color="contrast"
              value={message()}
              setValue={setMessage}
            />
          </Show>
          <Heading level={3}>Changes</Heading>
          <p class="text-gray-500 dark:text-gray-400 mb-2">
            These are the changes that will be committed.
          </p>
          <For each={props.changedRecords}>
            {(record) => {
              const { directory, fileName } = extractFileName(record.path);

              return (
                <div class="p-1 border-b-2 last:border-b-0 dark:border-gray-700 w-full text-start !flex group items-center cursor-pointer hover:bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent">
                  <IconButton
                    path={mdiFileOutline}
                    size="small"
                    class={clsx(
                      "m-0 mr-1 whitespace-nowrap",
                      record.currentHash === "" && "line-through"
                    )}
                    variant="text"
                    label={
                      <span class="pl-1 clamp-1 flex-1 whitespace-break-spaces text-start">
                        {fileName}
                      </span>
                    }
                    disabled={record.currentHash === ""}
                    hover={record.currentHash !== ""}
                    onClick={() => {
                      setActiveContentPieceId(record.contentPieceId);
                      navigate("/editor");
                    }}
                  />
                  <span
                    class={clsx(
                      "text-gray-500 dark:text-gray-400 text-xs clamp-1 flex-1",
                      record.currentHash === "" && "line-through"
                    )}
                  >
                    {directory}
                  </span>
                  <Switch>
                    <Match when={record.currentHash === ""}>
                      <Icon path={mdiMinusBox} class="h-4 w-4 text-red-500 mr-0.25" />
                    </Match>
                    <Match when={record.syncedHash === ""}>
                      <Icon path={mdiPlusBox} class="h-4 w-4 text-green-500 mr-0.25" />
                    </Match>
                  </Switch>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </TitledCard>
  );
};
const PullCard: Component = () => {
  const client = useClient();
  const { useSharedSignal } = useSharedState();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [conflicts, setConflicts] = useSharedSignal("conflicts", []);
  const [conflictData, setConflictData] = useSharedSignal("conflictData");

  return (
    <TitledCard
      icon={mdiSourcePull}
      label="Pull"
      action={
        <IconButton
          path={mdiSync}
          class="m-0"
          color="primary"
          loading={loading()}
          onClick={async () => {
            setLoading(true);

            try {
              const data = await client.git.pull.mutate({});

              if (data.status === "conflict") {
                setConflicts(data.conflicted || []);
                notify({ text: "Conflicts found", type: "error" });
              } else {
                notify({ text: "Latest changes pulled", type: "success" });
              }

              setLoading(false);
            } catch (error) {
              setLoading(false);
              notify({ text: "Couldn't pull changes", type: "error" });
            }
          }}
        />
      }
    >
      <Show
        when={conflicts()?.length}
        fallback={
          <div class="flex flex-col w-full">
            <p class="text-gray-500 dark:text-gray-400">Pull to get the latest changes.</p>
          </div>
        }
      >
        <div class="flex flex-col w-full">
          <Heading level={3}>Conflicts</Heading>
          <p class="text-gray-500 dark:text-gray-400 mb-2">
            These are the conflicts that need to be resolved before you can pull.
          </p>
          <For each={conflicts()}>
            {(conflict) => {
              const { directory, fileName } = extractFileName(conflict.path);
              const isActive = (): boolean => {
                return conflictData()?.contentPieceId === conflict.contentPieceId;
              };

              return (
                <div class="p-1 border-b-2 last:border-b-0 dark:border-gray-700 w-full text-start !flex group items-center cursor-pointer">
                  <IconButton
                    path={mdiFileOutline}
                    size="small"
                    class="m-0 mr-1 whitespace-nowrap"
                    variant="text"
                    label={fileName}
                    color={isActive() ? "primary" : "base"}
                    text="base"
                    onClick={() => {
                      setConflictData({
                        pulledContent: conflict.pulledContent,
                        pulledHash: conflict.pulledHash,
                        currentContent: conflict.currentContent,
                        contentPieceId: conflict.contentPieceId,
                        variantId: conflict.variantId,
                        path: conflict.path
                      });
                      navigate("/conflict");
                    }}
                  />
                  <span class="text-gray-500 dark:text-gray-400 text-xs clamp-1 flex-1">
                    {directory}
                  </span>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </TitledCard>
  );
};
const SyncView: Component<SyncViewProps> = (props) => {
  const changedRecords = (): App.GitRecord[] => {
    return props.gitData.records.filter((record) => record.currentHash !== record.syncedHash);
  };

  return (
    <>
      <Show when={!props.gitData.lastCommitId}>
        <InitialSyncCard />
      </Show>
      <Show when={props.gitData.lastCommitId}>
        <CommitCard changedRecords={changedRecords()} />
        <Show when={hasPermission("manageGit")}>
          <PullCard />
        </Show>
      </Show>
    </>
  );
};

export { SyncView };
