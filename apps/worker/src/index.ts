import {
  SEARCH_INDEXING_DEFAULT_JOB_OPTIONS,
  SEARCH_INDEXING_QUEUE_NAME
} from "@andesine/backend/lib/queue/constants";
import {
  SCHEMA_MIGRATION_JOB_NAME,
  type SchemaMigrationJobData
} from "@andesine/backend/lib/queue/schema-migration-jobs";
import {
  createSearchCollectionDefinitions,
  ensureSearchCollections,
  TypesenseClient
} from "@andesine/backend/lib/search";
import { Queue, Worker, createNodeRedisClient } from "bullmq";
import { createClient } from "redis";
import { config } from "./config";
import { processJob } from "./jobs";
import { pool } from "./database";
import { createCurrentSearchJobHandlers } from "./search/current";
import { createPublishedSearchJobHandlers } from "./search/published";
import {
  createSchemaMigrationJobHandlers,
  recoverAbandonedSchemaMigrations,
  reconcileFailedSchemaMigrationJob
} from "./schema-migrations";

const SCHEMA_MIGRATION_RECOVERY_INTERVAL_MS = 60 * 1000;
const queueRedisClient = createClient({ url: config.QUEUE_REDIS_URL });
const queueRedisConnection = createNodeRedisClient(queueRedisClient);
const eventsRedisClient = createClient({ url: config.REDIS_URL });
const typesenseClient = new TypesenseClient({
  url: config.TYPESENSE_URL,
  apiKey: config.TYPESENSE_API_KEY
});
const searchIndexingQueue = new Queue(SEARCH_INDEXING_QUEUE_NAME, {
  connection: queueRedisConnection,
  defaultJobOptions: SEARCH_INDEXING_DEFAULT_JOB_OPTIONS,
  skipWaitingForReady: true
});
const jobDependencies = {
  queue: searchIndexingQueue,
  typesense: typesenseClient
};
const schemaMigrationDependencies = {
  queue: searchIndexingQueue,
  publish: (channel: string, message: string) => eventsRedisClient.publish(channel, message)
};
const jobHandlers = new Map([
  ...createCurrentSearchJobHandlers(jobDependencies),
  ...createPublishedSearchJobHandlers(jobDependencies),
  ...createSchemaMigrationJobHandlers(schemaMigrationDependencies)
]);
const worker = new Worker(SEARCH_INDEXING_QUEUE_NAME, (job) => processJob(job, jobHandlers), {
  autorun: false,
  connection: queueRedisConnection,
  concurrency: config.WORKER_CONCURRENCY
});
const schemaMigrationRecovery = { running: false };
const recoverSchemaMigrations = async (): Promise<void> => {
  if (schemaMigrationRecovery.running) return;

  schemaMigrationRecovery.running = true;

  try {
    await recoverAbandonedSchemaMigrations(searchIndexingQueue);
  } catch (error) {
    console.error("Failed to check for abandoned schema migrations", { error });
  } finally {
    schemaMigrationRecovery.running = false;
  }
};

queueRedisClient.on("error", (error) => {
  console.error("Worker Redis client error", { error });
});
eventsRedisClient.on("error", (error) => {
  console.error("Worker event Redis client error", { error });
});
worker.on("error", (error) => {
  console.error("Background worker error", { error });
});
worker.on("failed", (job, error) => {
  console.error("Background job failed", {
    error,
    jobId: job?.id,
    jobName: job?.name
  });

  if (job?.name !== SCHEMA_MIGRATION_JOB_NAME || !job.finishedOn) return;

  const data = job.data as unknown as SchemaMigrationJobData;

  void reconcileFailedSchemaMigrationJob(
    {
      error,
      migrationID: data.migrationID,
      workspaceID: data.workspaceID
    },
    schemaMigrationDependencies
  ).catch((reconciliationError) => {
    console.error("Failed to reconcile exhausted schema migration job", {
      error: reconciliationError,
      migrationID: data.migrationID
    });
  });
});

await Promise.all([
  worker.waitUntilReady(),
  eventsRedisClient.connect(),
  ensureSearchCollections(
    typesenseClient,
    createSearchCollectionDefinitions({
      dimensions: config.SEARCH_EMBEDDING_DIMENSIONS
    })
  )
]);
void worker.run().catch((error) => {
  worker.emit("error", error);
});
const schemaMigrationRecoveryInterval = setInterval(() => {
  void recoverSchemaMigrations();
}, SCHEMA_MIGRATION_RECOVERY_INTERVAL_MS);

schemaMigrationRecoveryInterval.unref();
void recoverSchemaMigrations();

console.log("Background worker is ready");

let shutdownPromise: Promise<void> | undefined;
const shutdown = (): Promise<void> => {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    let exitCode = 0;

    clearInterval(schemaMigrationRecoveryInterval);

    try {
      await worker.close();
    } catch (error) {
      exitCode = 1;
      console.error("Failed to close the background worker", error);
    }

    try {
      await searchIndexingQueue.close();
    } catch (error) {
      exitCode = 1;
      console.error("Failed to close the search indexing queue", error);
    }

    if (queueRedisClient.isOpen) {
      try {
        await queueRedisConnection.quit();
      } catch (error) {
        exitCode = 1;
        console.error("Failed to close the worker Redis connection", error);
      }
    }

    if (eventsRedisClient.isOpen) {
      try {
        await eventsRedisClient.close();
      } catch (error) {
        exitCode = 1;
        console.error("Failed to close the worker event Redis connection", error);
      }
    }

    try {
      await pool.end();
    } catch (error) {
      exitCode = 1;
      console.error("Failed to close the worker database pool", error);
    }

    process.exit(exitCode);
  })();

  return shutdownPromise;
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
