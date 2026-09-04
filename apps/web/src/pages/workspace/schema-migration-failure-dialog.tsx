import { Dialog, IconButton } from "@andesine/components";
import { createEffect, createSignal, on, Show } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";

const SchemaMigrationFailureDialog = () => {
  const { content } = useWorkspace();
  const [error, setError] = createSignal<string | null>(null);
  const migration = () => {
    return [...content.schemaMigrations().values()].find(({ status }) => status === "failed");
  };
  const close = () => {
    const currentMigration = migration();

    if (currentMigration) content.dismissSchemaMigration(currentMigration.id);
  };

  createEffect(
    on(
      () => migration()?.id,
      (migrationID) => {
        setError(null);
        if (!migrationID) return;

        void client.schemaMigrations
          .get({ id: migrationID })
          .then((details) => {
            if (migration()?.id === migrationID) setError(details.error);
          })
          .catch((requestError) => {
            console.error("Failed to load schema migration error", requestError);
          });
      }
    )
  );

  return (
    <Dialog
      opened={Boolean(migration())}
      portal
      aria-label="Schema migration failed"
      onOverlayClick={close}
    >
      <Show when={migration()} keyed>
        {(failedMigration) => (
          <>
            <div class="flex items-start gap-2">
              <div class="i-lucide:triangle-alert mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div class="flex min-w-0 flex-col gap-0.5">
                <h3 class="text-lg font-semibold leading-tight">Schema migration failed</h3>
                <p class="text-sm leading-tight text-gray-400">
                  {error() ||
                    "The schema could not be applied. The app tried to restore converted entries."}
                </p>
                <p class="mt-1 text-xs text-gray-400">
                  {failedMigration.processedEntries} of {failedMigration.totalEntries} entries were
                  processed before the migration stopped.
                </p>
              </div>
            </div>
            <div class="flex justify-end">
              <IconButton
                color="contrast"
                icon="i-lucide:x"
                size="small"
                text="soft"
                variant="outlined"
                onClick={close}
              >
                Close
              </IconButton>
            </div>
          </>
        )}
      </Show>
    </Dialog>
  );
};

export { SchemaMigrationFailureDialog };
