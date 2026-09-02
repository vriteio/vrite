import type { DefaultJobOptions } from "bullmq";

const SEARCH_INDEXING_QUEUE_NAME = "search-indexing";
const SEARCH_INDEXING_DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1000
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 1000
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: 5000
  }
} satisfies DefaultJobOptions;

export { SEARCH_INDEXING_DEFAULT_JOB_OPTIONS, SEARCH_INDEXING_QUEUE_NAME };
