import type { JobsOptions } from "bullmq";

interface CurrentEntrySyncJobData {
  entryID: string;
  workspaceID: string;
}

interface CurrentCollectionSyncJobData {
  collectionID: string;
  workspaceID: string;
}

interface CurrentWorkspacePurgeJobData {
  workspaceID: string;
}

interface PublishedEntrySyncJobData {
  entryID: string;
  workspaceID: string;
}

interface PublishedCollectionSyncJobData {
  collectionID: string;
  workspaceID: string;
}

interface PublishedChannelPurgeJobData {
  channelID: string;
  workspaceID: string;
}

interface PublishedWorkspacePurgeJobData {
  workspaceID: string;
}

interface SearchIndexingJob<TData extends object> {
  name: string;
  data: TData;
  opts: JobsOptions;
}

interface CurrentEntrySyncInput {
  entryIDs: string[];
  workspaceID: string;
}

interface PublishedEntrySyncInput {
  entryIDs: string[];
  workspaceID: string;
}

const CURRENT_ENTRY_SYNC_JOB_NAME = "current-entry-sync";
const CURRENT_COLLECTION_SYNC_JOB_NAME = "current-collection-sync";
const CURRENT_WORKSPACE_PURGE_JOB_NAME = "current-workspace-purge";
const PUBLISHED_ENTRY_SYNC_JOB_NAME = "published-entry-sync";
const PUBLISHED_COLLECTION_SYNC_JOB_NAME = "published-collection-sync";
const PUBLISHED_CHANNEL_PURGE_JOB_NAME = "published-channel-purge";
const PUBLISHED_WORKSPACE_PURGE_JOB_NAME = "published-workspace-purge";
const getDeduplicationOptions = (id: string): JobsOptions => ({
  deduplication: {
    id,
    keepLastIfActive: true
  }
});
const createCurrentEntrySyncJobs = (
  input: CurrentEntrySyncInput
): Array<SearchIndexingJob<CurrentEntrySyncJobData>> => {
  return [...new Set(input.entryIDs)].map((entryID) => ({
    name: CURRENT_ENTRY_SYNC_JOB_NAME,
    data: { entryID, workspaceID: input.workspaceID },
    opts: getDeduplicationOptions(`current-entry-${input.workspaceID}-${entryID}`)
  }));
};
const createCurrentCollectionSyncJob = (
  data: CurrentCollectionSyncJobData
): SearchIndexingJob<CurrentCollectionSyncJobData> => ({
  name: CURRENT_COLLECTION_SYNC_JOB_NAME,
  data,
  opts: getDeduplicationOptions(`current-collection-${data.workspaceID}-${data.collectionID}`)
});
const createCurrentWorkspacePurgeJob = (
  data: CurrentWorkspacePurgeJobData
): SearchIndexingJob<CurrentWorkspacePurgeJobData> => ({
  name: CURRENT_WORKSPACE_PURGE_JOB_NAME,
  data,
  opts: getDeduplicationOptions(`current-workspace-purge-${data.workspaceID}`)
});
const createPublishedEntrySyncJobs = (
  input: PublishedEntrySyncInput
): Array<SearchIndexingJob<PublishedEntrySyncJobData>> => {
  return [...new Set(input.entryIDs)].map((entryID) => ({
    name: PUBLISHED_ENTRY_SYNC_JOB_NAME,
    data: { entryID, workspaceID: input.workspaceID },
    opts: getDeduplicationOptions(`published-entry-${input.workspaceID}-${entryID}`)
  }));
};
const createPublishedCollectionSyncJob = (
  data: PublishedCollectionSyncJobData
): SearchIndexingJob<PublishedCollectionSyncJobData> => ({
  name: PUBLISHED_COLLECTION_SYNC_JOB_NAME,
  data,
  opts: getDeduplicationOptions(`published-collection-${data.workspaceID}-${data.collectionID}`)
});
const createPublishedChannelPurgeJob = (
  data: PublishedChannelPurgeJobData
): SearchIndexingJob<PublishedChannelPurgeJobData> => ({
  name: PUBLISHED_CHANNEL_PURGE_JOB_NAME,
  data,
  opts: getDeduplicationOptions(`published-channel-purge-${data.workspaceID}-${data.channelID}`)
});
const createPublishedWorkspacePurgeJob = (
  data: PublishedWorkspacePurgeJobData
): SearchIndexingJob<PublishedWorkspacePurgeJobData> => ({
  name: PUBLISHED_WORKSPACE_PURGE_JOB_NAME,
  data,
  opts: getDeduplicationOptions(`published-workspace-purge-${data.workspaceID}`)
});

export {
  CURRENT_COLLECTION_SYNC_JOB_NAME,
  CURRENT_ENTRY_SYNC_JOB_NAME,
  CURRENT_WORKSPACE_PURGE_JOB_NAME,
  PUBLISHED_CHANNEL_PURGE_JOB_NAME,
  PUBLISHED_COLLECTION_SYNC_JOB_NAME,
  PUBLISHED_ENTRY_SYNC_JOB_NAME,
  PUBLISHED_WORKSPACE_PURGE_JOB_NAME,
  createCurrentCollectionSyncJob,
  createCurrentEntrySyncJobs,
  createCurrentWorkspacePurgeJob,
  createPublishedChannelPurgeJob,
  createPublishedCollectionSyncJob,
  createPublishedEntrySyncJobs,
  createPublishedWorkspacePurgeJob
};
export type {
  CurrentCollectionSyncJobData,
  CurrentEntrySyncInput,
  CurrentEntrySyncJobData,
  CurrentWorkspacePurgeJobData,
  PublishedChannelPurgeJobData,
  PublishedCollectionSyncJobData,
  PublishedEntrySyncInput,
  PublishedEntrySyncJobData,
  PublishedWorkspacePurgeJobData,
  SearchIndexingJob
};
