import { ObjectId } from "mongodb";
import { z } from "zod";
import { version, getVersionsCollection } from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { publishVersionEvent } from "#events";
import { fetchEntryMembers } from "#lib/utils";

const inputSchema = version
  .pick({
    id: true,
    label: true
  })
  .partial()
  .required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const versionsCollection = getVersionsCollection(ctx.db);
  const version = await versionsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!version) throw errors.notFound("version");

  await versionsCollection.updateOne(
    { _id: version._id },
    { ...(input.label ? { $set: { label: input.label } } : { $unset: { label: true } }) }
  );
  publishVersionEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    userId: `${ctx.auth.userId}`,
    data: {
      ...version,
      id: `${version._id}`,
      workspaceId: `${version.workspaceId}`,
      contentPieceId: `${version.contentPieceId}`,
      variantId: `${version.variantId}`,
      date: version.date?.toISOString(),
      label: input.label,
      members: await fetchEntryMembers(ctx.db, version),
      expiresAt: version.expiresAt?.toISOString()
    }
  });
};

export { handler, inputSchema };
