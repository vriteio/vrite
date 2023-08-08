import {
  mdiCheck,
  mdiFileOutline,
  mdiPlus,
  mdiSourceCommit,
  mdiSourcePull,
  mdiSync,
  mdiUndoVariant
} from "@mdi/js";
import { Component, For, Show, createSignal } from "solid-js";
import { Button, Heading, IconButton, Input, Tooltip } from "@vrite/components";
import clsx from "clsx";
import { useNavigate } from "@solidjs/router";
import { TitledCard } from "#components/fragments";
import { App, useClient, useLocalStorage, useSharedState } from "#context";

interface SyncViewProps {
  gitData: App.GitData;
  setActionComponent(component: Component<{}> | null): void;
}
interface GitConflict {
  path: string;
  contentPieceId: string;
  currentContent: string;
  pulledContent: string;
  pulledHash: string;
}

const SyncView: Component<SyncViewProps> = (props) => {
  const client = useClient();
  const createSharedSignal = useSharedState();
  const navigate = useNavigate();
  const extractFileName = (path: string): { fileName: string; directory: string } => {
    const pathParts = path.split("/");
    const fileName = pathParts.pop()!;
    const directory = pathParts.filter(Boolean).join("/");

    return { fileName, directory };
  };
  const [conflicts, setConflicts] = createSignal<GitConflict[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [, setConflictData] = createSharedSignal("conflictData");
  const changedRecords = (): App.GitRecord[] => {
    return props.gitData.records.filter((record) => record.currentHash !== record.syncedHash);
  };

  return (
    <>
      <Show when={!props.gitData.lastCommitId}>
        <TitledCard icon={mdiSync} label="Sync">
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
              await client.git.github.initialSync.mutate();
              setLoading(false);
            }}
          >
            Sync now
          </Button>
        </TitledCard>
      </Show>
      <Show when={props.gitData.lastCommitId}>
        <TitledCard
          icon={mdiSourceCommit}
          label="Commit"
          action={
            <>
              <IconButton
                disabled={!message() || !changedRecords().length}
                loading={loading()}
                path={mdiCheck}
                color="primary"
                class="m-0"
                onClick={async () => {
                  setLoading(true);

                  try {
                    await client.git.github.commit.mutate({ message: message() });
                    console.log("committed");
                  } catch (e) {
                    console.log("cannot commit");
                  }

                  setLoading(false);
                }}
              />
            </>
          }
        >
          <div class="flex flex-col w-full">
            <Heading level={3}>Commit message</Heading>
            <p class="text-gray-500 dark:text-gray-400 mb-2">
              Committing will push your changes to the remote repository.
            </p>
            <Input
              placeholder="Message"
              class="m-0 mb-2 w-full"
              color="contrast"
              value={message()}
              setValue={setMessage}
            />
            <Heading level={3}>Changes</Heading>
            <p class="text-gray-500 dark:text-gray-400 mb-2">
              These are the changes that will be committed.
            </p>
            <For each={changedRecords()}>
              {(record) => {
                const { directory, fileName } = extractFileName(record.path);

                return (
                  <div
                    class={clsx(
                      "p-1 border-b-2 last:border-b-0 dark:border-gray-700 w-full text-start !flex group items-center cursor-pointer",
                      record.currentHash === "" && "line-through"
                    )}
                  >
                    <IconButton
                      path={mdiFileOutline}
                      size="small"
                      class="m-0 mr-1 whitespace-nowrap"
                      variant="text"
                      label={fileName}
                      disabled={record.currentHash === ""}
                      hover={record.currentHash !== ""}
                    />
                    <span class="text-gray-500 dark:text-gray-400 text-xs clamp-1 flex-1">
                      {directory}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </TitledCard>
        <TitledCard
          icon={mdiSourcePull}
          label="Pull"
          action={
            <IconButton
              path={mdiSync}
              class="m-0"
              color="primary"
              onClick={async () => {
                const data = await client.git.github.pull.mutate({});

                if (data.status === "conflict") {
                  setConflicts(data.conflicted || []);
                }

                console.log("pulled");
              }}
            />
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

                return (
                  <div class="p-1 border-b-2 last:border-b-0 dark:border-gray-700 w-full text-start !flex group items-center cursor-pointer">
                    <IconButton
                      path={mdiFileOutline}
                      size="small"
                      class="m-0 mr-1 whitespace-nowrap"
                      variant="text"
                      label={fileName}
                      onClick={() => {
                        setConflictData({
                          pulledContent: conflict.pulledContent,
                          pulledHash: conflict.pulledHash,
                          contentPieceId: conflict.contentPieceId,
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
        </TitledCard>
      </Show>
    </>
  );
};

export { SyncView };
