import { getContentBlocks, type ContentBlocks, type ContentNode } from "#backend/lib/content";
import type { VersionSummary } from "#backend/lib/data";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { withPublicWorkspace } from "#backend/lib/policy";
import { getPublicPublishedEntryVersion } from "./get-version";

interface PublishedEntryContent {
  channel: string;
  content: ContentNode;
  fragments: ContentBlocks["fragments"];
  name: string;
  properties: ContentBlocks["properties"];
  version: VersionSummary;
}

interface PublishedEntryContentInput {
  entryID: string;
  channel: string;
}

const getPublishedEntryContent = withPublicWorkspace<
  PublishedEntryContentInput,
  PublishedEntryContent
>({}, async ({ input, workspaceID }) => {
  const channel = normalizePublishingChannelCode(input.channel);
  const { document, ...version } = await getPublicPublishedEntryVersion({
    ...input,
    channel,
    workspaceID
  });
  const { fragments, properties } = getContentBlocks(document);

  return {
    channel,
    content: document,
    fragments,
    name: version.entryName,
    properties,
    version
  };
});

export { getPublishedEntryContent };
export type { PublishedEntryContent };
