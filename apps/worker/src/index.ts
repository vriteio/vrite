import {
  SEARCH_INDEXING_DEFAULT_JOB_OPTIONS,
  SEARCH_INDEXING_QUEUE_NAME
} from "@andesine/backend/lib/queue/constants";
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

const queueRedisClient = createClient({ url: config.QUEUE_REDIS_URL });
const queueRedisConnection = createNodeRedisClient(queueRedisClient);
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
const jobHandlers = new Map([
  ...createCurrentSearchJobHandlers(jobDependencies),
  ...createPublishedSearchJobHandlers(jobDependencies)
]);
const worker = new Worker(SEARCH_INDEXING_QUEUE_NAME, (job) => processJob(job, jobHandlers), {
  autorun: false,
  connection: queueRedisConnection,
  concurrency: config.WORKER_CONCURRENCY
});

queueRedisClient.on("error", (error) => {
  console.error("Worker Redis client error", { error });
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
});

await Promise.all([
  worker.waitUntilReady(),
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

console.log("Background worker is ready");

let shutdownPromise: Promise<void> | undefined;
const shutdown = (): Promise<void> => {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    let exitCode = 0;

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
