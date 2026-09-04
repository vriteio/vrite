import { Spinner } from "@andesine/components";
import { type Component, Match, Show, Switch } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { getSchemaMigrationProgress, type SchemaMigrationProgress } from "#web/lib/data";

interface ExplorerSchemaMigrationProps {
  collectionID: string;
}
interface ExplorerSchemaMigrationIndicatorProps {
  migration: SchemaMigrationProgress;
}

const getMigrationLabel = (migration: SchemaMigrationProgress): string => {
  if (migration.status === "completed") return "Schema applied";
  if (migration.status === "failed") return "Schema migration failed";
  if (migration.status === "rolling_back") return "Rolling back changes";
  if (migration.status === "queued") return "Migration queued";

  return "Applying schema";
};
const ExplorerSchemaMigrationIndicator: Component<ExplorerSchemaMigrationIndicatorProps> = (
  props
) => {
  return (
    <div class="flex h-7 items-center justify-end gap-1.5 pl-1 pr-1.5 text-[0.625rem] font-medium text-gray-400">
      <Switch>
        <Match when={props.migration.status === "completed"}>
          <div class="i-lucide:check h-4 w-4 text-green-500" />
        </Match>
        <Match when={props.migration.status === "failed"}>
          <div class="i-lucide:triangle-alert h-4 w-4 text-red-500" />
        </Match>
        <Match when={true}>
          <span class="font-mono">
            {props.migration.processedEntries}/{props.migration.totalEntries}
          </span>
          <Spinner class="h-4 w-4" color="primary" />
        </Match>
      </Switch>
    </div>
  );
};
const ExplorerSchemaMigrationMenu: Component<ExplorerSchemaMigrationProps> = (props) => {
  const { content } = useWorkspace();
  const migration = () => content.getSchemaMigration(props.collectionID);

  return (
    <Show when={migration()} keyed>
      {(currentMigration) => (
        <div class="flex min-w-48 flex-col gap-2 px-1 py-0.5">
          <div class="flex items-start gap-1.5">
            <div class="flex justify-center items-center h-5 w-5 shrink-0">
              <Switch>
                <Match when={currentMigration.status === "completed"}>
                  <div class="i-lucide:check-circle-2 h-4.5 w-4.5 text-green-500" />
                </Match>
                <Match when={currentMigration.status === "failed"}>
                  <div class="i-lucide:triangle-alert h-4.5 w-4.5 text-red-500" />
                </Match>
                <Match when={true}>
                  <div class="i-tabler:pyramid h-4.5 w-4.5 bg-gradient-to-tr" />
                </Match>
              </Switch>
            </div>
            <div class="min-w-0 flex-1">
              <p class="line-clamp-1 text-sm font-medium text-gray-700">
                {getMigrationLabel(currentMigration)}
              </p>
              <p class="text-xs text-gray-400 leading-none">
                {currentMigration.processedEntries} of {currentMigration.totalEntries} entries
              </p>
            </div>
          </div>
          <Show
            when={currentMigration.status !== "completed" && currentMigration.status !== "failed"}
          >
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full bg-gradient-to-r transition-[width]"
                style={{ width: `${getSchemaMigrationProgress(currentMigration)}%` }}
              />
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
};

export { ExplorerSchemaMigrationIndicator, ExplorerSchemaMigrationMenu };
