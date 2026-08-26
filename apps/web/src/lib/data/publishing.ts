import { query } from "@solidjs/router";
import { client } from "#web/lib/api";

interface PublishingPublicationsQueryInput {
  entryID: string;
}
interface PublishingStatusQueryInput {
  channel: string;
}
interface PublishingStatusResponse {
  error?: true;
  result?: PublishingStatus;
}

type PublishingPublication = Awaited<
  ReturnType<typeof client.publishing.listEntryPublications>
>[number];
type PublishingChannel = Awaited<ReturnType<typeof client.publishing.listChannels>>[number];
type PublishingStatus = Awaited<ReturnType<typeof client.sync.getPublishingStatus>>;

const publishingPublicationsQuery = query(
  (input: PublishingPublicationsQueryInput) => client.publishing.listEntryPublications(input),
  "publishing-publications"
);
const publishingChannelsQuery = query(
  () => client.publishing.listChannels({}),
  "publishing-channels"
);
const publishingChannelsWithUsageQuery = query(
  () => client.publishing.listChannels({ includeAssignmentCount: true }),
  "publishing-channels-with-usage"
);
const publishingStatusQuery = query(
  async (input: PublishingStatusQueryInput): Promise<PublishingStatusResponse> => {
    try {
      return { result: await client.sync.getPublishingStatus(input) };
    } catch (error) {
      console.error(error);
      return { error: true };
    }
  },
  "publishing-status"
);

export {
  publishingChannelsQuery,
  publishingChannelsWithUsageQuery,
  publishingPublicationsQuery,
  publishingStatusQuery
};
export type {
  PublishingPublication,
  PublishingPublicationsQueryInput,
  PublishingChannel,
  PublishingStatus,
  PublishingStatusQueryInput,
  PublishingStatusResponse
};
