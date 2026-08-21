import { publishingChannels } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapPublishingChannel, type PublishingChannel } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { asc, desc, eq } from "drizzle-orm";

const listChannels = async (input: { workspaceID: string }): Promise<PublishingChannel[]> => {
  const channels = await db
    .select()
    .from(publishingChannels)
    .where(eq(publishingChannels.workspaceID, toUUID(input.workspaceID)))
    .orderBy(desc(publishingChannels.builtIn), asc(publishingChannels.name));

  return channels.map(mapPublishingChannel);
};

export { listChannels };
