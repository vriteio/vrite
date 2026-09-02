import type { Job } from "bullmq";

interface BackgroundJobData {
  [key: string]: unknown;
}

type BackgroundJob = Job<BackgroundJobData, void, string>;
type JobHandler = (job: BackgroundJob) => Promise<void>;

const processJob = async (
  job: BackgroundJob,
  jobHandlers: Map<string, JobHandler>
): Promise<void> => {
  const handler = jobHandlers.get(job.name);

  if (!handler) {
    throw new Error(`Unsupported background job: ${job.name}`);
  }

  await handler(job);
};

export { processJob };
export type { BackgroundJob, JobHandler };
