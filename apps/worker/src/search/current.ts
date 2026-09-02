import {
  CURRENT_COLLECTION_SYNC_JOB_NAME,
  CURRENT_ENTRY_SYNC_JOB_NAME,
  CURRENT_WORKSPACE_PURGE_JOB_NAME,
  createCurrentEntrySyncJobs,
  type CurrentCollectionSyncJobData,
  type CurrentEntrySyncJobData,
  type CurrentWorkspacePurgeJobData
} from "@andesine/backend/lib/queue/search-indexing-jobs";
import {
  buildCurrentSearchDocuments,
  CURRENT_SEARCH_COLLECTION_ALIAS,
  type TypesenseClient
} from "@andesine/backend/lib/search";
import type { Queue } from "bullmq";
import { createEmbeddings } from "./openai-compatible";
import { loadCurrentCollectionEntryIDs, loadCurrentEntrySource } from "./current-data";
import type { JobHandler } from "../jobs";

interface CurrentSearchJobDependencies {
  queue: Queue;
  typesense: TypesenseClient;
}

const getEntryFilter = (data: CurrentEntrySyncJobData): string => {
  return `workspaceID:=${data.workspaceID} && entryID:=${data.entryID}`;
};
const getWorkspaceFilter = (data: CurrentWorkspacePurgeJobData): string => {
  return `workspaceID:=${data.workspaceID}`;
};
const createCurrentSearchJobHandlers = (
  dependencies: CurrentSearchJobDependencies
): Map<string, JobHandler> => {
  const handlers = new Map<string, JobHandler>();

  handlers.set(CURRENT_ENTRY_SYNC_JOB_NAME, async (job) => {
    const data = job.data as unknown as CurrentEntrySyncJobData;
    const source = await loadCurrentEntrySource(data);

    if (!source) {
      await dependencies.typesense.deleteDocuments(
        CURRENT_SEARCH_COLLECTION_ALIAS,
        getEntryFilter(data)
      );
      return;
    }

    const builtDocuments = buildCurrentSearchDocuments(source);
    const embeddings = await createEmbeddings(
      builtDocuments.map(({ embeddingText }) => embeddingText)
    );
    const documents = builtDocuments.map(({ document }, index) => ({
      ...document,
      embedding: embeddings[index]
    }));

    await dependencies.typesense.deleteDocuments(
      CURRENT_SEARCH_COLLECTION_ALIAS,
      getEntryFilter(data)
    );
    await dependencies.typesense.importDocuments(CURRENT_SEARCH_COLLECTION_ALIAS, documents);
  });
  handlers.set(CURRENT_COLLECTION_SYNC_JOB_NAME, async (job) => {
    const data = job.data as unknown as CurrentCollectionSyncJobData;
    const entryIDs = await loadCurrentCollectionEntryIDs(data);
    const jobs = createCurrentEntrySyncJobs({ workspaceID: data.workspaceID, entryIDs });

    if (jobs.length > 0) await dependencies.queue.addBulk(jobs);
  });
  handlers.set(CURRENT_WORKSPACE_PURGE_JOB_NAME, async (job) => {
    const data = job.data as unknown as CurrentWorkspacePurgeJobData;

    await dependencies.typesense.deleteDocuments(
      CURRENT_SEARCH_COLLECTION_ALIAS,
      getWorkspaceFilter(data)
    );
  });

  return handlers;
};

export { createCurrentSearchJobHandlers };
