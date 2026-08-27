import { entryPublications, publishingChannels } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapPublishingChannel, type PublishingChannel } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { canReadRestrictedCollections, type SessionData } from "#backend/lib/policy";

interface PublishingChannelListItem extends PublishingChannel {
  assignmentCount?: number;
}

const listChannels = async (input: {
  auth: SessionData;
  workspaceID: string;
  includeAssignmentCount?: boolean;
}): Promise<PublishingChannelListItem[]> => {
  const workspaceID = toUUID(input.workspaceID);
  const includeAssignmentCount =
    input.includeAssignmentCount && canReadRestrictedCollections(input.auth);

  if (includeAssignmentCount) {
    const channels = await db
      .select({
        assignmentCount: count(entryPublications.entryID),
        channel: publishingChannels
      })
      .from(publishingChannels)
      .leftJoin(
        entryPublications,
        and(
          eq(entryPublications.channelID, publishingChannels.id),
          eq(entryPublications.workspaceID, workspaceID)
        )
      )
      .where(eq(publishingChannels.workspaceID, workspaceID))
      .groupBy(publishingChannels.id)
      .orderBy(desc(publishingChannels.builtIn), asc(publishingChannels.name));

    return channels.map(({ assignmentCount, channel }) => ({
      ...mapPublishingChannel(channel),
      assignmentCount: Number(assignmentCount)
    }));
  }

  const channels = await db
    .select()
    .from(publishingChannels)
    .where(eq(publishingChannels.workspaceID, workspaceID))
    .orderBy(desc(publishingChannels.builtIn), asc(publishingChannels.name));

  return channels.map(mapPublishingChannel);
};

export { listChannels };
export type { PublishingChannelListItem };
