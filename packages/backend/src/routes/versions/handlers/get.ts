import { z } from "zod";
import { ObjectId } from "mongodb";
import { version, versionMember, getVersionsCollection } from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { fetchEntryMembers } from "#lib/utils";

const inputSchema = z.object({
  id: zodId().describe("ID of the version")
});
const outputSchema = version.omit({ members: true }).extend({
  members: z.array(versionMember)
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const versionsCollection = getVersionsCollection(ctx.db);
  const version = await versionsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!version) throw errors.notFound("version");

  const members = await fetchEntryMembers(ctx.db, version);

  return {
    id: `${version._id}`,
    contentPieceId: `${version.contentPieceId}`,
    date: version.date.toISOString(),
    members,
    label: version.label,
    ...(version.variantId && { variantId: `${version.variantId}` })
  };
};

export { inputSchema, outputSchema, handler };
