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
import { TitledCard } from "#components/fragments";
import { App, useClient } from "#context";

interface SyncViewProps {
  gitData: App.GitData;
  setActionComponent(component: Component<{}> | null): void;
}

const SyncView: Component<SyncViewProps> = (props) => {
  const client = useClient();
  const extractFileName = (path: string): { fileName: string; directory: string } => {
    const pathParts = path.split("/");
    const fileName = pathParts.pop()!;
    const directory = pathParts.filter(Boolean).join("/");

    return { fileName, directory };
  };
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal("");
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
                  await client.git.github.commit.mutate({ message: message() });
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
                  <button class="p-1 border-b-2 last:border-b-0 dark:border-gray-700 w-full text-start !flex group items-center cursor-pointer">
                    <IconButton
                      path={mdiFileOutline}
                      size="small"
                      class="m-0 mr-1 whitespace-nowrap"
                      variant="text"
                      label={fileName}
                    />
                    <span class="text-gray-500 dark:text-gray-400 text-xs clamp-1 flex-1">
                      {directory}
                    </span>
                    <Tooltip text="Discard">
                      <IconButton
                        path={mdiUndoVariant}
                        class="hidden group-hover:flex"
                        color="contrast"
                        text="soft"
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip text="Stage">
                      <IconButton
                        path={mdiPlus}
                        class="hidden group-hover:flex"
                        color="contrast"
                        text="soft"
                        size="small"
                      />
                    </Tooltip>
                  </button>
                );
              }}
            </For>
          </div>
        </TitledCard>
        <TitledCard icon={mdiSourcePull} label="Pull">
          <Button
            onClick={async () => {
              const data = await client.git.github.pull.mutate();

              console.log(data);
            }}
          >
            Pull
          </Button>
        </TitledCard>
      </Show>
    </>
  );
};

export { SyncView };
