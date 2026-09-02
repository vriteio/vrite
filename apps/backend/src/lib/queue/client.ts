import { config } from "#backend/lib/config";
import { Queue, createNodeRedisClient } from "bullmq";
import { createClient } from "redis";
import { SEARCH_INDEXING_DEFAULT_JOB_OPTIONS, SEARCH_INDEXING_QUEUE_NAME } from "./constants";

const queueRedisClient = createClient({ url: config.QUEUE_REDIS_URL });
const queueRedisConnection = createNodeRedisClient(queueRedisClient);
const searchIndexingQueue = new Queue(SEARCH_INDEXING_QUEUE_NAME, {
  connection: queueRedisConnection,
  defaultJobOptions: SEARCH_INDEXING_DEFAULT_JOB_OPTIONS,
  skipWaitingForReady: true
});
const closeQueues = async (): Promise<void> => {
  await searchIndexingQueue.close();

  if (queueRedisClient.isOpen) {
    await queueRedisConnection.quit();
  }
};

queueRedisClient.on("error", (error) => {
  console.error("Background job Redis client error", { error });
});
searchIndexingQueue.on("error", (error) => {
  console.error("Search indexing queue error", { error });
});

export { closeQueues, searchIndexingQueue };
