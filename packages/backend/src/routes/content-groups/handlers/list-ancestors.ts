import { rearrangeContentGroups } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contentGroup, getContentGroupsCollection } from "#collections";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  contentGroupId: zodId().describe("ID of the content group to list ancestors for")
});
const outputSchema = z.array(contentGroup);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: new ObjectId(input.contentGroupId),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  const { ancestors } = contentGroup;
  const contentGroups = await contentGroupsCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      _id: { $in: ancestors }
    })
    .toArray();

  return rearrangeContentGroups(contentGroups, ancestors);
};

export { inputSchema, outputSchema, handler };
