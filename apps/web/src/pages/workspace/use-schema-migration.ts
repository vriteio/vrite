import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import {
  ACTIVE_SCHEMA_MIGRATION_STATUSES,
  isSchemaMigrationActive,
  type SchemaMigrationProgress
} from "#web/lib/data";

interface SchemaMigrationStart {
  migrationID: string;
  totalEntries: number;
}
interface UseSchemaMigrationOptions {
  collectionID?(): string | null | undefined;
  onCompleted?(): void;
}

const useSchemaMigration = (options: UseSchemaMigrationOptions = {}) => {
  const workspace = useWorkspace();
  const [migration, setMigration] = createSignal<SchemaMigrationProgress | null>(null);
  const completedMigrationIDs = new Set<string>();
  const complete = (migrationID: string) => {
    if (completedMigrationIDs.has(migrationID)) return;

    completedMigrationIDs.add(migrationID);
    options.onCompleted?.();
  };
  const setDetails = (details: Awaited<ReturnType<typeof client.schemaMigrations.get>>) => {
    setMigration({
      collectionIDs: migration()?.collectionIDs || [],
      id: details.id,
      processedEntries: details.processedEntries,
      status: details.status,
      totalEntries: details.totalEntries
    });
  };
  const refresh = async (migrationID: string) => {
    try {
      const details = await client.schemaMigrations.get({ id: migrationID });

      if (migration()?.id !== migrationID) return;

      setDetails(details);

      if (details.status === "completed") complete(details.id);
    } catch (error) {
      console.error("Failed to refresh schema migration", error);
    }
  };
  const start = (input: SchemaMigrationStart) => {
    setMigration({
      collectionIDs: [],
      id: input.migrationID,
      processedEntries: 0,
      status: "queued",
      totalEntries: input.totalEntries
    });
    void refresh(input.migrationID);
  };
  const resume = async (collectionID: string) => {
    try {
      const details = await client.schemaMigrations.getActive({ collectionID });

      if (options.collectionID?.() !== collectionID || !details) return;

      setDetails(details);
    } catch (error) {
      console.error("Failed to resume schema migration", error);
    }
  };

  onMount(() => {
    const unsubscribe = workspace.subscribeToUpdates((event) => {
      const currentMigration = migration();

      if (event.action !== "schema-migration:update" || event.data.id !== currentMigration?.id) {
        return;
      }

      if (!ACTIVE_SCHEMA_MIGRATION_STATUSES.includes(currentMigration.status)) return;

      setMigration({
        ...currentMigration,
        processedEntries: event.data.processedEntries,
        status: event.data.status,
        totalEntries: event.data.totalEntries
      });

      if (!ACTIVE_SCHEMA_MIGRATION_STATUSES.includes(event.data.status)) {
        void refresh(event.data.id);
      }
    });

    onCleanup(unsubscribe);
  });
  createEffect(() => {
    const currentMigration = migration();

    if (!currentMigration || !isSchemaMigrationActive(currentMigration)) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh(currentMigration.id);
    }, 3_000);

    onCleanup(() => window.clearInterval(interval));
  });
  createEffect(
    on(
      () => [options.collectionID?.(), workspace.content.offline()] as const,
      ([collectionID, offline]) => {
        if (!collectionID || offline) return;

        void resume(collectionID);
      }
    )
  );

  return { start };
};

export { useSchemaMigration };
export type { SchemaMigrationStart, UseSchemaMigrationOptions };
