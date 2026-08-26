import { getContentBlocks, type ContentBlocks, type ContentNode } from "#backend/lib/content";
import type { VersionSummary } from "#backend/lib/data";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { getPublishedEntryVersion } from "./get-version";

interface PublishedEntryContent {
  channel: string;
  content: ContentNode;
  fragments: ContentBlocks["fragments"];
  name: string;
  properties: ContentBlocks["properties"];
  version: VersionSummary;
}

const getPublishedEntryContent = async (input: {
  workspaceID: string;
  entryID: string;
  channel: string;
}): Promise<PublishedEntryContent> => {
  const channel = normalizePublishingChannelCode(input.channel);
  const { document, ...version } = await getPublishedEntryVersion({ ...input, channel });
  const { fragments, properties } = getContentBlocks(document);

  return {
    channel,
    content: document,
    fragments,
    name: version.entryName,
    properties,
    version
  };
};

export { getPublishedEntryContent };
export type { PublishedEntryContent };
