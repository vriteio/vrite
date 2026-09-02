import { searchIndexingQueue } from "./client";
import {
  createCurrentCollectionSyncJob,
  createCurrentEntrySyncJobs,
  createCurrentWorkspacePurgeJob,
  createPublishedChannelPurgeJob,
  createPublishedCollectionSyncJob,
  createPublishedEntrySyncJobs,
  createPublishedWorkspacePurgeJob,
  type CurrentCollectionSyncJobData,
  type CurrentEntrySyncInput,
  type CurrentWorkspacePurgeJobData,
  type PublishedChannelPurgeJobData,
  type PublishedCollectionSyncJobData,
  type PublishedEntrySyncInput,
  type PublishedWorkspacePurgeJobData,
  type SearchIndexingJob
} from "./search-indexing-jobs";

const SEARCH_INDEXING_SUBMISSION_ATTEMPTS = 3;
const SEARCH_INDEXING_SUBMISSION_RETRY_DELAY_MS = 250;
const wait = (duration: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, duration));
};
const submitSearchIndexingJobs = async (jobs: Array<SearchIndexingJob<object>>): Promise<void> => {
  const jobNames = [...new Set(jobs.map(({ name }) => name))];

  if (jobs.length === 0) return;

  for (let attempt = 1; attempt <= SEARCH_INDEXING_SUBMISSION_ATTEMPTS; attempt += 1) {
    try {
      await searchIndexingQueue.addBulk(jobs);
      return;
    } catch (error) {
      if (attempt === SEARCH_INDEXING_SUBMISSION_ATTEMPTS) {
        console.error("Failed to submit search indexing jobs", {
          error,
          attempts: attempt,
          jobCount: jobs.length,
          jobNames
        });
        return;
      }

      await wait(SEARCH_INDEXING_SUBMISSION_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  }
};
const enqueueCurrentEntrySync = async (input: CurrentEntrySyncInput): Promise<void> => {
  const jobs = createCurrentEntrySyncJobs(input);

  await submitSearchIndexingJobs(jobs);
};
const enqueueCurrentCollectionSync = async (data: CurrentCollectionSyncJobData): Promise<void> => {
  const job = createCurrentCollectionSyncJob(data);

  await submitSearchIndexingJobs([job]);
};
const enqueueCurrentWorkspacePurge = async (data: CurrentWorkspacePurgeJobData): Promise<void> => {
  const job = createCurrentWorkspacePurgeJob(data);

  await submitSearchIndexingJobs([job]);
};
const enqueuePublishedEntrySync = async (input: PublishedEntrySyncInput): Promise<void> => {
  const jobs = createPublishedEntrySyncJobs(input);

  await submitSearchIndexingJobs(jobs);
};
const enqueuePublishedCollectionSync = async (
  data: PublishedCollectionSyncJobData
): Promise<void> => {
  const job = createPublishedCollectionSyncJob(data);

  await submitSearchIndexingJobs([job]);
};
const enqueuePublishedChannelPurge = async (data: PublishedChannelPurgeJobData): Promise<void> => {
  const job = createPublishedChannelPurgeJob(data);

  await submitSearchIndexingJobs([job]);
};
const enqueuePublishedWorkspacePurge = async (
  data: PublishedWorkspacePurgeJobData
): Promise<void> => {
  const job = createPublishedWorkspacePurgeJob(data);

  await submitSearchIndexingJobs([job]);
};

export {
  enqueueCurrentCollectionSync,
  enqueueCurrentEntrySync,
  enqueueCurrentWorkspacePurge,
  enqueuePublishedChannelPurge,
  enqueuePublishedCollectionSync,
  enqueuePublishedEntrySync,
  enqueuePublishedWorkspacePurge
};
